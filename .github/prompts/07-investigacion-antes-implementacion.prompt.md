---
description: "Patrón genérico: research aislado antes de implementar"
use_case: "Cualquier tarea que beneficia de investigación previa"
adaptation: "Subagents — research en contexto aislado, implementación en principal"
---

{{TASK_DESCRIPTION}}

**Before implementing:** Run a subagent to perform isolated research on {{RESEARCH_SCOPE}}. Return only information relevant for the implementation — no code yet.

**Then:** Use the research to implement. Keep the main context focused on the actual work.

---

**Ejemplos de sustitución:**

- *TASK:* "Add user documentation for the new feature"
  *RESEARCH:* "the new feature implementation details"
  
- *TASK:* "Integrate payment provider X"
  *RESEARCH:* "provider X API, webhooks, and error handling patterns"
  
- *TASK:* "Migrate from library A to library B"
  *RESEARCH:* "migration paths, breaking changes, and compatibility"
