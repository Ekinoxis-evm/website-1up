import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime     = "edge";
export const alt         = "Torneos 1UP — esports profesional en Cali, Colombia";
export const size        = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title:    "Torneos",
    subtitle: "Compite, gana premios on-chain y sube al Hall of Fame",
    accent:   "primary",
  });
}
