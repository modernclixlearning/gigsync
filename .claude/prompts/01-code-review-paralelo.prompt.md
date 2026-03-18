---
description: "Code review paralelo con múltiples lentes — seguridad, performance, tests"
use_case: "Revisión de PR"
teammates: 3
---

Create an agent team to review PR #{{PR_NUMBER}}. Spawn three reviewers:

- **Security reviewer:** Focus on security implications — token handling, session management, input validation, auth flows
- **Performance reviewer:** Check performance impact — N+1 queries, unnecessary re-renders, bundle size, caching
- **Test reviewer:** Validate test coverage — edge cases, integration tests, mocking strategy

Have them each review and report findings. Use delegate mode so the lead synthesizes a final review without doing its own analysis.

---

**Variante (sin número de PR específico):**

Create an agent team to review the current changes. Spawn three reviewers: one focused on security implications, one checking performance impact, one validating test coverage. Have them each review and report findings. Use delegate mode so the lead synthesizes a final review without doing its own analysis.
