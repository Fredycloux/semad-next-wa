"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/dentists", label: "Odontólogos", disabled: true },
  { href: "/admin/procedures", label: "Procedimientos", disabled: true },
  { href: "/admin/inventory", label: "Inventario", disabled: true },
  { href: "/admin/billing", label: "Facturación", disabled: true },
  { href: "/admin/reports", label: "Reportes", disabled: true },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-3 h-14 flex items-center gap-4">
        <Link href="/admin/agenda" className="flex items-center gap-2">
          <Image src="/logo_semad.png" alt="SEMAD" width={28} height={28} />
          <span className="font-semibold">SEMAD</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.disabled ? "#" : l.href}
              className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 ${
                pathname.startsWith(l.href) ? "bg-gray-100 font-medium" : ""
              } ${l.disabled ? "opacity-50 pointer-events-none" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <Link
            href="/admin/create-appointment"
            className="rounded-lg bg-violet-600 text-white px-3 py-1.5 text-sm hover:opacity-95"
          >
            Nueva cita
          </Link>
        </div>
      </div>
    </header>
  );
}
