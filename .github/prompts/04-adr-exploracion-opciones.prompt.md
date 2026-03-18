---
description: "ADR con exploración paralela de opciones"
use_case: "Decisiones arquitectónicas con múltiples alternativas"
adaptation: "Subagents — cada opción investigada en paralelo"
---

I need to decide: {{DECISION_CONTEXT}}

Do some **isolated research** on these approaches in parallel. Run each as a subagent:

1. **Option A:** {{OPTION_A}} — research pros, cons, and fit for our use case
2. **Option B:** {{OPTION_B}} — research pros, cons, and fit for our use case
3. **Option C:** {{OPTION_C}} — research pros, cons, and fit for our use case

Each subagent returns a focused analysis. Compare the results and recommend the best approach for our context. Include migration effort and operational complexity in the comparison.

---

**Ejemplo (caching para API):**

I need to implement caching for this API. Do isolated research on these three approaches in parallel:

1. Redis-based caching solution
2. In-memory caching with LRU eviction
3. Hybrid approach with tiered caching

Compare the results and recommend the best approach for our use case (consider scale, operational complexity, and existing infrastructure).
