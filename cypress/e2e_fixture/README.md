# e2e_fixture

唯一允許 mock API 回應的地方（cy.intercept(..., { body })）。刻意放在 e2e/ 外面，讓「可以 mock」與「不可以 mock」在檔案系統上就分開。

規範見 .claude/skills/camp-cypress-test-fe/SKILL.md
