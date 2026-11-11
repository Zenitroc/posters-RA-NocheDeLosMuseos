import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './estilos/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { rutas } from './rutas.tsx';

const router = createBrowserRouter(rutas);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
