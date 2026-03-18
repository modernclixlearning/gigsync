---
description: "Implementación full-stack con ownership por capa"
use_case: "Nuevas features que abarcan múltiples capas"
teammates: 4
---

Create an agent team to implement {{FEATURE_NAME}}.

Spawn four teammates:

- **Backend:** Create the service layer, database schema, and API endpoints
- **Frontend:** Build the UI components and state management
- **Tests:** Write integration tests for the full flow
- **Docs:** Update API documentation and add usage examples

Assign each teammate clear file boundaries:
- Backend owns {{BACKEND_PATHS}}
- Frontend owns {{FRONTEND_PATHS}}
- Tests owns {{TESTS_PATHS}}
- Docs owns {{DOCS_PATHS}}

No file overlap between teammates.

---

**Ejemplo concreto (sistema de notificaciones):**

Create an agent team to implement the user notifications system.

Spawn four teammates:
- Backend: Create the notification service, database schema, and API endpoints
- Frontend: Build the notification bell component, dropdown, and read/unread states
- Tests: Write integration tests for the full notification flow
- Docs: Update the API documentation and add usage examples

Assign each teammate clear file boundaries. Backend owns src/api/notifications/ and src/db/migrations/. Frontend owns src/components/notifications/. Tests own tests/notifications/. Docs owns docs/api/. No file overlap.
