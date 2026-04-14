/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tech-blue': {
          DEFAULT: '#0066FF',
          dark: '#F0F5FF', // 浅蓝色背景
          light: '#E6F7FF',
          accent: '#1890FF',
          text: '#1F2937', // 深灰色文字
        },
      },
      backgroundImage: {
        'tech-grid': "linear-gradient(to right, rgba(0, 102, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 102, 255, 0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
}

