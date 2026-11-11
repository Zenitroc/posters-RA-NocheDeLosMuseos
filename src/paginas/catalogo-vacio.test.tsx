import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rutas } from '../rutas.tsx';

vi.mock('virtual:proyectos', () => ({ default: { proyectos: [], problemas: [] } }));

describe('sin proyectos cargados', () => {
  it('el inicio funciona y lo informa', async () => {
    render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/'] })} />);
    expect(await screen.findByText('Todavía no hay proyectos publicados')).toBeInTheDocument();
  });

  it('recursos lo informa', async () => {
    render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/recursos'] })} />);
    expect(await screen.findByText('No hay proyectos cargados')).toBeInTheDocument();
  });
});
