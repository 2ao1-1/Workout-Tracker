/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./src/js/**/*.js", "/pages/*.html"],
  theme: {
    extend: {
      colors: {
        main: "#242524",
        secondary: "#eaeae4",
      },
      backgroundImage: {
        "custom-gradient":
          "linear-gradient(to right bottom, #e8eae3, #c3bfba, #9c9795, #767171, #504e4f)",
      },
      fontFamily: {
        inter: "Inter",
      },
      fontSize: {
        xxs: "0.6rem",
      },
    },
  },
  plugins: [],
};
