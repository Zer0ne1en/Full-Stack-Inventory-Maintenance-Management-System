/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090C',
          900: '#0C0F14',
          850: '#11151C',
          800: '#161B24',
          700: '#1E2530',
          600: '#2A3342',
          500: '#3A4657',
          400: '#6B7787',
          300: '#8B97A8',
          200: '#AEB9C9',
          100: '#DCE3EE',
          50: '#F2F5FA',
        },
        ember: {
          300: '#FFC24D',
          400: '#F5A524',
          500: '#E08C0A',
          600: '#C77E12',
          900: '#2A1D05',
        },
        mint: {
          300: '#4ED9AE',
          400: '#2FBF8F',
          500: '#1F9C75',
          900: '#062A20',
        },
        rust: {
          300: '#FF8A80',
          400: '#E85D5D',
          500: '#C74444',
          900: '#2B0C0C',
        },
        azure: {
          300: '#8FB8FF',
          400: '#5B9DFF',
          500: '#3E7BE0',
          900: '#0A1B33',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.7)',
        ember: '0 0 0 1px rgba(245,165,36,0.4), 0 8px 24px -8px rgba(245,165,36,0.45)',
        pop: '0 24px 60px -20px rgba(0,0,0,0.85)',
      },
      animation: {
        'fade-up': 'fadeUp .42s cubic-bezier(.16,1,.3,1) both',
        'fade-in': 'fadeIn .3s ease-out both',
        'scale-in': 'scaleIn .18s cubic-bezier(.16,1,.3,1) both',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(.97) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.45' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
};
