/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#ffffff',
        vermilion: '#b75542',
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8eb4ff',
          400: '#5a8bff',
          500: '#3563f0',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1b338b',
          900: '#0f1e4d',
          950: '#0a1230',
        },
        ink: {
          50: '#f8fafc',
          100: '#eceef1',
          200: '#d5d8de',
          300: '#aeb4bf',
          400: '#747c89',
          500: '#555d69',
          600: '#3f4650',
          700: '#303640',
          800: '#20252d',
          900: '#101318',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 19, 24, 0.04), 0 8px 24px -20px rgba(16, 19, 24, 0.18)',
        'card-hover': '0 2px 6px rgba(16, 19, 24, 0.06), 0 16px 36px -22px rgba(16, 19, 24, 0.24)',
        glow: '0 0 0 4px rgba(53, 99, 240, 0.12)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
