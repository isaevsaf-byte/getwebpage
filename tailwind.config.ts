import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f7f3ec",
        surface: "#f0ece4",
        "surface-alt": "#efeae0",
        border: "#e8e3d8",
        "border-mid": "#ddd8ce",
        ink: "#1a1612",
        "ink-mid": "#2e2820",
        secondary: "#6b6358",
        muted: "#9a9188",
        eyebrow: "#c87850",
        accent: "#a04020",
        "accent-hover": "#b84a28",
        "ink-bg": "#1a1612",
        "ink-border": "#2e2820",
        "ink-text": "#f0ece4",
        "ink-sub": "#c8c0b6",
        "ink-dim": "#6b6358",
        "ink-divider": "oklch(0.26 0.010 62)",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-dm-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-dm-mono)", "Courier New", "monospace"],
      },
      fontSize: {
        "fluid-xs": "clamp(0.75rem, 0.7rem + 0.2vw, 0.8125rem)",
        "fluid-sm": "clamp(0.875rem, 0.82rem + 0.25vw, 0.9375rem)",
        "fluid-base": "clamp(1rem, 0.95rem + 0.25vw, 1.0625rem)",
        "fluid-lg": "clamp(1.125rem, 1.05rem + 0.35vw, 1.25rem)",
        "fluid-xl": "clamp(1.25rem, 1.1rem + 0.65vw, 1.5rem)",
        "fluid-2xl": "clamp(1.5rem, 1.25rem + 1.2vw, 2rem)",
        "fluid-3xl": "clamp(1.875rem, 1.4rem + 2vw, 2.5rem)",
        "fluid-4xl": "clamp(2.25rem, 1.5rem + 3.5vw, 3.5rem)",
        "fluid-5xl": "clamp(2.75rem, 1.5rem + 5.5vw, 5rem)",
        "fluid-6xl": "clamp(3.5rem, 1.5rem + 8vw, 6.5rem)",
        "hero": "clamp(3.4rem, 8vw, 7.5rem)",
        "display": "clamp(2.2rem, 5vw, 3.8rem)",
        "display-md": "clamp(2rem, 4.5vw, 3.2rem)",
        "display-sm": "clamp(1.8rem, 4vw, 3rem)",
        "display-xs": "clamp(1.5rem, 2.5vw, 2.25rem)",
      },
      lineHeight: {
        tight: "1.1",
        snug: "1.3",
        relaxed: "1.65",
        loose: "1.85",
      },
      letterSpacing: {
        tighter: "-0.025em",
        tight: "-0.02em",
        normal: "0em",
        wide: "0.04em",
        wider: "0.08em",
        widest: "0.12em",
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        lg: "6px",
        xl: "12px",
      },
      maxWidth: {
        site: "1200px",
        prose: "580px",
        heading: "700px",
      },
      spacing: {
        "section": "120px",
        "section-sm": "80px",
      },
    },
  },
  plugins: [],
};

export default config;
