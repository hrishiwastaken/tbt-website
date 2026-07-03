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
        "warm-sand": "#DAD7CA",      // primary light bg
        "muted-sage": "#9FACA5",     // secondary bg / divider
        "warm-tan": "#DCCDB2",       // card bg
        "teal-sage": "#698E8B",      // buttons, links, accents
        "forest-slate": "#55665D",   // headings / labels
        "near-black": "#202623",     // body text
        
        // Legacy compatibility mappings
        forest: "#698E8B",
        sage: "#9FACA5",
        mist: "#9FACA5",
        ivory: "#DAD7CA",
        sand: "#DCCDB2",
        terracotta: "#698E8B",
        charcoal: "#55665D",
        "warm-white": "#FFFFFF",
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "serif"],
        dmsans: ["var(--font-dm-sans)", "sans-serif"],
      },
      boxShadow: {
        "warm-soft": "0 4px 24px rgba(46, 74, 56, 0.08)",
      },
    },
  },
  plugins: [],
};
