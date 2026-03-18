---
description: "Refactorización de módulo con teammates por capa"
use_case: "Refactoring que abarca múltiples áreas"
teammates: 3
---

Create an agent team to refactor {{MODULE_NAME}}.

Spawn three teammates:
- **API layer:** Refactor controllers, routes, and request/response handling
- **Database:** Handle migrations and schema changes
- **Tests:** Update and add test coverage for the refactored code

Have them coordinate through the shared task list. Assign clear file boundaries to prevent conflicts.

---

**Con plan approval (recomendado para refactors riesgosos):**

Create an agent team to refactor the {{MODULE_NAME}} module.

Spawn three teammates: one for the API layer, one for database migrations, one for test coverage. Require plan approval before they make any changes. Only approve plans that include test coverage and preserve backward compatibility.
