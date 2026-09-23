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
        // --- Academy360 -------------------------------------------------
        // Paleta del rediseño de 2026-09-22. Editorial: crema, dorado y tinta,
        // sin gradientes de color ni sombras.
        //
        // Dos dorados y NO uno, por contraste: `oro` sobre blanco da 1.95:1, que
        // no llega al 3:1 que WCAG pide para el borde de un control, asi que
        // solo vale como relleno o como filete decorativo. Para texto y bordes
        // va `oro-texto`, que da 3.37:1 -- suficiente para texto grande
        // (>=24px), NO para un enlace de 15px.
        academy: {
          tinta: '#1F1B14',        // 17.14:1 sobre blanco
          'tinta-2': '#4A4438',    //  9.65:1 sobre blanco
          'tinta-3': '#6B6355',    //  5.93:1 sobre blanco
          crema: '#FAF6EC',        // fondo de seccion alterna
          'crema-2': '#F4EDDD',
          oro: '#DDB54E',          // relleno de boton y filetes. NO para bordes
          'oro-texto': '#AE8625',  // texto grande, bordes de control, hover
          linea: '#E2D5B8',        // divisoria decorativa
          'linea-2': '#EFE7D4',
          borde: '#968B73',        // borde de input, 3.37:1
          'sobre-oro': '#2E281D',  // texto encima del dorado, 14.61:1
          error: '#A3341F',        //  6.84:1 sobre blanco
        },
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
        // Color del texto sobre stitch-primary. Faltaba en la paleta, asi que la
        // clase text-on-primary no generaba nada y el texto caia a negro por
        // herencia: 3.25:1 sobre el dorado, por debajo del minimo de 4.5.
        // En blanco da 6.46:1. Medido el 2026-09-03, ver docs/07-auditoria-frontend.md
        "on-primary": "#ffffff",
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
        // Academy360. `display` para titulares, `ui` para todo lo demas.
        // Outfit para los titulares. Geometrica como Jost, asi que las dos
        // conviven sin que se note el salto entre titular y texto.
        //
        // OJO: Outfit NO tiene cursiva. Pedirle `italic` hace que el
        // navegador la incline por su cuenta, y en una geometrica eso
        // deforma los circulos. Lo que estaba en cursiva se distingue
        // ahora por el color dorado.
        display: ['Outfit', 'Jost', 'system-ui', 'sans-serif'],
        ui: ['Jost', '"Avenir Next"', '"Century Gothic"', 'sans-serif'],
      },
      fontSize: {
        // Escala del diseno. Solo 14, 16, 18 y 48 px coincidian con Tailwind;
        // los demas se declaran aqui para no llenar los componentes de
        // valores arbitrarios tipo text-[76px].
        'a-13': ['13px', { lineHeight: '1.4' }],
        'a-15': ['15px', { lineHeight: '1.6' }],
        'a-17': ['17px', { lineHeight: '1.6' }],
        'a-25': ['25px', { lineHeight: '1.25' }],
        'a-27': ['27px', { lineHeight: '1.25' }],
        'a-28': ['28px', { lineHeight: '1.25' }],
        'a-32': ['32px', { lineHeight: '1.3' }],
        'a-44': ['44px', { lineHeight: '1.1' }],
        'a-46': ['46px', { lineHeight: '1.1' }],
        'a-50': ['50px', { lineHeight: '1.1' }],
        'a-54': ['54px', { lineHeight: '1.1' }],
        'a-76': ['76px', { lineHeight: '1.05' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'bounce-soft': 'bounceSoft 1s infinite',
        // Academy360. El `pulse` de Tailwind cambia la opacidad, no el tamano;
        // esto es lo otro. Lento y con poco recorrido a proposito: es un logo
        // fijo en la pagina, no un aviso, y a 3 s nadie se marea.
        //
        // Se usa SIEMPRE con el prefijo `motion-safe:`, que la apaga sola en
        // cuanto el sistema pide menos movimiento. Una animacion infinita es
        // justo lo que molesta a quien lo lleva activado.
        latido: 'latido 3s ease-in-out infinite',
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
        latido: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
