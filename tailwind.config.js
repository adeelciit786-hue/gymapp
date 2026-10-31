export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['"Space Grotesk"', 'sans-serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        bg2: 'rgb(var(--bg2) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        mute: 'rgb(var(--mute) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
      },
      boxShadow: { glow: '0 0 40px -8px rgb(255 112 73 / 0.55)' },
    },
  },
  plugins: [],
}
