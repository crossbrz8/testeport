/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      'primary': '#0E0E0E',
      'secondary': '#C0CAC2',
      'gray': '#5C665E',
    },
    fontFamily: {
      'helvetica': ['HelveticaNeue', 'sans-serif'],
      'martianmono': ['MartianMono' , 'sans-serif'],
      'roslindale': ['Roslindale'],
    },
    maxWidth: {
      '4xl': 'clamp(992px, 100vw, 1920px)',
    },
    fontSize: {
      '7xl': ['clamp(70px, calc(var(--size-container) / (1440 / 140)), 140px)', { 
        lineHeight: 'clamp(84px, calc(var(--size-container) / (1440 / 168)), 168px)' 
      }],
      '6xl': ['clamp(50px, calc(var(--size-container) / (1440 / 100)), 100px)', { 
        lineHeight: 'clamp(60px, calc(var(--size-container) / (1440 / 120)), 120px)' 
      }],
      '5xl': ['5rem', { lineHeight: '4.5rem' }],
      '4xl': ['clamp(32px, calc(var(--size-container) / (1440 / 64)), 64px)', { 
        lineHeight: 'clamp(48px, calc(var(--size-container) / (1440 / 96)), 96px)' 
      }],
      '2xl': ['1.125rem', { lineHeight: '1.4625rem' }], // 18px 23.4px
      'sm': ['1rem', { lineHeight: '1.3rem' }], // 16px 20.8px
      'xs2': ['0.875rem', { lineHeight: '1.1375rem' }], // 14px 18.2px
      'xs' : ['0.625rem', { lineHeight: '1.25rem' }],
    },
    lineHeight: {
      'xs': '0.8125rem',
    },
    extend: {
      keyframes: {
        'slide-in-out': {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'slide-out-in': {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(100%)' },
          '50.01%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      },
      animation: {
        'slide-in-out': 'slide-in-out 0.8s cubic-bezier(.18,.43,.01,.96)',
        'slide-out-in': 'slide-out-in 0.8s cubic-bezier(.18,.43,.01,.96)'
      }
    },
  },
  plugins: [],
}

