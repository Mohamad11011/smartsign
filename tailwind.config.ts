import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a93c8",
          hover: "#2aa3d8",
          active: "#1582b3",
          muted: "#1a93c8",
        },
        surface: {
          DEFAULT: "#060714",
          light: "#0a0c1a",
          card: "#0d0f22",
          border: "#12152a",
        },
        accent: {
          DEFAULT: "#bddbed",
          muted: "#8bb8d4",
        },
      },
      boxShadow: {
        "primary-glow": "0 0 0 1px #1a93c8",
        "primary-glow-lg": "0 0 12px rgba(26, 147, 200, 0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
