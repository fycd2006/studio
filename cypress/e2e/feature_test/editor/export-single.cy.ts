/**
 * 教案編輯頁匯出（/plans/[id]）：真實瀏覽器點擊匯出 PDF 與 Word
 *
 * 守的業務行為：
 *   1. 在教案編輯頁點擊「匯出 > PDF (.pdf)」應順暢完成下載並顯示「匯出成功」，
 *      不得因異步等待導致手勢授權失效而出現「匯出失敗」。
 *   2. 下載到磁碟的 PDF 檔名須為正常中文（活動一_破冰遊戲.pdf），無 %E6% 編碼與 _p_ 標籤雜訊，
 *      且內含嵌入 NotoSansTC 字型的多頁內容（長篇教案與道具表自動分頁）。
 *   3. 點擊「匯出 > WORD (.docx)」亦須下載中文檔名之有效 DOCX 檔案。
 *
 * 對應實作：src/components/PlanEditor.tsx、src/lib/export-utils.ts、src/app/api/export/route.ts
 */

import JSZip from 'jszip';
import type { CampScenario } from '../../../plugins/firestore';

const base64ToUint8 = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
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

describe('教案編輯器：匯出 PDF 與 Word (admin)', () => {
  let scenario: CampScenario;

  const longProcess =
    '<ol><li>集合破冰與安全宣導</li><li>分組挑戰賽</li></ol>' +
    '<p>活動流程說明：請各小隊隊輔帶領小隊員圍成圓圈進行姓名接龍與默契考驗，注意場地安全與時間控管。</p>'.repeat(
      22,
    );

  const manyProps = Array.from({ length: 24 }, (_, idx) => ({
    id: `p-${idx + 1}`,
    name: `道具項目 ${idx + 1}：彩色氣球`,
    quantity: String(idx + 1),
    unit: '個',
    remarks: `第 ${idx + 1} 組活動備品`,
  }));

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.task('downloads:clear');

    cy.setupCampScenario({
      campName: 'E2E 匯出測試營隊',
      plans: [
        {
          scheduledName: '活動一',
          // 刻意模擬 O2RichEditor 存進資料庫的 HTML 標籤，驗下載檔名不會殘留 _p_
          activityName: '<p><b>破冰遊戲</b></p>',
          groupId: 'activity',
          leadMember: '王小明',
          assistantMember: '陳小華',
          time: '<p>45 分鐘</p>',
          location: '<div>大禮堂 3F</div>',
          purpose: '<p>建立小隊默契與信任感。</p>',
          process: longProcess,
          content: '<ul><li>階段一：破冰介紹</li><li>階段二：團隊合作</li></ul>',
          remarks: '<p>雨天改室內進行</p>',
          openingClosingRemarks: '<p>歡迎來到北科崇德營！</p>',
          props: manyProps,
          order: 0,
        },
      ],
    }).then((s) => {
      scenario = s;
    });

    cy.loginAs('admin');
  });

  afterEach(() => {
    // 編輯器 spec 規則：先離開編輯器頁再清資料，避免卸載 autosave 與 cleanup 競態
    cy.visit('/plans');
    cy.location('pathname').should('eq', '/plans');
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  const openEditor = () => {
    cy.visitApp(`/plans/${scenario.planIds[0]}`, { campId: scenario.campId });
    cy.getByTestId('editor-export-trigger', { timeout: 20000 }).should('be.visible');
  };

  it('點擊「匯出 > PDF (.pdf)」應下載多頁中文 PDF 且不出現匯出失敗提示', () => {
    openEditor();

    cy.getByTestId('editor-export-trigger').click();
    cy.getByTestId('editor-export-pdf').should('be.visible').click();

    cy.toastText().should((text) => {
      expect(text).to.include('匯出成功');
      expect(text).to.not.include('匯出失敗');
    });

    cy.task<{ fileName: string; size: number; base64: string }>('downloads:waitForFile', {
      pattern: '^活動一_破冰遊戲\\.pdf$',
    }).then((downloaded) => {
      expect(downloaded.fileName).to.eq('活動一_破冰遊戲.pdf');
      expect(downloaded.fileName).to.not.include('%E6');
      expect(downloaded.fileName).to.not.include('_p_');

      const bytes = base64ToUint8(downloaded.base64);
      const latin1 = uint8ToLatin1(bytes);
      expect(latin1.slice(0, 5)).to.eq('%PDF-');
      expect(latin1).to.include('NotoSansTC');
      expect(latin1).to.not.include('??? - ????');

      const pages = latin1.match(/\/Type\s*\/Page\b/g) || [];
      expect(pages.length, '長篇教案＋24筆道具表應自動分頁').to.be.gte(2);
    });
  });

  it('點擊「匯出 > WORD (.docx)」應下載正確中文檔名且內文無 HTML 標籤雜訊', () => {
    openEditor();

    cy.getByTestId('editor-export-trigger').click();
    cy.getByTestId('editor-export-word').should('be.visible').click();

    cy.toastText().should((text) => {
      expect(text).to.include('匯出成功');
      expect(text).to.not.include('匯出失敗');
    });

    cy.task<{ fileName: string; size: number; base64: string }>('downloads:waitForFile', {
      pattern: '^活動一_破冰遊戲\\.docx$',
    }).then(async (downloaded) => {
      expect(downloaded.fileName).to.eq('活動一_破冰遊戲.docx');
      expect(downloaded.fileName).to.not.include('%E6');
      expect(downloaded.fileName).to.not.include('_p_');

      const bytes = base64ToUint8(downloaded.base64);
      const zip = await JSZip.loadAsync(bytes);
      const docXml = await zip.file('word/document.xml')?.async('string');
      expect(docXml).to.include('活動一 - 破冰遊戲');
      expect(docXml).to.not.include('&lt;p&gt;');
    });
  });
});
