/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#151a23",
        panel2: "#1c2230",
        accent: "#3b82f6",
      },
    },
  },
  plugins: [],
};
