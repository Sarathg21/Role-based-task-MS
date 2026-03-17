export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aptos', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },

      // Executive UI radius (used in cards / KPI blocks)
      borderRadius: {
        executive: '2rem',
      },

      // Brand design system
      colors: {
        brand: {
          primary: '#4f46e5',   // Indigo-600
          surface: '#f8fafc',   // Slate-50
          border: '#f1f5f9',    // Slate-100
          text: '#1e293b',      // Slate-800
        },
      },
    },
  },
  plugins: [],
};