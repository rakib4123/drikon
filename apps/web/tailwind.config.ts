import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Drikon palette
        ink: {
          50:  '#f5f6fa',
          100: '#e6e8ee',
          200: '#c0c7d8',
          300: '#a8b1c5',
          400: '#8590a8',
          500: '#6c7591',
          600: '#4d5572',
          700: '#363c54',
          800: '#232842',
          900: '#16192a',
          950: '#0c0e1a',
        },
        electric: {
          cyan:   '#22d3ee',
          violet: '#a855f7',
          deep:   '#06070d',
        },
      },
      fontFamily: {
        // Display + body. Avoid Inter / Roboto / Space Grotesk (overused).
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans:    ['"Geist"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'drikon-gradient': 'linear-gradient(135deg, #0e7490 0%, #22d3ee 45%, #a855f7 100%)',
        'drikon-mesh':
          'radial-gradient(at 18% 12%, rgba(34,211,238,0.16) 0px, transparent 50%), radial-gradient(at 82% 88%, rgba(168,85,247,0.16) 0px, transparent 50%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
