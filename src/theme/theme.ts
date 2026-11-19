import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: '#0d9488', // Teal-600
      // Light tints for chip and button backgrounds (sx: 'primary.50' / 'primary.100', NAB-116).
      // MUI keeps these extra shades when it builds the palette.
      50: '#f0fdfa', // Teal-50
      100: '#ccfbf1', // Teal-100
    },
    secondary: {
      main: '#f59e0b', // Amber-500
    },
    background: {
      default: '#F9FAFB', // Light gray background
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

export default theme;
