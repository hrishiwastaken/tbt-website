/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // The Brain Tea brand palette
        ocean: "#5D768B",       // Ocean Deep Blue -- primary, CTAs, active states
        "ocean-deep": "#26333D", // derived near-black shade of ocean -- body text, headings
        sand: "#C8B39B",        // Warm Sandy Beige -- borders, dividers, muted surfaces
        gold: "#E3C9A4",        // Golden Driftwood -- decorative accents, badges
        blush: "#F2D9C7",       // Soft Seashell Pink -- decorative accents, testimonial surfaces
        ivory: "#F8EFE5",       // Ivory Breeze -- canvas background
        surface: "#FFFCF8",     // raised card surface (warm off-white)
        "surface-sunken": "#F1E4D5", // inset/pressed neumorphic surface
        ink: "#26333D",         // body text
        "ink-muted": "#5C6B74", // secondary text

        // Legacy aliases (existing markup not yet migrated) mapped onto new palette
        forest: "#5D768B",
        sage: "#8CA0AD",
        mist: "#E9DFD2",
        terracotta: "#5D768B",
        charcoal: "#26333D",
        "warm-white": "#F8EFE5",
        "warm-sand": "#C8B39B",
        "muted-sage": "#8CA0AD",
        "warm-tan": "#E3C9A4",
        "teal-sage": "#5D768B",
        "forest-slate": "#26333D",
        "near-black": "#26333D",
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "serif"],
        dmsans: ["var(--font-dm-sans)", "sans-serif"],
        hand: ["var(--font-caveat)", "cursive"],
      },
      borderRadius: {
        soft: "16px",
        surface: "24px",
        panel: "32px",
      },
      boxShadow: {
        "warm-soft": "0 4px 24px rgba(38, 51, 61, 0.08)",
        // Soft sculptural neumorphism, tinted with the brand's ocean blue
        // instead of neutral grey/black so shadows read as part of the palette.
        "surface-raised": "8px 8px 20px rgba(93, 118, 139, 0.16), -8px -8px 20px rgba(255, 255, 255, 0.8)",
        "surface-raised-sm": "4px 4px 10px rgba(93, 118, 139, 0.14), -4px -4px 10px rgba(255, 255, 255, 0.75)",
        "surface-inset": "inset 4px 4px 10px rgba(93, 118, 139, 0.16), inset -4px -4px 10px rgba(255, 255, 255, 0.7)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
  plugins: [],
};
