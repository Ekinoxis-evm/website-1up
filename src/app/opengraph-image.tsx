import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime     = "edge";
export const alt         = "1UP Gaming Tower — Colombia's first professional esports hub";
export const size        = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title:    "1UP\nGaming Tower",
    subtitle: "El primer hub de esports profesional en Colombia",
    accent:   "primary",
  });
}
