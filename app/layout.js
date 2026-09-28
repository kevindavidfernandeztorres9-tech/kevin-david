import './globals.css';

export const metadata = {
  title: 'Dwell en tiempo real',
  description: 'Tiempo por seccion y cuellos de botella de tus landing pages',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
