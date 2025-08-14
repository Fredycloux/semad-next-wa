// src/app/layout.jsx
import './globals.css';

export const metadata = {
  title: 'SEMAD · Consultorio Odontológico',
  description: 'Sistema de gestión SEMAD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="body-soft">{children}</body>
    </html>
  );
}
