---
description: "Análisis de cuellos de botella en paralelo"
use_case: "Investigación de performance"
teammates: 3
---

Create an agent team to identify performance bottlenecks in the application.

Spawn three teammates:

- **API analyst:** Profile API response times across all endpoints
- **Database analyst:** Analyze query performance and indexing
- **Frontend analyst:** Review bundle size and rendering performance

Have them share findings when they discover something that affects another teammate's domain (e.g., slow API caused by missing DB index).

---

**Variante con contexto específico:**

Create an agent team to identify performance bottlenecks in {{MODULE_OR_APP}}.

Spawn three teammates:
- One profiling {{API_SCOPE}}
- One analyzing {{DB_SCOPE}}
- One reviewing {{FRONTEND_SCOPE}}

Have them share findings when they discover cross-domain issues. Log findings to the task list with severity ratings.
