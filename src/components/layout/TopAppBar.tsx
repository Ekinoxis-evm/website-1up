"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

const NAV_LINKS = [
  { href: "/",             label: "Home"      },
  { href: "/gaming-tower", label: "Tower"     },
  { href: "/juegos",       label: "Juegos"    },
  { href: "/team",         label: "Team"      },
  { href: "/masters",      label: "Masters"   },
  { href: "/academia",     label: "Academia"  },
  { href: "/recreativo",   label: "Recreativo"},
];

export function TopAppBar() {
  const pathname = usePathname();
  const { logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 glass-panel border-b border-outline-variant/20">
      {/* Logo + Nav */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/1up.png" alt="1UP Gaming Tower" width={40} height={40} className="object-contain" />
          <span className="text-2xl font-black text-primary italic tracking-tighter font-headline hidden sm:block">
            1UP
          </span>
        </Link>

        <nav className="hidden md:flex gap-6 items-center">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`font-headline font-bold uppercase tracking-tighter transition-colors ${
                  active
                    ? "text-primary border-b-4 border-primary-container pb-1"
                    : "text-on-background hover:text-secondary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Auth */}
      <div className="flex items-center gap-3">
        {ready && (
          authenticated ? (
            <div className="flex items-center gap-3">
              {/* Wallet balance pill */}
              {embeddedWallet && (
                <Link
                  href={APP_URL}
                  className="hidden sm:flex items-center gap-2 bg-surface-container px-3 py-1.5 border border-primary/20 hover:border-primary/50 transition-colors"
                >
                  <span
                    className="material-symbols-outlined text-primary text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    account_balance_wallet
                  </span>
                  <span className="font-headline font-bold text-primary text-xs">
                    {`${embeddedWallet.address.slice(0, 6)}…${embeddedWallet.address.slice(-4)}`}
                  </span>
                </Link>
              )}
              {/* Profile icon */}
              <Link
                href={APP_URL}
                className="flex items-center gap-1.5 font-headline font-bold uppercase text-sm transition-colors text-on-background/70 hover:text-primary"
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_circle
                </span>
                <span className="hidden sm:block">Perfil</span>
              </Link>
              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-1 text-on-background/40 hover:text-error transition-colors font-headline font-bold uppercase text-xs"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span className="hidden sm:block">Exit</span>
              </button>
            </div>
          ) : (
            <a
              href={`${APP_URL}/login`}
              className="bg-primary-container text-white px-6 py-2 font-headline font-black skew-fix hover:bg-primary hover:neo-shadow-pink transition-all active:scale-95"
            >
              <span className="block skew-content">JOIN NOW</span>
            </a>
          )
        )}
      </div>
    </header>
  );
}
