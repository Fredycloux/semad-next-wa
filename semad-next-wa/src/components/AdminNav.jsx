// src/components/AdminNav.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const items = [
  { href: "/admin/agenda",     label: "Agenda",         match: ["/admin/agenda"] },
  { href: "/admin/dentists",   label: "Odontólogos",    match: ["/admin/dentists"] },
  // 👇 Historias también cubre /admin/patients/*
  { href: "/admin/historias",  label: "Historias",      match: ["/admin/historias", "/admin/patients"] },
  { href: "/admin/procedures", label: "Procedimientos", match: ["/admin/procedures"] },
  { href: "/admin/inventory",  label: "Inventario",     match: ["/admin/inventory"] },
  { href: "/admin/invoices",   label: "Facturación",    match: ["/admin/invoices"] },
  { href: "/admin/reports",    label: "Reportes",       match: ["/admin/reports"] },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
      <div className="max-w-5xl mx-auto flex items-center gap-4 p-3">
        {/* Logo -> Agenda (sin prefetch) */}
        <Link href="/admin/agenda" prefetch={false} className="flex items-center gap-2 shrink-0">
          <Image src="/logo_semad.png" alt="SEMAD" width={28} height={28} />
          <span className="font-semibold">SEMAD</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {items.map((it) => {
            const active = it.match.some((m) => pathname?.startsWith(m));
            // Solo desactivamos prefetch en Agenda para evitar snapshot viejo
            const disablePrefetch = it.href === "/admin/agenda";
            return (
              <Link
                key={it.href}
                href={it.href}
                prefetch={disablePrefetch ? false : undefined}
                aria-current={active ? "page" : undefined}
                className={`px-2 py-1 rounded-md ${
                  active
                    ? "bg-violet-100 text-violet-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          {/* Nueva cita (sin prefetch) */}
          <Link
            href="/admin/create-appointment"
            prefetch={false}
            className="rounded-lg bg-violet-600 text-white text-sm px-3 py-1.5"
          >
            Nueva cita
          </Link>
        </div>
      </div>
    </header>
  );
}
