/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        creme: '#F4EFE8',
        papier: '#FBF8F3',
        encre: '#1B1A17',
        gris: '#6B655C',
        trait: 'rgba(27,26,23,0.10)',
        or: { DEFAULT: '#A8875A', clair: '#E9DCC6', fonce: '#7A603C' },
        sauge: { DEFAULT: '#5E7257', clair: '#E3E9DE' },
        terre: { DEFAULT: '#A9502F', clair: '#F3DED3' },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Switzer', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '8px', lg: '12px' },
      boxShadow: {
        carte: '0 1px 2px rgba(60,45,25,.06), 0 4px 16px rgba(60,45,25,.05)',
        flot: '0 10px 40px rgba(60,45,25,.16)',
      },
    },
  },
  plugins: [],
};
