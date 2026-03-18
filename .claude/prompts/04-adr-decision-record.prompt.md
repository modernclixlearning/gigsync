---
description: "Architecture Decision Record con debate adversarial"
use_case: "Decisiones arquitectónicas con múltiples opciones válidas"
teammates: 3
---

Create an agent team to evaluate {{DECISION_CONTEXT}}.

Spawn three teammates, each advocating for a different approach:

- **Teammate 1:** Argue for {{OPTION_A}}
- **Teammate 2:** Argue for {{OPTION_B}}
- **Teammate 3:** Argue for {{OPTION_C}}

Have them challenge each other's arguments. Focus on: {{CRITERIA}}

The lead should synthesize a decision document with the strongest arguments from each side.

---

**Ejemplo (base de datos para analytics):**

Create an agent team to evaluate database options for our new analytics feature.

Spawn three teammates, each advocating for a different approach:
- Teammate 1: Argue for PostgreSQL with materialized views
- Teammate 2: Argue for ClickHouse as a dedicated analytics store
- Teammate 3: Argue for keeping everything in the existing MongoDB

Have them challenge each other's arguments. Focus on: query performance at 10M+ rows, operational complexity, migration effort, and cost.

The lead should synthesize a decision document with the strongest arguments from each side.
