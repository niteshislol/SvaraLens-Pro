/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F8FAFC',
        panel: '#FFFFFF',
        panelSecondary: '#F4F7FB',
        border: '#E7ECF3',
        mainText: '#172033',
        secondaryText: '#64748B',
        primaryBlue: '#3867E8',
        blueBg: '#EEF4FF',
        purpleAccent: '#7856D9',
        purpleBg: '#F3EEFF',
        successGreen: '#16A36A',
        successBg: '#EAF8F0',
        warningAmber: '#D99520',
        warningBg: '#FFF7E8',
        criticalRed: '#D94848',
        criticalBg: '#FFF0F0',
        waveformBlue: '#347FE8',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
