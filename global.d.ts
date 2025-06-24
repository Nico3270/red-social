import 'react';

declare module 'react' {
  interface CSSProperties {
    '--swiper-navigation-color'?: string;
    '--swiper-pagination-color'?: string;
  }
}
