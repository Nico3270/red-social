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
    if (!negocioId) {
        return null;
    }

    const información = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: {
            nombre: true,
            slug: true,
            telefonoContacto: true,
        }
    });

    if (!información) {
        return null;
    }

    return {
        ok: true,
        message: "Información del negocio obtenida correctamente",
        nombreNegocio: información.nombre,
        telefonoNegocio: información.telefonoContacto ?? undefined,
        slugNegocio: información.slug,
    };
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
