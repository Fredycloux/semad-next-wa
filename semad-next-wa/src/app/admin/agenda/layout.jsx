// Archivo del lado del servidor (no pongas "use client")
export const metadata = {
  title: "Agendamiento de citas | SEMAD",
};

// Si también pusiste "export const dynamic = 'force-dynamic'" en la page,
// muévelo aquí:
export const dynamic = 'force-dynamic';

export default function AgendaLayout({ children }) {
  return <>{children}</>;
}
