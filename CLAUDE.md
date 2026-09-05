# CLAUDE.md — GigSync

---

## Repo Purpose

App companion para músicos en vivo: gestión de repertorio en formato ChordPro, reproductor de letras+acordes con Smart Autoscroll sincronizado a BPM, metrónomo y afinador. PWA offline-first, sin backend (persistencia local en IndexedDB vía Dexie).

---

## Common Commands

```bash
# Instalación de dependencias (CI usa npm; hay pnpm-lock.yaml también presente — confirmar con el owner antes de asumir cuál es canónico)
npm ci

# Ejecutar tests
npm run test

# Type-check + build
npx tsc --noEmit
npm run build

# Servidor de desarrollo
npm run dev
```

---

## Project Rules

> Reglas que Claude Code debe respetar en todo momento.

1. No modificar archivos de configuración (`.env`, archivos de infra) sin aprobación explícita.
2. **Convención de branching de este repo:** tronco único `master` (no hay `develop`). El trabajo se hace en branches efímeras (`feature/...`, `claude/...`) que se cierran vía PR a `master`. No mergear directo a `master` sin PR/aprobación del owner.
3. Mantener los tests pasando (`npm run test`) y el type-check limpio (`npx tsc --noEmit`) antes de proponer un PR — es lo que corre el CI (`.github/workflows/ci.yml`).
4. Seguir las convenciones de nombrado ya establecidas en el código existente.
5. Proyecto personal single-usuario: no introducir lógica de multi-tenant, auth de terceros o sync remoto sin que el owner lo pida explícitamente — offline-first con IndexedDB local es la decisión vigente.

---

## Security Constraints

> Restricciones de seguridad no negociables.

- Los archivos `.env` y equivalentes nunca se commitean (ver `.gitignore`).
- No hardcodear credenciales, tokens ni claves API en código fuente.
- Usar datos mock o snapshots locales en desarrollo; no hay DB de producción (todo el estado vive en IndexedDB del navegador del usuario).

---

## Do Not Touch

> Archivos o carpetas que no deben modificarse sin aprobación explícita.

- `.env` y variantes (`.env.production`, `.env.staging`, etc.)
- `.github/workflows/ci.yml` — cambios al pipeline de CI requieren aprobación explícita.
- `dist/`, `node_modules/` — generados, no se editan a mano.
