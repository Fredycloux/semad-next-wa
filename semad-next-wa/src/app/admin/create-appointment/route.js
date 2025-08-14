export async function POST(req) {
  let payload;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const fd = await req.formData();
      payload = Object.fromEntries(fd);
    }
  } catch (e) {
    return Response.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  // ... usa payload.patient, payload.phone, payload.date, payload.time,
  // payload.dentist y payload.reason como ya lo tenías.
}
