---
description: "Análisis de cuellos de botella en paralelo"
use_case: "Investigación de performance"
adaptation: "Subagents — API, DB y frontend analizados en paralelo"
---

Analyze this codebase for performance bottlenecks. Perform these tasks **in parallel** so each analysis is independent:

1. **API analyst:** Profile response times across endpoints, identify slow routes
2. **Database analyst:** Analyze query performance, indexing, N+1 patterns
3. **Frontend analyst:** Review bundle size, rendering performance, lazy loading

When a subagent discovers something that affects another domain (e.g., slow API caused by missing DB index), include that in its report.

Compile the findings into a prioritized action plan with severity ratings.
