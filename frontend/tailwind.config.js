/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        okx: {
          bg: {
            primary: '#000000',
            secondary: '#0d0d0d',
            tertiary: '#141414',
            hover: '#1a1a1a',
          },
          border: {
            DEFAULT: '#2a2a2a',
            light: '#333333',
          },
          accent: {
            DEFAULT: '#00c087',
            hover: '#00d896',
            light: 'rgba(0, 192, 135, 0.1)',
          },
          text: {
            primary: '#ffffff',
            secondary: '#a1a1aa',
            muted: '#71717a',
          },
          up: '#00c087',
          down: '#ff4d4f',
          warning: '#f0a93c',
          info: '#2e9fff',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
