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
        forest: "#2E4A38",
        sage: "#5A7A65",
        mist: "#C8D9CC",
        ivory: "#F8F4ED",
        sand: "#EBE0D0",
        terracotta: "#B5714A",
        charcoal: "#2A2A2A",
        "warm-white": "#FDFAF6",
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
