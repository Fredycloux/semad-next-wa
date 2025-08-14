import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

export async function GET(){
  try{
    const users = [
      { username:'admin', name:'Admin', role:'ADMIN', pass:'admin123' },
      { username:'odontologo', name:'Odontólogo', role:'ODONTOLOGO', pass:'odontologo123' },
      { username:'recepcion', name:'Recepción', role:'RECEPCION', pass:'recepcion123' },
    ]
    for(const u of users){
      const hash = await bcrypt.hash(u.pass, 10)
      await prisma.user.upsert({
        where:{ username:u.username },
        update:{},
        create:{ username:u.username, name:u.name, role:u.role, passwordHash: hash }
      })
    }
    await prisma.procedure.createMany({
      data:[
        { code:'OD001', name:'Consulta inicial', price:60000 },
        { code:'OD010', name:'Profilaxis', price:90000 },
        { code:'OD020', name:'Resina (obturación)', price:180000 },
        { code:'OD030', name:'Endodoncia', price:750000 },
        { code:'OD040', name:'Extracción', price:220000 },
        { code:'OD050', name:'Corona', price:1200000 },
      ],
      skipDuplicates:true
    })
    return new Response(JSON.stringify({ ok:true }), { status:200 })
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status:500 })
  }
}
