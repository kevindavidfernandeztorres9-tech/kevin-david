// Permite instalar el panel como app en la laptop (Chrome/Edge: "Instalar app").
export default function manifest() {
  return {
    name: 'Dwell en tiempo real',
    short_name: 'Dwell',
    description: 'Tiempo por sección y cuellos de botella de tus landing pages',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d0d',
    theme_color: '#2a78d6',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
