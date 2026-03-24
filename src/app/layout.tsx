import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { PrivyClientProvider } from "@/components/providers/PrivyClientProvider";
import "@/styles/globals.css";
// Material Symbols — loaded globally so all components can use them
// eslint-disable-next-line @next/next/no-page-custom-font

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "1UP Gaming Tower — El Primer Espacio Equipado en Colombia",
  description:
    "La primera infraestructura de élite para jugadores profesionales de e-sport en Colombia. Gaming Tower, Academia, Team 1UP.",
  metadataBase: new URL("https://1up.ekinoxis.xyz"),
  icons: {
    icon: "/1up.png",
    apple: "/1up.png",
  },
  openGraph: {
    title: "1UP Gaming Tower",
    description: "Colombia's first professional esports hub.",
    siteName: "1UP Gaming Tower",
    images: ["/1up.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${inter.variable} bg-background text-on-background font-body antialiased`}>
        <PrivyClientProvider>
          {children}
        </PrivyClientProvider>
      </body>
    </html>
  );
}
