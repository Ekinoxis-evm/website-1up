import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ──────────────────────────────────────────
        "background":                "#0b1326",
        "surface":                   "#0b1326",
        "surface-dim":               "#0b1326",
        "surface-bright":            "#31394d",
        "surface-container-lowest":  "#060e20",
        "surface-container-low":     "#131b2e",
        "surface-container":         "#171f33",
        "surface-container-high":    "#222a3d",
        "surface-container-highest": "#2d3449",
        "surface-variant":           "#2d3449",
        "surface-tint":              "#ffb2bf",
        // ── On-surfaces ───────────────────────────────────────
        "on-background":             "#dae2fd",
        "on-surface":                "#dae2fd",
        "on-surface-variant":        "#e6bcc2",
        "inverse-surface":           "#dae2fd",
        "inverse-on-surface":        "#283044",
        // ── Primary (Neon Pink) ───────────────────────────────
        "primary":                   "#ffb2bf",
        "primary-container":         "#ff4d80",
        "primary-fixed":             "#ffd9de",
        "primary-fixed-dim":         "#ffb2bf",
        "on-primary":                "#660028",
        "on-primary-container":      "#5a0022",
        "on-primary-fixed":          "#3f0016",
        "on-primary-fixed-variant":  "#90003b",
        "inverse-primary":           "#bc004f",
        // ── Secondary (Electric Blue) ─────────────────────────
        "secondary":                 "#a1c9ff",
        "secondary-container":       "#0897ff",
        "secondary-fixed":           "#d2e4ff",
        "secondary-fixed-dim":       "#a1c9ff",
        "on-secondary":              "#00325a",
        "on-secondary-container":    "#002d53",
        "on-secondary-fixed":        "#001c37",
        "on-secondary-fixed-variant":"#00487f",
        // ── Tertiary (Acid Green) ─────────────────────────────
        "tertiary":                  "#abd600",
        "tertiary-container":        "#7c9c00",
        "tertiary-fixed":            "#c3f400",
        "tertiary-fixed-dim":        "#abd600",
        "on-tertiary":               "#283500",
        "on-tertiary-container":     "#222e00",
        "on-tertiary-fixed":         "#161e00",
        "on-tertiary-fixed-variant": "#3c4d00",
        // ── Outline ───────────────────────────────────────────
        "outline":                   "#ad878d",
        "outline-variant":           "#5d3f44",
        // ── Error ─────────────────────────────────────────────
        "error":                     "#ffb4ab",
        "error-container":           "#93000a",
        "on-error":                  "#690005",
        "on-error-container":        "#ffdad6",
      },
      fontFamily: {
        headline: ["var(--font-space-grotesk)", "sans-serif"],
        body:     ["var(--font-inter)",         "sans-serif"],
        label:    ["var(--font-space-grotesk)", "sans-serif"],
      },
      // 0px everywhere — hard rule of the design system
      borderRadius: {
        DEFAULT: "0px",
        sm:      "0px",
        md:      "0px",
        lg:      "0px",
        xl:      "0px",
        "2xl":   "0px",
        "3xl":   "0px",
        full:    "9999px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
