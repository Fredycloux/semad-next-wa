import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function POST(req){
  try{
    const { fullName, phone, document, date, time, dentist, reason } = await req.json()
    if(!fullName || !phone || !date || !time) return new Response(JSON.stringify({ error:'Faltan campos' }), { status:400 })
    const patient = await prisma.patient.upsert({
      where: { document: document ?? '' },
      update: { fullName, phone, document },
      create: { fullName, phone, document }
    })
    const iso = new Date(`${date}T${time}:00.000Z`) // guardar en UTC
    const ap = await prisma.appointment.create({
      data: { date: iso, reason, dentist, patientId: patient.id }
    })
    return new Response(JSON.stringify({ ok:true, id: ap.id }), { status:200 })
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status:500 })
  }
}
