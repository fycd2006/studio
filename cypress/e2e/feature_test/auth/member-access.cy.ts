describe('個人帳號的即時權限', () => {
  it('成員在設定頁收到升級與停用時，立即更新權限與登入狀態', () => {
    cy.resetDb();
    cy.loginAs('crew');
    cy.visitApp('/settings');
    cy.get('button[aria-label="提交幹部通行碼"]').should('be.visible');
    cy.task('db:patchDoc', { collection: 'users', id: 'e2e-crew', data: { role: 'admin' } });
    cy.contains('h3', '成員管理').should('be.visible');
    cy.get('select[aria-label="e2e-crew的權限"]').should('be.disabled');
    cy.task('db:patchDoc', { collection: 'users', id: 'e2e-crew', data: { status: 'disabled' } });
    cy.location('pathname').should('eq', '/login');
    cy.contains('帳號已停用，請聯絡營隊管理員').should('be.visible');
  });
});
