/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold:    { DEFAULT: '#c9a84c', light: '#e8c96a', dim: '#8a6e30', dark: '#3d2e10' },
        parch:   { DEFAULT: '#d4bc8a', light: '#f0e6c8', dim: '#7a6a4a' },
        crimson: { DEFAULT: '#8b1a1a', mid: '#b22222', light: '#d44040' },
        forest:  { DEFAULT: '#1a4a2a', mid: '#2d6e42', light: '#3d9e5a' },
        sapphire:{ DEFAULT: '#1a3060', mid: '#2a4a90', light: '#4a70c0' },
        bg: {
          deep:   '#0d0a06',
          panel:  '#13100a',
          card:   '#1a1510',
          raised: '#221c13',
          border: '#3d2e10',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        sans:    ['Crimson Pro', 'Georgia', 'serif'],
      },
      borderRadius: { xl: '16px', '2xl': '20px' },
      boxShadow: {
        gold:   '0 0 16px rgba(201,168,76,0.2)',
        'gold-lg': '0 0 32px rgba(201,168,76,0.3)',
        inset:  'inset 0 1px 0 rgba(201,168,76,0.1)',
      }
    }
  },
  plugins: []
}
