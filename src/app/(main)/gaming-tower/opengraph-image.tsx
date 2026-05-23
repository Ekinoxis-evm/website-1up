import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime     = "edge";
export const alt         = "Gaming Tower — la torre de esports de 6 pisos en Cali, Colombia";
export const size        = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title:    "Gaming Tower",
    subtitle: "Seis pisos · equipos de élite · 1UP Pass para acceso completo",
    accent:   "secondary",
  });
}
