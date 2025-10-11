/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        facebook: {
          primary: '#4267B2',
          light: '#8b9dc3',
          dark: '#29487d',
        },
      },
    },
  },
  plugins: [],
}