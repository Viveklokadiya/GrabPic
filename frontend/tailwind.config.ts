import type { Config } from "tailwindcss";

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
        primary: "#4848e5",
        "rose-accent": "#e54885",
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
