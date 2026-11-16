/**
 * 離線 / 後端失敗時的 Canvas PDF 備援測試 (e2e_fixture)
 *
 * 守的業務行為：當 /api/export 回傳 500 或無法連線時，點擊「匯出 > PDF (.pdf)」
 * 仍能透過瀏覽器離屏 Canvas 產出多頁繁體中文 PDF，不顯示「匯出失敗」，且檔名正確。
 *
 * 為什麼放在 e2e_fixture：需要 cy.intercept 強制讓 /api/export 回傳 500 來觸發前端備援分支。
 * 對應實作：src/lib/export-utils.ts（buildFallbackChinesePdfBytes）
 */

import type { CampScenario } from '../plugins/firestore';

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

describe('PDF 匯出：API 失敗時的離線 Canvas 多頁備援 (e2e_fixture)', () => {
  let scenario: CampScenario;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.task('downloads:clear');

    cy.setupCampScenario({
      campName: 'E2E 離線備援營隊',
      plans: [
        {
          scheduledName: '活動一',
          activityName: '<p>破冰遊戲</p>',
          groupId: 'activity',
          leadMember: '王小明',
          purpose: '<p>測試離線 Canvas PDF 多頁備援渲染。</p>',
          process: '<p>長篇繁體中文流程段落：確認跨頁與自動換行效果。</p>'.repeat(28),
          props: Array.from({ length: 18 }, (_, i) => ({
            id: `off-prop-${i + 1}`,
            name: `備援道具 ${i + 1}`,
            quantity: String(i + 1),
            unit: '個',
            remarks: '離線備援道具表測試',
          })),
          order: 0,
        },
      ],
    }).then((s) => {
      scenario = s;
    });

    cy.loginAs('admin');
  });

  afterEach(() => {
    cy.visit('/plans');
    cy.location('pathname').should('eq', '/plans');
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('當 /api/export 回傳 500 時，應走 Canvas 多頁備援並下載有效中文檔名 PDF', () => {
    cy.intercept('POST', '/api/export', {
      statusCode: 500,
      body: { error: 'Simulated API outage' },
    }).as('exportApiFail');

    cy.visitApp(`/plans/${scenario.planIds[0]}`, { campId: scenario.campId });
    cy.getByTestId('editor-export-trigger', { timeout: 20000 }).should('be.visible').click();
    cy.getByTestId('editor-export-pdf').click();

    cy.wait('@exportApiFail');

    cy.toastText().should((text) => {
      expect(text).to.include('匯出成功');
      expect(text).to.not.include('匯出失敗');
    });

    cy.task<{ fileName: string; size: number; base64: string }>('downloads:waitForFile', {
      pattern: '^活動一_破冰遊戲\\.pdf$',
    }).then((downloaded) => {
      expect(downloaded.fileName).to.eq('活動一_破冰遊戲.pdf');
      const latin1 = uint8ToLatin1(base64ToUint8(downloaded.base64));
      expect(latin1.slice(0, 5)).to.eq('%PDF-');
      expect(latin1).to.include('/Filter /DCTDecode');

      const pages = latin1.match(/\/Type\s*\/Page\b/g) || [];
      expect(pages.length, '離線 Canvas 備援長篇教案應產出多頁 PDF').to.be.gte(2);
    });
  });
});
