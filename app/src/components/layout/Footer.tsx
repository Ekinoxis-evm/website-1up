import Link from "next/link";

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "TikTok",    href: "#" },
  { label: "Kick",      href: "#" },
  { label: "YouTube",   href: "#" },
];

export function Footer() {
  return (
    <footer className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-8 bg-surface-container-lowest border-t-8 border-primary-container">
      <div className="flex flex-col items-center md:items-start gap-1">
        <span className="text-lg font-black text-primary font-headline">
          1UP GAMING TOWER
        </span>
        <span className="font-body text-xs tracking-widest uppercase text-outline">
          © {new Date().getFullYear()} 1UP GAMING TOWER COLOMBIA
        </span>
        <span className="font-body text-xs text-outline/60">
          1upesports.org
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {SOCIALS.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="font-body text-xs tracking-widest uppercase text-outline hover:text-secondary transition-colors"
          >
            {label}
          </a>
        ))}
        <Link
          href="/admin"
          className="font-body text-xs tracking-widest uppercase text-outline hover:text-secondary transition-colors"
        >
          Admin
        </Link>
      </div>

      <div className="text-tertiary font-black tracking-widest text-xs font-headline">
        LEVEL UP COLOMBIA
      </div>
    </footer>
  );
}
