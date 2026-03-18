---
description: "Debugging con hipótesis competitivas — debate científico entre teorías"
use_case: "Investigación de bugs complejos"
teammates: 3-5
---

Users report: {{BUG_DESCRIPTION}}

Spawn {{N}} agent teammates to investigate different hypotheses. Have them talk to each other to try to disprove each other's theories, like a scientific debate. Update the findings doc with whatever consensus emerges.

---

**Ejemplos de sustitución:**

- *BUG_DESCRIPTION:* "The app exits after one message instead of staying connected"
- *BUG_DESCRIPTION:* "Intermittent 500 errors on the checkout endpoint"
- *N:* 3, 4, or 5 (según complejidad)

**Hipótesis sugeridas (para bugs de checkout/500):**
- Teammate 1: Database connection pooling
- Teammate 2: Race conditions in the payment flow
- Teammate 3: Server resource limits

---

**Variante con hipótesis explícitas:**

Users report: {{BUG_DESCRIPTION}}

Spawn 3 teammates to investigate different hypotheses:
- One checking {{HYPOTHESIS_1}}
- One investigating {{HYPOTHESIS_2}}
- One analyzing {{HYPOTHESIS_3}}

Have them share findings and challenge each other's theories. Update the findings doc with consensus.
