import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime     = "edge";
export const alt         = "Academia 1UP — cursos de esports en Colombia";
export const size        = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title:    "Academia",
    subtitle: "Cursos por masters profesionales — gaming, performance y carrera",
    accent:   "tertiary",
  });
}
