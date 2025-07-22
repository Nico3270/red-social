import {  PacificoFont, titulo2 } from '@/config/fonts'
import { CurrencyFormat } from '@/config/utils'


import React from 'react'

// Se recibe un objeto de propiedades pero se desestructura `value`
export const Precio = ({ value }: { value: number }) => {
  return (
    <span className={`text-2xl text-gray-800 font-bold ${titulo2.className}`}>
      {CurrencyFormat(value)}
    </span>
  );
};
