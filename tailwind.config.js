/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        correct: '#10b981',
        present: '#f59e0b',
        absent: '#ef4444',
        border: 'rgba(255,255,255,0.05)',
        dark: '#09090b',
        accent: '#8b5cf6',
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(139, 92, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
