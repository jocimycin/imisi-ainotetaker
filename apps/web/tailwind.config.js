/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          400: '#7F77DD',
          600: '#534AB7',
          700: '#463FA0',
          800: '#3C3489',
          900: '#26215C',
        },
        surface: {
          DEFAULT: '#F4F3EF',
          card:    '#FFFFFF',
          hover:   '#F0EFE9',
        },
        sidebar: {
          bg:          '#1E1B33',
          border:      '#2D2947',
          nav:         '#A29BBE',
          navActive:   '#FFFFFF',
          navActiveBg: '#2E2B4A',
          text:        '#7A7395',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 1px 3px 0 rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
