/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "main-blue": "var(--main-blue-color)",
        "main-red": "var(--main-red-color)",
      },
    },
  },
  plugins: [],
};
