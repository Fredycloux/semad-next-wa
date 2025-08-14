# SEMAD (Next.js) con WhatsApp automático

Este paquete está listo para **subir a Vercel** (gratis) y enviar **recordatorios automáticos por WhatsApp** el día anterior a cada cita.

## Qué necesitarás
- Cuenta en **GitHub** y **Vercel**
- Configurar **Vercel Postgres**
- Tener una cuenta de **WhatsApp Business (Meta Cloud API)** con:
  - `PHONE_NUMBER_ID`
  - `ACCESS_TOKEN` (largo)
  - Plantilla aprobada llamada `cita_recordatorio`

## Pasos rápidos
1) Sube esta carpeta a un repositorio en tu GitHub (puedes subir archivos desde la web de GitHub).
2) En Vercel: **Import Project** → selecciona tu repo.
3) En la sección **Storage**, agrega **Vercel Postgres** (esto creará `DATABASE_URL`).
4) En **Environment Variables** agrega:
   - `NEXTAUTH_SECRET` → una cadena larga aleatoria
   - `META_WA_PHONE_ID` → (de Meta)
   - `META_WA_TOKEN` → (de Meta)
   - `NEXT_PUBLIC_BASE_URL` → la URL que te da Vercel (ej: `https://semad.vercel.app`)
5) Deploy.

## Inicializar (una vez)
- Abre `https://TU-DOMINIO/api/seed` → crea usuarios demo y procedimientos.

## Crear citas que se recordarán
- Entra a `https://TU-DOMINIO/login` con:
  - `admin / admin123` (o `odontologo` / `recepcion`)
- Ve a `https://TU-DOMINIO/admin/agenda` y crea pacientes + citas.
  - **Teléfono**: usa formato **57300...**

## Activar recordatorios automáticos (Cron)
- En Vercel → tu proyecto → **Settings → Cron Jobs → Add Cron Job**
  - **Path**: `/api/wa/auto`
  - **Schedule**: `0 14 * * *`  (2:00 PM UTC = 9:00 AM Bogotá)
- ¡Listo! Todos los días a esa hora, se enviarán los mensajes de WhatsApp a las citas del **día siguiente**.

## Nota de privacidad
- Asegúrate de tener consentimiento de tus pacientes (opt‑in) para recibir mensajes de WhatsApp y usar plantillas aprobadas.
