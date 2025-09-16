import prisma from "@/lib/prisma";


interface InfoNegociowhatsapp {
    ok: boolean, 
    message: string,
    nombreNegocio?: string,
    telefonoNegocio?: string,
    slugNegocio?: string,
    fechaHoraInicio?: string
}

export async function getInfoNegocioWhatsapp(negocioId: string): Promise<InfoNegociowhatsapp | null> {
    // Aquí deberías implementar la lógica para obtener la información del negocio
    // Por ejemplo, podrías hacer una consulta a tu base de datos o API
    // Este es un ejemplo básico que retorna un objeto simulado

    if (!negocioId) {
        return { ok: false, message: "ID de negocio no proporcionado" };
    }

    const información = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: {
            nombre: true,
            slug: true,
            telefonoContacto: true,
        }
    });

    // Simulación de datos obtenidos
    const negocioData = {
        ok: true,
        message: "Información del negocio obtenida correctamente",
        nombreNegocio: información?.nombre || "Negocio Desconocido",
        telefonoNegocio: información?.telefonoContacto || "+573182293083",
        slugNegocio: información?.slug || "negocio-desconocido",
    };

    return negocioData;
}

interface ReservaInformacion {
    ok:boolean, 
    message:string,
    nombre_cliente?: string,
    telefono_cliente?:string,
    descripcion?:string,
    fecha_hora?:Date,
    negocioId: string
}

export async function getInformacionReserva(idReserva:string):Promise<ReservaInformacion> {
    if(!idReserva) {
        return {
            ok: false, 
            message: "El id de la reserva es obligatorio",
            negocioId:""
        }
    }
    try {
        const infoReserva = await prisma.reservation.findUnique({
            where:{id: idReserva},
            select: {
                nombre:true,
                telefono: true,
                notas:true,
                fechaHoraInicio:true,
                negocioId:true,             
            }
        })

        // console.log({infoReserva}, "getInfoNegocioWhatsapp");
        
        if(infoReserva){
            return {
                ok: true,
                message: "Información obtenida exitosamente",
                nombre_cliente : infoReserva.nombre,
                telefono_cliente: infoReserva.telefono,
                descripcion: infoReserva.notas || "", 
                fecha_hora: infoReserva.fechaHoraInicio,
                negocioId: infoReserva.negocioId
            }
        }

        // 👇 este return faltaba
        return {
            ok: false,
            message: "No se encontró información de la reserva",
            negocioId:""
        }

    } catch (error) {
        console.warn(error)
        return {
            ok:false,
            message:"Ocurrió un error al tratar de obtener la información de la reserva",
            negocioId:""
        }
    }
}
