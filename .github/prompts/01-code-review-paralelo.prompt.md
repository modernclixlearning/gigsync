---
description: "Code review paralelo con múltiples lentes — seguridad, performance, tests"
use_case: "Revisión de PR o cambios actuales"
adaptation: "Subagents (GitHub Copilot) — cada perspectiva en subagent paralelo"
---

Review the changes in this PR (or the current diff) from different angles. Perform these reviews **in parallel** so findings are independent and unbiased:

- **Security reviewer:** Check for vulnerabilities — token handling, session management, input validation, injection risks, data exposure
- **Performance reviewer:** Identify bottlenecks — N+1 queries, unnecessary re-renders, bundle size, caching opportunities
- **Test reviewer:** Validate test coverage — edge cases, integration tests, mocking strategy

Compile the findings into a prioritized summary. Note which issues are critical versus nice-to-have. Acknowledge what the code does well.

---

**Variante con agentes custom (si tienes Security-Reviewer, Performance-Reviewer, etc.):**

Review the changes from different angles. Run these subagents in parallel:
- Run the Security-Reviewer agent to check for vulnerabilities
- Run the Performance-Reviewer agent to identify bottlenecks
- Run the Test-Reviewer agent to validate test coverage

Consolidate findings into a single review summary.
