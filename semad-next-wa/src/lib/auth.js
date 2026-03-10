// src/lib/auth.js
// Helpers para verificar autenticación en API Routes
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Verifica que el request tenga sesión activa.
 * Si no, retorna un Response 401. Si sí, retorna null (continuar).
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  return null;
}

/**
 * Verifica que el request tenga sesión activa Y que el rol esté en la lista.
 * roles: string[] — ej. ["ADMIN"] o ["ADMIN", "ODONTOLOGO"]
 */
export async function requireRole(roles) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  if (!roles.includes(session.user.role)) {
    return Response.json({ ok: false, error: "Acceso denegado" }, { status: 403 });
  }
  return null;
}
