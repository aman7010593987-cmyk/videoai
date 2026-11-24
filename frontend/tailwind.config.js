/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VIRA AI Brand Colors
        brand: {
          black: '#050508',
          navy: '#0a0a1a',
          dark: '#0d0d1f',
          surface: '#12122a',
          card: '#16163a',
          border: '#1e1e4a',
          purple: '#7c3aed',
          'purple-light': '#9333ea',
          'purple-bright': '#a855f7',
          blue: '#3b82f6',
          'blue-electric': '#06b6d4',
          accent: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0d0d1f 0%, #12122a 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(59,130,246,0.1) 100%)',
      },
      boxShadow: {
        'brand': '0 0 30px rgba(124, 58, 237, 0.3)',
        'brand-sm': '0 0 15px rgba(124, 58, 237, 0.2)',
        'glow': '0 0 40px rgba(124, 58, 237, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient': 'gradient 4s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
