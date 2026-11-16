/**
 * 純 API 合約測試：/api/export（PDF / DOCX / ZIP 與 RFC 6266 雙軌檔名標頭）
 *
 * 守的業務行為：
 *   1. /api/export 產出真實可讀的多頁繁體中文 PDF（嵌入 NotoSansTC，無 ??? 問號與單頁截斷）
 *   2. Content-Disposition 採 RFC 6266 雙軌標頭，且過濾活動名稱內的 <p> 等 HTML 標籤（無 _p_ 雜訊）
 *   3. Word (.docx) 與批次 ZIP 匯出皆為正確格式與中文檔名
 *
 * 對應實作：src/app/api/export/route.ts、src/lib/pdf-generator.ts、src/lib/export-filename.ts
 */

import JSZip from 'jszip';

const decodeBinaryToUint8 = (body: ArrayBuffer | string): Uint8Array => {
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  const out = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i++) {
    out[i] = body.charCodeAt(i) & 0xff;
  }
  return out;
};

const uint8ToLatin1 = (bytes: Uint8Array): string => {
  let str = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    str += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return str;
};

const buildSamplePlan = (overrides: Record<string, unknown> = {}) => ({
  id: 'api-export-plan-1',
  campId: 'api-export-camp',
  ownerId: 'api-export-owner',
  category: 'activity',
  scheduledName: '活動一',
  activityName: '<p><b>破冰遊戲</b></p>',
  members: '',
  leadMember: '王小明',
  assistantMember: '陳小華',
  time: '<p>45 分鐘</p>',
  location: '<div>大禮堂 3F</div>',
  purpose: '<p>協助學員快速熟悉彼此，建立小隊默契。</p>',
  process:
    '<ol><li>集合說明規則</li><li>姓名接龍暖身</li></ol>' +
    '<p>破冰遊戲詳細流程與注意事項：各小隊圍成圓圈進行互動，確保場地安全並適時引導學員交流。</p>'.repeat(
      20,
    ),
  content: '<ul><li>第一階段：自我介紹</li><li>第二階段：團隊挑戰</li></ul>',
  divisionOfLabor: '<p>主持：王小明 / 計時：陳小華</p>',
  props: Array.from({ length: 24 }, (_, idx) => ({
    id: `prop-${idx + 1}`,
    name: `道具項目 ${idx + 1}：彩色氣球`,
    quantity: String(idx + 2),
    unit: '個',
    remarks: `第 ${idx + 1} 組活動備品`,
  })),
  remarks: '<p>雨天改為室內場地</p>',
  openingClosingRemarks: '<p>歡迎來到北科崇德營！</p>',
  googleDocUrl: '',
  order: 0,
  updatedAt: Date.now(),
  ...overrides,
});

describe('API /api/export (pdf / word / zip)', () => {
  it('單份 PDF 應回傳嵌入 NotoSansTC 的多頁 PDF 與 RFC 6266 中文檔名', () => {
    cy.request({
      method: 'POST',
      url: '/api/export',
      body: { plan: buildSamplePlan(), format: 'pdf' },
      encoding: 'binary',
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.headers['content-type']).to.include('application/pdf');

      const cd = String(res.headers['content-disposition'] || '');
      expect(cd).to.match(/filename="lesson-plan\.pdf";\s*filename\*=UTF-8''/i);
      expect(cd).to.include(encodeURIComponent('活動一_破冰遊戲.pdf'));
      expect(cd).to.not.include('_p_');

      const bytes = decodeBinaryToUint8(res.body);
      const latin1 = uint8ToLatin1(bytes);
      expect(latin1.slice(0, 5)).to.eq('%PDF-');
      expect(latin1).to.include('NotoSansTC');
      expect(latin1).to.not.include('??? - ????');

      const pageMatches = latin1.match(/\/Type\s*\/Page\b/g) || [];
      expect(pageMatches.length, '長篇教案應自動分頁為 2 頁以上').to.be.gte(2);
    });
  });

  it('單份 Word 應過濾活動名稱 HTML 標籤，檔名與內文標題皆無 _p_ 或 <p>', () => {
    cy.request({
      method: 'POST',
      url: '/api/export',
      body: { plan: buildSamplePlan(), format: 'word' },
      encoding: 'binary',
    }).then(async (res) => {
      expect(res.status).to.eq(200);
      expect(res.headers['content-type']).to.include(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      const cd = String(res.headers['content-disposition'] || '');
      expect(cd).to.match(/filename="lesson-plan\.docx";\s*filename\*=UTF-8''/i);
      expect(cd).to.include(encodeURIComponent('活動一_破冰遊戲.docx'));
      expect(cd).to.not.include('_p_');

      const zip = await JSZip.loadAsync(decodeBinaryToUint8(res.body));
      const xml = await zip.file('word/document.xml')?.async('string');
      expect(xml).to.be.a('string');
      expect(xml).to.include('活動一 - 破冰遊戲');
      expect(xml).to.not.include('&lt;p&gt;');
    });
  });

  it('批次 PDF ZIP 應產出有效壓縮檔，且同名教案會自動去重不覆寫', () => {
    const planA = buildSamplePlan({ id: 'p-1', scheduledName: '活動一', activityName: '<p>破冰遊戲</p>' });
    const planB = buildSamplePlan({ id: 'p-2', scheduledName: '活動一', activityName: '<p>破冰遊戲</p>' });

    cy.request({
      method: 'POST',
      url: '/api/export',
      body: { plans: [planA, planB], format: 'pdf' },
      encoding: 'binary',
    }).then(async (res) => {
      expect(res.status).to.eq(200);
      expect(res.headers['content-type']).to.include('application/zip');

      const zip = await JSZip.loadAsync(decodeBinaryToUint8(res.body));
      const names = Object.keys(zip.files);
      expect(names).to.include('活動一_破冰遊戲.pdf');
      expect(names).to.include('活動一_破冰遊戲 (2).pdf');

      const entryBytes = await zip.file('活動一_破冰遊戲.pdf')!.async('uint8array');
      expect(uint8ToLatin1(entryBytes.subarray(0, 5))).to.eq('%PDF-');
    });
  });

  it('缺少 plan 或 format 時應回傳 400', () => {
    cy.request({
      method: 'POST',
      url: '/api/export',
      body: {},
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});
