import type { RouteObject } from 'react-router';
import { Marco } from './componentes/Marco.tsx';
import ErrorRuta from './paginas/ErrorRuta.tsx';
import Inicio from './paginas/Inicio.tsx';
import NoEncontrado from './paginas/NoEncontrado.tsx';
import PaginaProyecto from './paginas/Proyecto.tsx';
import VistaAlternativa from './paginas/VistaAlternativa.tsx';

/** Carga diferida: estas páginas (y sus dependencias pesadas) se descargan sólo al visitarlas. */
const diferida = (cargar: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await cargar()).default,
});

export const rutas: RouteObject[] = [
  {
    // Pantalla completa, fuera del marco. Incluye Three.js + MindAR (chunk aparte).
    path: '/p/:slug/ra',
    lazy: diferida(() => import('./paginas/ExperienciaRA.tsx')),
    ErrorBoundary: ErrorRuta,
  },
  {
    path: '/',
    Component: Marco,
    ErrorBoundary: ErrorRuta,
    children: [
      { index: true, Component: Inicio },
      { path: 'p/:slug', Component: PaginaProyecto },
      { path: 'p/:slug/video', Component: VistaAlternativa },
      { path: 'recursos', lazy: diferida(() => import('./paginas/Recursos.tsx')) },
      { path: 'recursos/vista-previa/:slug', lazy: diferida(() => import('./paginas/VistaPrevia.tsx')) },
      { path: 'recursos/compilar', lazy: diferida(() => import('./paginas/CompilarTarget.tsx')) },
      { path: '*', Component: NoEncontrado },
    ],
  },
];
