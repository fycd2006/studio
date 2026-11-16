/**
 * 教案總覽匯出（/plans）：單筆選單下載與批次 ZIP 匯出
 *
 * 守的業務行為：
 *   1. 總覽列操作選單點擊「下載 PDF (.pdf)」與「下載 Word (.docx)」可真實下載中文檔名檔案（無 %E6% 與 _p_）。
 *   2. 點擊「批次匯出 > 所有 PDF (.pdf)」可真實下載 ZIP，且內含多份中文檔名的有效 PDF。
 *
 * 對應實作：src/app/plans/page.tsx、src/lib/export-utils.ts、src/app/api/export/route.ts
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

describe('教案總覽：單筆下載與批次 ZIP 匯出 (admin)', () => {
  let scenario: CampScenario;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.task('downloads:clear');

    cy.setupCampScenario({
      campName: 'E2E 批次匯出營隊',
      plans: [
        {
          scheduledName: '活動一',
          activityName: '<p>破冰遊戲</p>',
          groupId: 'activity',
          leadMember: '小明',
          purpose: '<p>團隊熟悉與暖身</p>',
          order: 0,
        },
        {
          scheduledName: '靜態課程',
          activityName: '<div>生命教育</div>',
          groupId: 'teaching',
          leadMember: '阿美',
          purpose: '<p>生命價值探索</p>',
          order: 1,
        },
      ],
    }).then((s) => {
      scenario = s;
    });

    cy.loginAs('admin');
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('單筆操作選單下載 PDF 與 Word 應產出正常中文檔名', () => {
    cy.visitApp('/plans', { campId: scenario.campId });

    const firstId = scenario.planIds[0];
    cy.getByTestId(`plan-row-${firstId}`, { timeout: 20000 }).should('be.visible');

    // 下載 PDF
    cy.getByTestId(`plan-row-${firstId}`).findByTestId(`plan-actions-${firstId}`).click();
    cy.getByTestId(`plan-action-pdf-${firstId}`).click();

    cy.toastText().should((text) => {
      expect(text).to.include('匯出成功');
      expect(text).to.not.include('匯出失敗');
    });

    cy.task<{ fileName: string; base64: string }>('downloads:waitForFile', {
      pattern: '^活動一_破冰遊戲\\.pdf$',
    }).then((downloaded) => {
      expect(downloaded.fileName).to.eq('活動一_破冰遊戲.pdf');
      const latin1 = uint8ToLatin1(base64ToUint8(downloaded.base64));
      expect(latin1.slice(0, 5)).to.eq('%PDF-');
      expect(latin1).to.include('NotoSansTC');
    });

    // 下載 Word（選單因刻意保留 preventDefault 仍開啟，直接點 Word 項）
    cy.getByTestId(`plan-action-word-${firstId}`).click();

    cy.task<{ fileName: string }>('downloads:waitForFile', {
      pattern: '^活動一_破冰遊戲\\.docx$',
    }).then((downloaded) => {
      expect(downloaded.fileName).to.eq('活動一_破冰遊戲.docx');
    });
  });

  it('批次匯出「所有 PDF (.pdf)」應下載 ZIP 並內含全部中文檔名 PDF', () => {
    cy.visitApp('/plans', { campId: scenario.campId });
    cy.getByTestId('plans-batch-export-trigger', { timeout: 20000 }).should('not.be.disabled').click();
    cy.getByTestId('plans-batch-export-pdf-all').click();

    cy.toastText().should((text) => {
      expect(text).to.include('批次下載完成');
      expect(text).to.not.include('失敗');
    });

    cy.task<{ fileName: string; base64: string }>('downloads:waitForFile', {
      pattern: '^plans_all_pdf_\\d+\\.zip$',
    }).then(async (downloaded) => {
      const zip = await JSZip.loadAsync(base64ToUint8(downloaded.base64));
      const names = Object.keys(zip.files);
      expect(names).to.include('活動一_破冰遊戲.pdf');
      expect(names).to.include('靜態課程_生命教育.pdf');

      const pdfBytes = await zip.file('活動一_破冰遊戲.pdf')!.async('uint8array');
      expect(uint8ToLatin1(pdfBytes.subarray(0, 5))).to.eq('%PDF-');
    });
  });
});
