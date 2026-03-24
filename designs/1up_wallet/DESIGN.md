# Design System Strategy: Neo-Brutalist Competitive

## 1. Overview & Creative North Star
**Creative North Star: The Kinetic Monolith**
This design system is built to evoke the high-stakes adrenaline of pro-gaming. It rejects the soft, "friendly" SaaS aesthetic in favor of **Neo-Brutalist Kineticism**. We achieve this through aggressive, raw layouts, unyielding 0px corner radii, and high-contrast color collisions. The experience should feel like a premium command center: authoritative, sharp, and intentional. 

By utilizing intentional asymmetry—such as placing heavy headlines against vast negative space—and overlapping components that break the traditional container grid, we move from "standard app" to "digital arena."

---

## 2. Colors
Our palette is anchored in deep tech-slates, punctured by hyper-vibrant neon accents.

### Color Tokens
*   **Surface (Base):** `#0b1326` (The void)
*   **Primary (Neon Pink):** `#ffb2bf` / Container: `#ff4d80`
*   **Secondary (Electric Blue):** `#a1c9ff` / Container: `#0897ff`
*   **Tertiary (Acid Green):** `#abd600` (Used sparingly for "Level Up" or "Win" states)

### The Rules of Engagement
*   **The "No-Line" Rule:** Do not use 1px solid borders for sectioning. Definition must be achieved through background shifts. A `surface-container-low` section should sit against a `surface` background to create a "monolith" effect without the clutter of lines.
*   **Surface Hierarchy & Nesting:** Use the tiers (Lowest to Highest) to stack depth. A gaming profile card (`surface-container-highest`) should sit on a feed background (`surface-container-low`). This creates a structural "stack" that feels architectural.
*   **The "Glass & Gradient" Rule:** To soften the brutalism, use **Glassmorphism** for floating HUDs or navigation overlays. Use the `surface` color at 60% opacity with a `20px` backdrop blur. 
*   **Signature Textures:** For hero backgrounds and primary CTAs, use a 45-degree linear gradient from `primary` (`#ffb2bf`) to `primary-container` (`#ff4d80`). This adds a "synthetic glow" that flat hex codes cannot replicate.

---

## 3. Typography
The type system is built on a "Geometric Friction" model—pairing the industrial, wide-aperture of **Space Grotesk** with the utilitarian precision of **Inter**.

*   **Display & Headlines (Space Grotesk):** Use `display-lg` (3.5rem) for scoreboards and victory states. The geometric nature of Space Grotesk mirrors the sharp 0px corners of our UI elements. All headlines should be `600` weight minimum.
*   **Body & Titles (Inter):** For density and readability in stats and chat logs, use Inter. Its neutral tone allows the brand-heavy headers to command attention without overwhelming the user.
*   **Labels (Space Grotesk):** Use `label-md` (uppercase) for metadata like "K/D RATIO" or "STREAK." This adds a technical, "coded" feel to the interface.

---

## 4. Elevation & Depth
In this design system, shadows are not "softness"—they are **Atmospheric Displacement**.

*   **Tonal Layering:** Avoid shadows for static elements. Let the color shift from `surface-container-lowest` to `surface-container-highest` communicate height. 
*   **Ambient Gaming Shadows:** When a card must float (e.g., a modal or hover state), use an extra-diffused shadow: `0px 20px 50px rgba(0, 0, 0, 0.4)`. To add depth, tint the shadow with the `on-surface` color (`#dae2fd`) at 4% opacity to mimic the glow of a monitor.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` at **15% opacity**. It should be a suggestion of a boundary, not a hard cage.
*   **Corner Integrity:** All components must adhere to the `0px` scale. Sharp edges signify precision and "pro-grade" equipment.

---

## 5. Components

### Buttons: The "Power Cell"
*   **Primary:** Solid `primary-container` gradient. 0px corners. On hover, add a `primary` outer glow (8px blur).
*   **Secondary:** Ghost style. No background, `primary` 2px ghost border (the only exception to the line rule), uppercase `label-md` text.
*   **Padding:** Use `spacing-4` (0.9rem) for vertical and `spacing-8` (1.75rem) for horizontal.

### Cards: The "Monolith"
*   **Rule:** Forbid divider lines.
*   **Construction:** Use `surface-container-low` for the card body. Use a `surface-container-highest` block at the top for header information. Separate content sections using `spacing-6` (1.3rem) vertical gaps.

### Inputs & Fields
*   **State:** Default background should be `surface-container-lowest`. On focus, the background shifts to `surface-container-high` with a `secondary` (Electric Blue) 2px bottom-bar only. This mimics a high-tech terminal.

### Additional Components: "The Streak Meter"
*   **Progress Bars:** High-contrast `primary` fill against a `surface-container-highest` track. Use "stepped" segments (brutalist blocks) rather than a smooth continuous bar to represent progress levels.

---

## 6. Do's and Don'ts

### Do:
*   **DO** use extreme typographic scale. If a headline is important, make it `display-lg`.
*   **DO** lean into asymmetry. Off-center a card or let an image bleed off the edge of the screen.
*   **DO** use the `spacing-16` or `spacing-20` for major section breathing room to allow the brutalist elements to "breathe."

### Don't:
*   **DON'T** use border-radius. Ever. Even 2px breaks the "Pro-Gamer" edge of this system.
*   **DON'T** use standard grey shadows. Shadows should feel like the absence of light in a tech-heavy room (deep, tinted, diffused).
*   **DON'T** use "friendly" icons. Use sharp, geometric iconography with consistent stroke weights that match your `outline` token.
*   **DON'T** use dividers. If two pieces of content are different, use a background color shift or a large jump in the spacing scale.