import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === CORES DO LAYOUT ANTIGO ===
        "surface-container-low": "#fff1eb",
        "error-container": "#ffdad6",
        "primary-container": "#4f3a30",
        "outline-variant": "#d3c3bd",
        "on-secondary-fixed-variant": "#882004",
        "on-surface-variant": "#4f4540",
        "surface-container-highest": "#fcdccd",
        "background": "#fff8f6", // Mantém o fundo bege para páginas antigas
        "surface-container": "#ffeae1",
        "primary-fixed": "#fcdccd",
        "on-surface": "#28180f",
        "on-tertiary-fixed": "#1d1c17",
        "surface-tint": "#71594e",
        "secondary": "#a9371b",
        "error": "#ba1a1a",
        "on-background": "#28180f",
        "tertiary-fixed-dim": "#cac6be",
        "surface-dim": "#f4d3c5",
        "on-primary-container": "#c1a497",
        "on-secondary": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "inverse-surface": "#3f2c23",
        "primary-fixed-dim": "#dfc0b2",
        "on-tertiary-container": "#adaaa2",
        "secondary-fixed-dim": "#ffb4a2",
        "on-primary-fixed-variant": "#584238",
        "on-tertiary-fixed-variant": "#484741",
        "on-primary": "#ffffff",
        "tertiary-fixed": "#e6e2da",
        "on-secondary-container": "#6a1400",
        "inverse-on-surface": "#ffede6",
        "surface-bright": "#fff8f6",
        "surface-container-high": "#ffe2d6",
        "inverse-primary": "#dfc0b2",
        "tertiary": "#2a2924",
        "primary": "#4F3A30",
        "on-secondary-fixed": "#3c0700",
        "tertiary-container": "#403f39",
        "secondary-container": "#fd7452",
        "on-error-container": "#93000a",
        "surface": "#fff8f6",
        "on-tertiary": "#ffffff",
        "on-error": "#ffffff",
        "on-primary-fixed": "#28180f",
        "secondary-fixed": "#ffdad2",
        "surface-variant": "#fcdccd",
        "outline": "#81746f",

        // === CORES DO LAYOUT NOVO (BRUTALISTA) ===
        "charcoal": "#1A1C19",
        "lime": "#D5F066",
        "graytext": "#6B6B6B"
      },
      fontFamily: {
        // Fontes antigas
        "headline": ["Manrope", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"],
        // Fonte nova
        "sans": ["Inter", "sans-serif"],
      },
      borderRadius: {
        // O layout antigo modificou o padrão do Tailwind
        "DEFAULT": "0.125rem",
        "lg": "0.25rem", 
        "xl": "0.5rem", 
        "full": "0.75rem",
        // Adicionamos esta classe específica para o layout novo
        "circle": "9999px" 
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
};

export default config;