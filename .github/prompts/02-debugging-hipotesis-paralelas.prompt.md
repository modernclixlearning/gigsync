---
description: "Debugging con hipótesis investigadas en paralelo"
use_case: "Investigación de bugs complejos"
adaptation: "Subagents — cada hipótesis en subagent aislado (no hay debate entre ellos)"
---

Users report: {{BUG_DESCRIPTION}}

Investigate this bug by exploring different hypotheses **in parallel**. Run each investigation as an isolated subagent so findings are independent:

1. **Hypothesis 1:** {{HYPOTHESIS_1}} (e.g., database connection pooling)
2. **Hypothesis 2:** {{HYPOTHESIS_2}} (e.g., race conditions in the payment flow)
3. **Hypothesis 3:** {{HYPOTHESIS_3}} (e.g., server resource limits)

Each subagent should investigate its hypothesis and return evidence for or against it. After all complete, synthesize the findings into a root cause analysis with the most likely explanation and recommended fix.

---

**Ejemplo concreto:**

Users report: Intermittent 500 errors on the checkout endpoint.

Investigate by exploring different hypotheses in parallel. Run each as an isolated subagent:
1. Database connection pooling and connection exhaustion
2. Race conditions in the payment flow
3. Server resource limits (memory, CPU, file descriptors)

Each subagent returns evidence for or against its hypothesis. Synthesize into a root cause analysis with the most likely explanation and recommended fix.
