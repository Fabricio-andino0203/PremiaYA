/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#F8F5FD',
        ink: '#241B35',
        brand: {
          50: '#F6F0FF',
          100: '#EDE2FF',
          200: '#DCC8FF',
          400: '#9D5CF0',
          500: '#8343E3',
          600: '#6C2BD9',
          700: '#5A21B8',
          800: '#471A92',
        },
        sun: '#FF8A00',
        accent: '#FF4DA6',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '70%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fall': {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(105vh) rotate(540deg)', opacity: '0.6' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.45s cubic-bezier(.2,1.2,.4,1) both',
        'slide-up': 'slide-up 0.4s ease-out both',
        'fall': 'fall 2.8s linear forwards',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
