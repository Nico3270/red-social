
import React from 'react'
import IntroPitchEpicCompact from './IntroPitch'
import SlideValorRecurrenciaEpic from './SlideValorRecurrenciaEpic'
import SlideEscalabilidad from './SlideEscalabilidad'
import SlideLanzamientoColombia from './SlideLanzamientoColombia'
import SlideCirculoVirtuoso from './SlideCirculoVirtuoso'
import SlideFinalEpic from './SlideFinalEpic'

export const Presentacion = () => {
  return (
    <div id='presentacionFinal' className='flex flex-col w-full justify-center items-center'>
        <IntroPitchEpicCompact/>
        <SlideValorRecurrenciaEpic/>
        <SlideEscalabilidad />
        <SlideLanzamientoColombia/>
        <SlideCirculoVirtuoso/>
        <SlideFinalEpic/>
    </div>
  )
}
