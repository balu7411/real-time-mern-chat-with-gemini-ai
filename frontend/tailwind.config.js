/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian: {
          DEFAULT: "#07090e",
          900: "#0b0e17",
          800: "#101422",
          700: "#181f33",
          600: "#222a42",
        },
        panel: "#0e131f",
        panel2: "#141b2d",
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          glow: "rgba(59, 130, 246, 0.25)",
        },
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15), transparent 70%)',
        'radial-accent': 'radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.12), transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
