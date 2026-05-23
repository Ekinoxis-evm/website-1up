// Bare layout — no TopAppBar / Footer / nav. Used by routes that should
// occupy the full viewport (currently just the tournament TV view at
// `/torneos/[slug]/tv`).
//
// Lives in a `(bare)` route group, which is a sibling of `(main)` — neither
// segment appears in the URL. So `/torneos/[slug]/tv` resolves to the page
// inside this group, while `/torneos/[slug]` resolves to the page inside
// `(main)`. Same dynamic slug, different layouts.

export default function BareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
