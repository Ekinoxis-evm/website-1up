import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime     = "edge";
export const alt         = "Jornadas Recreativas — gaming corporativo en 1UP Gaming Tower";
export const size        = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title:    "Jornadas\nRecreativas",
    subtitle: "Experiencias gaming corporativas y team-building",
    accent:   "secondary",
  });
}
