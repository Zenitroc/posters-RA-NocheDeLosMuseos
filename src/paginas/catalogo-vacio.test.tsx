import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rutas } from '../rutas.tsx';

vi.mock('virtual:proyectos', () => ({ default: { proyectos: [], problemas: [] } }));

describe('sin proyectos cargados', () => {
  it('el inicio funciona y lo informa', async () => {
    render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/proyectos'] })} />);
    expect(await screen.findByText('Todavía no hay proyectos publicados')).toBeInTheDocument();
  });

  it('la portada (cámara) avisa que no hay pósters listos en lugar de pedir la cámara', async () => {
    render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/'] })} />);
    expect(await screen.findByText('Todavía no hay pósters listos')).toBeInTheDocument();
  });

  it('recursos lo informa', async () => {
    render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/recursos'] })} />);
    expect(await screen.findByText('No hay proyectos cargados')).toBeInTheDocument();
  });
});
