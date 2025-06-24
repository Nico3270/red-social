import {  PacificoFont } from '@/config/fonts'
import { CurrencyFormat } from '@/config/utils'

import React from 'react'

// Se recibe un objeto de propiedades pero se desestructura `value`
export const Precio = ({ value }: { value: number }) => {
  return (
    <span className={`text-2xl text-gray-800 font-bold ${PacificoFont.className}`}>
      {CurrencyFormat(value)}
    </span>
  );
};
