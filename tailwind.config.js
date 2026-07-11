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
        // Public site palette (restored old UI)
        "warm-sand": "#DAD7CA", // primary light bg
        "muted-sage": "#9FACA5", // secondary bg / divider
        "warm-tan": "#DCCDB2", // card bg
        "teal-sage": "#698E8B", // buttons, links, accents
        "forest-slate": "#55665D", // headings / labels
        "near-black": "#202623", // body text

        // Legacy compatibility mappings (public site)
        forest: "#698E8B",
        sage: "#9FACA5",
        mist: "#9FACA5",
        ivory: "#FDFBF7",
        sand: "#DAD7CA",
        terracotta: "#698E8B",
        charcoal: "#55665D",
        "warm-white": "#FDFBF7",

        // Admin / Therapist panel palette (The Brain Tea ocean design system)
        ocean: "#5D768B", // Ocean Deep Blue -- primary, CTAs, active states
        "ocean-deep": "#26333D", // derived near-black shade of ocean -- body text, headings
        gold: "#E3C9A4", // Golden Driftwood -- decorative accents, badges
        blush: "#F2D9C7", // Soft Seashell Pink -- decorative accents
        surface: "#FFFCF8", // raised card surface (warm off-white)
        "surface-sunken": "#F1E4D5", // inset/pressed neumorphic surface
        ink: "#26333D", // body text
        "ink-muted": "#5C6B74", // secondary text
        "panel-ivory": "#F8EFE5", // panel canvas background
        "panel-sand": "#C8B39B", // panel borders, dividers, muted surfaces
        "panel-mist": "#E9DFD2", // panel soft dividers
        "panel-sage": "#8CA0AD", // panel muted labels
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "serif"],
        dmsans: ["var(--font-dm-sans)", "sans-serif"],
      },
      borderRadius: {
        soft: "16px",
        surface: "24px",
        panel: "32px",
      },
      boxShadow: {
        "warm-soft": "0 4px 24px rgba(46, 74, 56, 0.08)",
        // Soft sculptural neumorphism for the admin/therapist panels, tinted
        // with the panels' ocean blue so shadows read as part of that palette.
        "surface-raised":
          "8px 8px 20px rgba(93, 118, 139, 0.16), -8px -8px 20px rgba(255, 255, 255, 0.8)",
        "surface-raised-sm":
          "4px 4px 10px rgba(93, 118, 139, 0.14), -4px -4px 10px rgba(255, 255, 255, 0.75)",
        "surface-inset":
          "inset 4px 4px 10px rgba(93, 118, 139, 0.16), inset -4px -4px 10px rgba(255, 255, 255, 0.7)",
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
