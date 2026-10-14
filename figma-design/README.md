# Camp Plan Studio — Figma Design

High-fidelity, clickable design of the 北科崇德 camp lesson-plan studio, laid out like a
Figma Make export (Vite + React + Tailwind CSS v4). It is a standalone design prototype:
it uses sample data from `src/app/data/mock.ts` and does not talk to Firebase.

## Run

```bash
cd figma-design
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```

Sign in with username `admin` (full access) or `crew` (read-only) — any password.
Screens can also be opened directly by hash, e.g. `#/plans`, `#/editor/p1`, `#/tables`.

## Screens

| Route | Screen |
| --- | --- |
| `#/login` | Sign-in over the camp photo wall |
| `#/home` | Hero, stage timeline, division directory, activity stream |
| `#/plans` | Plan directory: list / gallery / board views, search, sort, row menu, delete confirm |
| `#/editor/:id` | Docs-style plan editor, collapsible toolbar, props table, version drawer, history mode, mobile edit mode |
| `#/timer` | Synced countdown, broadcast console, round controller, screen-saver mode |
| `#/tables` | Rotation table with lock / unlock and the Smart Rotation wizard |
| `#/props` | Props checklist sheet (activity / teaching / whole camp) |
| `#/settings` | Account, workspace (camps, milestones, groups, tags), preferences, version, danger zone |

## Structure

```
src/
  main.tsx              entry
  app/
    App.tsx             hash routing, role, theme, shared state
    components/         one file per screen + Shell (top bar, dock, mobile tab bar, system menu)
      ui/               Button, Dialog, Segmented, Tag, … primitives
    data/mock.ts        sample camp, plans, stages, rotation table
    imports/            components imported from the design file (TentMark)
  imports/svg-paths.ts  vector paths from the design file
  styles/               theme tokens (light + dark), Tailwind entry, fonts
  assets/               logo
```

## Design tokens

Defined in `src/styles/theme.css` and exposed to Tailwind as `bg-background`, `text-muted-foreground`,
`bg-primary`, etc. Light ground `#FAF8F5`, dark ground `#0B1012`, one orange accent; text colors meet
WCAG AA on their ground. Fonts: Inter (body), Space Grotesk (display), Fira Code (mono labels),
Noto Sans TC (Chinese).
