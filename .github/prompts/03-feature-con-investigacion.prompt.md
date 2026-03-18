---
description: "Feature con investigación previa vía subagent"
use_case: "Nuevas features que requieren research antes de implementar"
adaptation: "Subagents — research aislado, implementación en contexto principal"
---

I need to implement {{FEATURE_NAME}}.

**First:** Run a subagent to perform isolated research on:
- Best practices and patterns for this type of feature
- Existing similar implementations in our codebase
- Relevant libraries or utilities we should reuse

Return only a concise recommendation with pros/cons. Do not implement yet.

**Then:** Based on the research, implement the feature. Use the recommended approach unless there's a good reason to deviate.

---

**Ejemplo (OAuth 2.0):**

I need to implement OAuth 2.0 for our Node.js app.

First: Perform isolated research into different OAuth 2.0 implementation patterns for Node.js. Compare each against our current auth setup. Return only a recommendation with pros and cons.

Then: Implement the chosen approach.
