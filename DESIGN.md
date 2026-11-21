# DESIGN.md — EZfinance design system

## Direction

Apple-native reference: a calm, translucent, physical-feeling interface for operating personal finances. The tool disappears into the task — familiar controls, dense but readable data, quick state-driven motion, no decorative effects. Colour is restrained: one cool neutral ramp and a single blue accent. No violet/indigo, no gradients, no emoji-as-icons, no glow, no oversized radii.

The scanner in `unslop-ui` is the mechanical guardrail; the human decision behind each token is recorded here.

## Tokens

Defined in `src/index.css`, mapped in `tailwind.config.ts`. All colours are HSL variables.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` / `--foreground` | white / slate-900 | near-black / slate-50 | Page surfaces |
| `--card` | white | slate-900 | Cards, no shadow |
| `--primary` | `211 100% 50%` (#0A84FF) | `211 100% 62%` | Primary actions, selection, focus |
| `--accent` | `174 80% 32%` | `174 70% 46%` | Sparse secondary emphasis |
| `--destructive` | `0 77% 48%` | `0 80% 62%` | Delete and errors |
| `--success` / `--warning` / `--info` | green / amber / blue | adjusted for dark | Semantic states, never decoration |
| `--muted` / `--muted-foreground` | slate-100 / slate-500 | slate-800 / slate-300 | Secondary text, disabled surfaces |
| `--border` / `--input` | slate-200 | slate-700 | Hairlines and control borders |
| `--radius` | `0.75rem` | — | Largest radius (cards); md `0.5rem`, sm `0.375rem` |
| `--shadow-float` | soft, offset | deeper | Floating layers only (dialog, sheet, popover) |

**Rule:** elevation is a 1px border for resting surfaces and `--shadow-float` for layers that truly float. Never both a heavy shadow and a coloured halo.

## Typography

- System stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, ...`. Deliberate Apple-reference choice, not a default.
- Fixed rem scale: body `0.9375rem`/1.5, h1 `1.75rem`, h2 `1.375rem`, h3 `1.125rem`, h4 `1rem`. No fluid clamp in product UI.
- Tracking is size-specific: headings `-0.02em`, body `0`. Weight carries emphasis, never gradient text.
- Tabular numerals for data via `.tabular-nums` / `[data-numeric]`.

## Spacing and layout

- One scale: 4 / 8 / 12 / 16 / 20 / 24px (`space-y-1`, `1.5`, `2`, `3`, `4`, `5`, `6`).
- Cards use `p-5` (20px). Dialog and sheet headers/footers use `px-5 py-4`. Field groups inside dialogs use `space-y-3` with `space-y-1.5` between label and control and `gap-3` between columns.
- Main content: `px-4 py-5`, `md:max-w-3xl`, `lg:max-w-5xl`, `xl:max-w-6xl`, with a skip link to `#main-content`.
- Bottom navigation appears from `md` and uses the same `max-w-5xl` alignment as content.

## Interaction and motion

- Feedback on pointer-down: buttons scale to `0.975` for 140ms with an ease-out curve.
- Overlay enter/exit: 160–220ms, state-driven, no stagger, no scrolljacking. Sheets slide along the same axis they open on.
- `prefers-reduced-motion`: transitions and transforms are removed; opacity changes remain. `prefers-reduced-transparency` removes backdrop blur.
- Focus: a 2px `--ring` outline with 2px offset, always `focus-visible` on interactive primitives.
- Browser surfaces (selection, caret, scrollbars, tabular numerals) are themed from the palette.

## Components

- `src/components/ui/` holds shadcn/Radix primitives, themed — never shipped unthemed.
- Overlays are light-scrimmed (`bg-foreground/30` + 2px blur), radius `12px`, `--shadow-float`; dialogs carry `DialogDescription`, icon-only controls carry `aria-label`.
- Buttons: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes `sm`, `default`, `lg`, `icon`. Outline/ghost hover uses `secondary`, never the accent token.
- Cards: border only, `p-5`, `CardTitle` at `text-lg font-semibold`. No nested cards — use plain sections inside dialogs and wizards.
- Tables: `role="region"` + `tabIndex=0` scroll container, `scope="col"` headers, `py-3` cells.
- Skeletons: `role="status"`, `aria-busy`, sr-only "Loading", and layouts that match the real page.
- Status is never colour-only: badges and active filters pair colour with text or a dot plus `sr-only` label.

## Palette and icons

Categorical charts and pickers use the single source of truth in `src/lib/palette.ts` (Apple system colors: blue, green, orange, red, teal, light blue, brown, gray). Icons are Lucide only, with consistent stroke weight. Emoji are never used as UI icons; legacy emoji values fall back to a real icon.

## Files to consult before changing UI

`src/index.css`, `tailwind.config.ts`, `components.json`, `src/lib/palette.ts`, `src/lib/navigation.ts`, `src/components/ui/*`, `src/components/AppLayout.tsx`, and the relevant `src/pages/*` file. This document records decisions, not a substitute for looking at the rendered result at desktop and mobile widths.
