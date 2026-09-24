# RD Trauma Healing - Workspace Rules

## 1. Tooling & Environment
- **Package Manager:** Use `npm` across all workspace operations (`npm run dev`, `npm run build`, `npm install`). Do not invoke `pnpm` workspaces as the project has been migrated to standard npm tooling.
- **Port & Host:** Default local dev server runs on port 5173 with host `0.0.0.0`.
- **Peer Dependencies:** Keep `legacy-peer-deps=true` in `.npmrc` to accommodate React 19 dependencies cleanly.

## 2. Design System & Trauma-Informed Aesthetics
- **Color Palette:**
  - Background: `#FAF6F0` (warm cream)
  - Text Primary: `#2C3339` (deep slate)
  - Accents: `#A8B79A` (sage green), `#7D6485` (mauve), `#C9A876` (warm gold)
- **Accessibility:** Always maintain contrast ratios, respect `useReducedMotion()`, and provide clear keyboard focus outlines.
- **Content Tone:** Empathetic, calm, non-demanding, and consent-driven. Avoid urgent or high-pressure marketing language.
