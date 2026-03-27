/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'plus-jakarta-sans': ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Azul como color principal (reemplaza maily)
        maily: {
          light: '#dbeafe',
          DEFAULT: '#2563eb',
          dark: '#1e40af',
          accent: '#f97316', // Naranja como acento
        },
        // Naranja como color de acento
        orange: {
          light: '#ffedd5',
          DEFAULT: '#f97316',
          dark: '#ea580c',
        },
        // --- Stitch Design Colors ---
        "secondary-fixed": "#e5e2e1",
        "on-surface-variant": "#524535",
        "surface-container-lowest": "#ffffff",
        "surface-container-highest": "#e4e2dd",
        "secondary": "#5f5e5e",
        "surface-container-low": "#f5f3ee",
        "secondary-container": "#e2dfde",
        "surface-bright": "#fbf9f4",
        "tertiary-fixed": "#b8eaff",
        "tertiary-container": "#52d0f9",
        "on-tertiary-fixed": "#001f28",
        "tertiary-fixed-dim": "#58d5fe",
        "primary-fixed-dim": "#ffb95a",
        "secondary-fixed-dim": "#c8c6c5",
        "primary-fixed": "#ffddb6",
        "surface-container-high": "#eae8e3",
        "on-secondary-fixed": "#1c1b1b",
        "surface-dim": "#dbdad5",
        "on-surface": "#1b1c19",
        "stitch-primary": "#845400",
        "inverse-surface": "#30312e",
        "inverse-on-surface": "#f2f1ec",
        "on-primary-container": "#704700",
        "on-secondary-container": "#636262",
        "tertiary": "#006780",
        "surface-container": "#f0eee9",
        "inverse-primary": "#ffb95a",
        "surface-tint": "#845400",
        "outline-variant": "#d6c3b0",
        "error-container": "#ffdad6",
        "surface": "#fbf9f4",
        "surface-variant": "#e4e2dd",
        "primary-container": "#ffb347",
        "error": "#ba1a1a",
        "outline": "#847463"
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        "plus-jakarta-sans": ["Plus Jakarta Sans", "sans-serif"],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'bounce-soft': 'bounceSoft 1s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
