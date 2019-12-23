const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      maxHeight: {
        '3/4': '75vh',
      },
    },
  },
  variants: {},
  plugins: [],
}
