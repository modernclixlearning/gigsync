# Comandos de Control para Agent Teams

Referencia rápida de instrucciones en lenguaje natural para controlar el equipo.

---

## Display Mode

| Objetivo | Instrucción |
|----------|-------------|
| Forzar modo in-process | `claude --teammate-mode in-process` |
| Configurar en settings | `"teammateMode": "in-process"` en settings.json |
| Split panes (tmux/iTerm2) | `"teammateMode": "tmux"` — requiere tmux o iTerm2 con it2 CLI |

---

## Especificar Teammates y Modelos

| Objetivo | Instrucción |
|----------|-------------|
| Número fijo de teammates | "Create a team with 4 teammates to refactor these modules in parallel." |
| Modelo específico | "Use Sonnet for each teammate." |

---

## Plan Approval

Para tareas complejas o riesgosas, exigir plan antes de implementar:

> Spawn an architect teammate to refactor the authentication module. Require plan approval before they make any changes.

El lead aprueba o rechaza con feedback. Solo aprobar planes que incluyan test coverage. Rechazar planes que modifiquen el schema de base de datos sin migración.

---

## Interacción Directa

| Acción | Cómo |
|--------|------|
| Ciclar entre teammates | **Shift+Down** (modo in-process) |
| Mensajear a un teammate | Ciclar hasta su sesión, luego escribir |
| Interrumpir turno actual | **Enter** para ver sesión, **Escape** para interrumpir |
| Toggle task list | **Ctrl+T** |
| Split panes | Click en el pane del teammate |

---

## Asignación de Tareas

| Objetivo | Instrucción |
|----------|-------------|
| Asignar explícitamente | "Assign task X to the backend teammate" |
| Auto-claim | Los teammates toman la siguiente tarea disponible al terminar |
| Esperar a teammates | "Wait for your teammates to complete their tasks before proceeding" |

---

## Shutdown y Cleanup

| Objetivo | Instrucción |
|----------|-------------|
| Apagar un teammate | "Ask the researcher teammate to shut down" |
| Limpiar el equipo | "Clean up the team" |

⚠️ **Siempre** usar el lead para cleanup. Los teammates no deben ejecutar cleanup.

---

## Hooks (Quality Gates)

| Hook | Cuándo | Efecto |
|------|--------|--------|
| **TeammateIdle** | Teammate a punto de quedar idle | Exit code 2 → enviar feedback y mantener trabajando |
| **TaskCompleted** | Tarea marcada como completa | Exit code 2 → prevenir completado y enviar feedback |

---

## Troubleshooting Rápido

| Problema | Acción |
|---------|--------|
| Teammates no aparecen | Shift+Down para ciclar; verificar que la tarea justifique un equipo |
| Demasiados prompts de permisos | Pre-aprobar operaciones comunes en settings antes de spawn |
| Teammate se detiene por error | Dar instrucciones directas o spawn un reemplazo |
| Lead se apaga antes de tiempo | "Keep going" o "Wait for teammates to finish before proceeding" |
| Sesión tmux huérfana | `tmux ls` → `tmux kill-session -t <nombre>` |
