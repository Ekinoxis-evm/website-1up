---
name: design-system
description: Neo-brutalist design system for 1UP Gaming Tower — color tokens, CSS utilities, component patterns, typography, layout groups, and navigation update rules.
type: project
filePattern: src/components/**
---

# Design System — 1UP Gaming Tower

## Color token cheat sheet

```
── Backgrounds ──────────────────────────────────────────────────
bg-background               #0b1326  ← page base (darkest)
bg-surface-container-lowest #060e20  ← sidebar, admin bg
bg-surface-container-low    #131b2e  ← alternating table rows
bg-surface-container        #171f33  ← cards, modals
bg-surface-container-high   #222a3d  ← elevated cards, inputs
bg-surface-container-highest #2c3450 ← table headers, tags

── Accents ──────────────────────────────────────────────────────
text-primary / bg-primary        #ffb2bf  ← neon pink (highlights)
bg-primary-container             #ff4d80  ← CTA buttons, active nav, admin accents
text-secondary / bg-secondary    #a1c9ff  ← electric blue
bg-secondary-container           #0897ff  ← blue CTAs, player cards
text-tertiary / bg-tertiary      #abd600  ← acid green (Academia, wins)
text-outline                     muted gray ← placeholder text, labels
text-error / bg-error            #ffb4ab  ← errors, delete actions
text-on-background               white-ish ← primary readable text
```

## CSS utilities (globals.css)

| Class | Effect |
|-------|--------|
| `.skew-fix` | `transform: skewX(-10deg)` — outer wrapper |
| `.skew-content` | `transform: skewX(10deg)` — inner counter-rotate |
| `.neo-shadow-pink` | `8px 8px 0 #ff4d80` solid offset shadow |
| `.neo-shadow-blue` | `8px 8px 0 #0897ff` solid offset shadow |
| `.neo-shadow-green` | `8px 8px 0 #abd600` solid offset shadow |
| `.glass-panel` | `background: rgba(11,19,38,0.6)` + `backdrop-filter: blur(20px)` |
| `.glitch-border` | Pink/blue double-line border accent |
| `.text-glow-pink` | Pink text shadow glow |
| `.text-glow-blue` | Blue text shadow glow |
| `.streak-segment` | Angled progress bar segment |

## Typography

- **Headlines / labels / nav**: `font-headline` = Space Grotesk — always `font-black` for headers, `font-bold` for sub-labels
- **Body copy**: `font-body` = Inter — `text-sm` for most content
- **Material Symbols**: loaded globally — use `<span className="material-symbols-outlined">icon_name</span>`
- Fill a symbol: `style={{ fontVariationSettings: "'FILL' 1" }}`

## Component patterns

### Skewed CTA button
```tsx
<button className="bg-primary-container text-white font-headline font-black px-8 py-3 skew-fix hover:neo-shadow-pink transition-all">
  <span className="block skew-content">LABEL</span>
</button>
```

### Section heading with accent bar
```tsx
<div className="mb-10">
  <h1 className="font-headline font-black text-4xl uppercase tracking-tighter">
    MAIN <span className="text-primary">ACCENT</span>
  </h1>
  <div className="h-1 w-20 bg-primary-container mt-2" />
</div>
```

### Card monolith (left accent border)
```tsx
<div className="bg-surface-container border-l-4 border-primary-container p-6 hover:bg-surface-container-high transition-colors">
  {/* content */}
</div>
```

### Glass panel (nav, overlays)
```tsx
<div className="glass-panel border-b border-outline-variant/20">
  {/* bg rgba(11,19,38,0.6) + backdrop-blur-20px */}
</div>
```

### Modal overlay
```tsx
<div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
  <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
    {/* content */}
  </div>
</div>
```

### Input field (admin forms)
```tsx
<input className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
```

## Language rules

- **Navigation labels, buttons, badges, CTAs**: English UPPERCASE (`JOIN NOW`, `EXPLORAR`, `GUARDAR`, `+ AGREGAR`)
- **Page headlines, section titles**: Spanish (matching mockups)
- **Body copy, descriptions**: Spanish
- **Admin panel**: Spanish labels (it's used by the 1UP team)

## Layout groups — when to use which

| Group | Route prefix | Has SideNavBar |
|-------|-------------|---------------|
| `(main)` | `/`, `/recreativo`, `/perfil` | No — TopAppBar + Footer only |
| `(sidebar)` | `/gaming-tower`, `/juegos`, `/team`, `/academia` | Yes — fixed left sidebar + TopAppBar |
| `admin/` | `/admin/*` | AdminSidebar only (no TopAppBar) |

## Navigation update rule

When adding a new page, update **all three** nav components:

1. `src/components/layout/TopAppBar.tsx` → add to `NAV_LINKS` array
2. `src/components/layout/SideNavBar.tsx` → add to `ITEMS` array (sidebar pages only)
3. `src/components/layout/MobileBottomNav.tsx` → add to `PUBLIC_TABS` array

For admin pages, also add to `MODULES` in `src/components/admin/AdminSidebar.tsx`.

## Accent cycle pattern (for lists of sections)

When rendering multiple sections that each need a different accent color, cycle through:
```ts
const ACCENT_CYCLE = [
  { border: "border-primary-container",   badge: "bg-primary-container text-white",       shadow: "neo-shadow-pink"  },
  { border: "border-secondary-container", badge: "bg-secondary-container text-background", shadow: "neo-shadow-blue"  },
  { border: "border-tertiary",            badge: "bg-tertiary text-background",            shadow: "neo-shadow-green" },
];
const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
```
