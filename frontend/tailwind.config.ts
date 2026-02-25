import type { Config } from "tailwindcss";

const brandPalette = {
  50: "#f2f2ff",
  100: "#e6e6ff",
  200: "#ceceff",
  300: "#ababff",
  400: "#7c7cf2",
  500: "#4848e5",
  600: "#3f3fd4",
  700: "#3434b3",
  800: "#2e2e91",
  900: "#292973",
  950: "#191949"
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: brandPalette[500],
        "primary-light": brandPalette[50],
        "primary-dark": brandPalette[700],
        "rose-accent": brandPalette[500],
        blue: brandPalette,
        indigo: brandPalette,
        violet: brandPalette,
        purple: brandPalette,
        teal: brandPalette,
        cyan: brandPalette,
        sky: brandPalette,
        pink: brandPalette,
        fuchsia: brandPalette,
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px"
      },
      maxWidth: {
        page: "1120px"
      },
      animation: {
        rise: "rise 180ms ease-out"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
