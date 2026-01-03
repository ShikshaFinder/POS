# Frontend Template Agent Guide

This repository is a reusable Next.js 16 template that pairs Tailwind CSS v4 with shadcn/ui primitives and a curated collection of animation-heavy components imported from 21st.dev.

## Stack & Tooling

- **Framework:** Next.js 16 (App Router, React 19).
- **Styling:** Tailwind CSS v4 with CSS variables defined in [`src/app/globals.css`](src/app/globals.css).
- **Component systems:** shadcn/ui (see [`components.json`](components.json)) plus 21st.dev composites under [`src/components`](src/components).
- **Utilities:** `clsx` + `tailwind-merge` exposed via [`src/lib/utils.ts`](src/lib/utils.ts) as `cn`.

## Getting Started

```bash
npm install
npm run dev     # start development server (default http://localhost:3000)
npm run build   # production build using Turbopack
npm run start   # serve the production build
```

Node 18+ is recommended to align with Next.js 16 requirements.

## Directory Overview

| Path | Purpose |
| --- | --- |
| [`src/app`](src/app) | App Router entry points (`layout.tsx`, route segments, global CSS). |
| [`src/components/ui`](src/components/ui) | shadcn/ui primitives and light variants (buttons, forms, pricing cards, etc.). |
| [`src/components/devComponents`](src/components/devComponents) | Higher-level experiences imported from 21st.dev (hero sections, galleries, animated widgets). |
| [`src/components/theme-provider.tsx`](src/components/theme-provider.tsx) | Thin wrapper around `next-themes` used in `src/app/layout.tsx`. |
| [`src/lib`](src/lib) | Shared utilities (currently `utils.ts`). |

Use `ui/` for low-level reusable pieces and `devComponents/` for opinionated sections you can compose into pages.

## Theming Model

- Base tokens live in `:root` and `.dark` blocks inside [`src/app/globals.css`](src/app/globals.css), including semantic colors (`--background`, `--primary`, chart palette), radii, and animation keyframes.
- The Tailwind inline theme references these CSS variables so shadcn utilities (e.g., `bg-background`, `text-muted-foreground`) stay consistent.
- `ThemeProvider` in [`src/app/layout.tsx`](src/app/layout.tsx) wires `next-themes` with `attribute="class"` to toggle `light/dark/system`.
- When adding new components, prefer referencing the semantic CSS vars (e.g., `var(--brand)`), or extend the inline `@theme` block so tokens remain centralized.

## Working with shadcn & 21st.dev

### shadcn/ui

1. Configuration lives in [`components.json`](components.json); aliases map `@/components/ui` and `@/lib/utils`.
2. Add primitives with `npx shadcn@latest add <component>` (Tailwind v4 is autodetected). New files appear under `src/components/ui`.
3. Keep shared variants (e.g., buttons) minimal and theme-friendly; extend via `className` or component-specific props.

### 21st.dev Imports

- Imported components and any assets live under `src/components/devComponents`. Files retain their original naming for traceability (e.g., `animated-hero-with-web-gl-glitter.tsx`).
- Data such as author/title metadata is preserved in `title,author,install_cmd,page_url,create.jl` for reference.
- When a component depends on shared primitives (buttons, cards), either import from `@/components/ui` or embed a localized version to avoid regressions.

## Adding New Pages or Templates

1. Compose a page under `src/app/<route>/page.tsx` and import building blocks from `@/components/ui` and `@/components/devComponents`.
2. Wrap any route-level providers inside `src/app/layout.tsx` when necessary (e.g., analytics, global contexts).
3. Co-locate route-specific styles via CSS Modules if the base theme utilities are insufficient.

## Maintenance Tips

- **Documentation:** Update this `agent.md` whenever you add notable tooling or conventions. Keep `README.md` user-facing, while this file stays implementation-focused.
- **Component Hygiene:** When pulling additional 21st.dev entries, confirm TypeScript types and tweak effects (e.g., `use client` directives, motion easing) to satisfy ESLint/TypeScript.
- **Testing:** After major component imports, run `npm run build` to catch type or bundler issues early (especially when WebGL / three.js pieces are involved).
- **Future Enhancements to Consider:**
  - Add a component gallery (Storybook or Ladle) to preview both `ui/` and `devComponents/`.
  - Set up automated linting (`next lint`, `tsc --noEmit`) and formatting scripts.
  - Extract theme tokens to a dedicated `tokens.ts` or JSON if you plan to sync with design tools.

With these conventions, you can rapidly scaffold visually rich landing pages while keeping a reliable baseline for future client projects.

