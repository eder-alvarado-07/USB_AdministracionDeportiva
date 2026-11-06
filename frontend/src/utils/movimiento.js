// Movimiento en JavaScript (v1.5). Lo que se anima con CSS usa los tokens de index.css;
// las gráficas de Recharts animan con JS y no ven @media, por eso leen la preferencia aquí.
const reducir = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Recharts anima 1,5 s por defecto en cada cambio de datos: demasiado para datos que se consultan seguido.
// Se reduce a 250 ms con desaceleración (se reanima con cada cambio de filtro), y se desactiva si la persona pidió menos movimiento.
export const ANIMACION_GRAFICA = reducir
  ? { isAnimationActive: false }
  : { isAnimationActive: true, animationDuration: 250, animationEasing: 'ease-out' }
