import { tituloLogo } from '@/config/fonts';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'
import { InfoEmpresa as empresa } from "@/config/config";
export const PageNotFound = () => {
  return (
    <div className='flex flex-col-reverse md:flex-row h-[600px] w-full justify-center items-center align-top'>
        <div className='text-center px-5 mx-5'> 
            <h2 className={`${tituloLogo.className} antialiased text-9xl`}>404</h2>
            <p className='font-semibold text-xl'>Ocurrió un error, lo sentimos mucho, esta página no existe.</p>
            <p className='font-light'>
                <span> 
                    <Link
                    href="/"
                    className={`${tituloLogo.className} text-red-700 font-bold underline hover:underline transition-all hover:text-red-400`}>
                         Regresar al inicio
                    </Link>
                </span>
            </p>
        </div>
        <div className='px-5 mx-5 '>
            <Image 
            src={empresa.imagenesPlaceholder.notfound}
            alt='Starman'
            className='p-5 sm:p-0 rounded-lg'
            width={550}
            height={550}
            />

        </div>

    </div>
  )
};


