# Mobile Responsive — 1UP Gaming Tower

## Non-negotiable rules for every component

### Touch targets — minimum 44px hit area
Every interactive element (button, link, icon action) must have at least `py-3 px-4` or `p-3` to meet the 44px minimum.

```tsx
// ✅ Correct
<button className="p-3">...</button>
<Link className="flex items-center gap-3 px-3 py-3">...</Link>

// ❌ Wrong
<button className="p-1.5">...</button>
<Link className="px-2 py-1">...</Link>
```

### Mobile-first typography
Headlines scale: `text-4xl md:text-6xl lg:text-8xl`
Body: always `text-sm` — never `text-xs` for body copy on mobile.

### No horizontal overflow
Never let a component cause horizontal scroll. Use `overflow-hidden` on containers, `truncate` or `break-words` on text, `min-w-0` on flex children that contain text.

---

## Admin panel pattern (mobile drawer)

`AdminSidebar` is a slide-in drawer on mobile (≤ md). It has a mobile top bar `h-14` fixed at the top.

Every admin `<main>` must have `pt-20 md:pt-10` to clear the mobile top bar.

Admin Server Component pages **do not** need to add any padding themselves — it's handled by `src/app/admin/(protected)/layout.tsx`.

---

## Tables → Card stacks on mobile

Admin data tables must render as card stacks on mobile. Pattern:

```tsx
{/* Desktop table */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full text-sm">
    <thead>...</thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id} className="even:bg-surface-container-low">
          <td className="px-4 py-3">...</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{/* Mobile card stack */}
<div className="md:hidden space-y-3">
  {items.map((item) => (
    <div key={item.id} className="bg-surface-container p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-headline font-bold text-sm">{item.name}</p>
        <span className="font-body text-xs text-outline">{item.date}</span>
      </div>
      <p className="font-body text-xs text-on-surface/60">{item.detail}</p>
      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button className="flex-1 bg-primary-container text-white font-headline font-bold text-xs py-2">ACCIÓN</button>
      </div>
    </div>
  ))}
</div>
```

---

## Modals on mobile

Modals use `fixed inset-0 z-50 flex items-end md:items-center` so they slide up from the bottom on mobile (sheet pattern) and center on desktop.

```tsx
<div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4"
     onClick={onClose}>
  <div className="w-full md:max-w-lg bg-surface-container p-6 max-h-[90vh] overflow-y-auto"
       onClick={(e) => e.stopPropagation()}>
    ...content...
  </div>
</div>
```

---

## Form inputs on mobile

All inputs must have `text-base` (16px) to prevent iOS auto-zoom on focus:

```tsx
<input className="w-full bg-surface-container text-on-background p-4 text-base font-headline font-bold border-none focus:outline-none" />
```

`font-size < 16px` on any focused `<input>` or `<select>` triggers iOS zoom — always use `text-base` minimum.

---

## PWA — manifest + service worker

Manifest: `public/manifest.json` — name, icons (192+512), theme `#e91e8c`, `display: standalone`.
Service worker: `public/sw.js` — registered via `ServiceWorkerRegister` client component in root layout.
Offline page: `src/app/offline/page.tsx`.

To make app subdomain (`app.1upesports.org`) installable separately, add a separate manifest route that returns `start_url: "/app"` for that origin.

---

## Safe-area insets (notch / home indicator)

For fixed bottom bars (MobileBottomNav, AppBottomNav) on iPhone X+:

```tsx
// In globals.css
.bottom-nav-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

```tsx
<nav className="fixed bottom-0 left-0 w-full ... pb-[env(safe-area-inset-bottom,0px)]">
```

The viewport meta `viewport-fit=cover` is already set in root layout — this unlocks `env(safe-area-inset-*)`.

---

## Breakpoints reference

| Prefix | Width | Use for |
|--------|-------|---------|
| (none) | 0px+ | Mobile — primary target |
| `sm:` | 640px+ | Rarely used |
| `md:` | 768px+ | Tablet/desktop split point |
| `lg:` | 1024px+ | Wide desktop |

Design mobile-first: write the mobile style first, then `md:` overrides for desktop.
