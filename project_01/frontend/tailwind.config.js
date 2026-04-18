/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tech-blue': {
          DEFAULT: '#3B82F6',
          dark: '#1E40AF',
          light: '#60A5FA',
          accent: '#F59E0B',
          text: '#0F172A',
        },
        'primary': '#3B82F6',
        'primary-light': '#60A5FA',
        'accent': '#F59E0B',
      },
      backgroundImage: {
        'tech-grid': "linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
}
