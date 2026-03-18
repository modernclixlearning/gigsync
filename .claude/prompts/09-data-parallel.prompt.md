---
description: "Trabajo paralelo por segmentos de datos"
use_case: "Clasificación, tagging, procesamiento bulk"
teammates: 4
---

Create an agent team to {{TASK_DESCRIPTION}}.

We have {{TOTAL_ITEMS}} items that need {{PROCESSING_TYPE}}.

Spawn {{N}} teammates, each handling a segment:
- Teammate 1: Items {{RANGE_1}}
- Teammate 2: Items {{RANGE_2}}
- Teammate 3: Items {{RANGE_3}}
- Teammate 4: Items {{RANGE_4}}

Use the schema/rules in {{SCHEMA_PATH}}. Have teammates flag edge cases for the lead to review.

---

**Ejemplo (clasificación de catálogo):**

Create an agent team to classify our product catalog. We have 500 items that need categorization, tagging, and description updates.

Spawn 4 teammates, each handling a segment:
- Teammate 1: Items 1-125
- Teammate 2: Items 126-250
- Teammate 3: Items 251-375
- Teammate 4: Items 376-500

Use the classification schema in docs/taxonomy.md. Have teammates flag edge cases for the lead to review.
