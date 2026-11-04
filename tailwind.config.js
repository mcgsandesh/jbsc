/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ea580c", // JBSC ब्रँडसाठी फेस्टिव्ह ऑरेंज/भगवा शेड
        secondary: "#0284c7",
      },
    },
  },
  plugins: [],
}