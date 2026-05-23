import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime     = "edge";
export const alt         = "Marketplace 1UP — productos y merch de la torre";
export const size        = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title:    "Marketplace",
    subtitle: "Merch, productos y experiencias del ecosistema 1UP",
    accent:   "tertiary",
  });
}
