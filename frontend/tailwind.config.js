/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0F1115',
        surface: '#171A21',
        border: '#262B36',
        textPrimary: '#E6E8EE',
        textSecondary: '#9AA3B2',
        accent: '#4F8CFF',
        pass: '#2FBF71',
        warn: '#F5A524',
        fail: '#F04D4D',
        needsReview: '#A78BFA'
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif']
      }
    },
  },
  plugins: [],
}
