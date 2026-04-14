import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#000000",
        charcoal: "#1A1C19", // Cor escura predominante nas caixas e rodapé
        lime: "#D5F066",     // Verde-lima do botão mobile
        graytext: "#6B6B6B",
        eletroGreen: "#16a34a", // Verde característico da marca
        eletroLight: "#D5F066", // Um fundo verde bem clarinho para contraste
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;