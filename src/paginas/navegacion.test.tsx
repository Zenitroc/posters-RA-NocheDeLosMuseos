import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rutas } from '../rutas.tsx';

vi.mock('virtual:proyectos', async () => ({ default: (await import('../pruebas/catalogo-prueba.ts')).CATALOGO_PRUEBA }));

function abrir(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('Catálogo (/proyectos)', () => {
  it('muestra título, subtítulo y sólo los proyectos activos', async () => {
    abrir('/proyectos');
    expect(await screen.findByRole('heading', { level: 1, name: /Proyectos que cobran vida/i })).toBeInTheDocument();
    expect(screen.getByText('Noche de los Museos — UTN Buenos Aires')).toBeInTheDocument();
    const catalogo = document.querySelector<HTMLElement>('.grilla-proyectos')!;
    const tarjetas = within(catalogo).getAllByRole('link');
    expect(tarjetas.map((t) => t.getAttribute('href'))).toEqual(['/p/zonar', '/p/incompleto', '/p/solo-video', '/p/solo-capa']);
    expect(screen.queryByText('Proyecto Oculto')).not.toBeInTheDocument();
  });

  it('usa miniaturas livianas (no el póster ni el video) en el catálogo', async () => {
    abrir('/proyectos');
    const img = await screen.findByAltText('Póster del proyecto ZonAR');
    expect(img).toHaveAttribute('src', '/posters/zonar/miniatura.jpg?v=1');
    expect(document.querySelector('video')).toBeNull();
  });

  it('navega del catálogo a la página del proyecto', async () => {
    const usuario = userEvent.setup();
    const router = abrir('/proyectos');
    await usuario.click(await screen.findByRole('link', { name: /ZonAR/ }));
    expect(router.state.location.pathname).toBe('/p/zonar');
    expect(await screen.findByRole('heading', { level: 1, name: 'ZonAR' })).toBeInTheDocument();
  });
});

describe('Página de proyecto (/p/:slug)', () => {
  it('acceso directo desde el QR: nombre, lema, instrucciones y acciones', async () => {
    abrir('/p/zonar');
    expect(await screen.findByRole('heading', { level: 1, name: 'ZonAR' })).toBeInTheDocument();
    expect(screen.getByText('Hacé visible el ruido')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cómo verlo en realidad aumentada/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver animación sin RA/ })).toHaveAttribute('href', '/p/zonar/video');
    expect(screen.getByText('Recursos de demostración')).toBeInTheDocument();
  });

  it('en un contexto sin cámara (HTTP, jsdom) avisa en lugar de ofrecer la RA', async () => {
    abrir('/p/zonar');
    expect(await screen.findByRole('button', { name: /Activar cámara/ })).toBeDisabled();
    expect(screen.getByText(/Conexión no segura/)).toBeInTheDocument();
  });

  it('con contexto seguro y cámara disponible, "Activar cámara" lleva a la RA', async () => {
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ getExtension: () => null } as never);
    try {
      abrir('/p/zonar');
      expect(await screen.findByRole('link', { name: /Activar cámara/ })).toHaveAttribute('href', '/p/zonar/ra');
    } finally {
      vi.unstubAllGlobals();
      getContext.mockRestore();
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    }
  });

  it('proyecto incompleto: no rompe, deshabilita acciones y lo explica', async () => {
    abrir('/p/incompleto');
    expect(await screen.findByRole('heading', { level: 1, name: 'Proyecto Incompleto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activar cámara/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ver animación sin RA/ })).toBeDisabled();
    expect(screen.getByText(/todavía se está preparando/)).toBeInTheDocument();
  });

  it('proyecto con video pero sin target: ofrece la vista sin RA', async () => {
    abrir('/p/solo-video');
    expect(await screen.findByRole('link', { name: /Ver animación sin RA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activar cámara/ })).toBeDisabled();
  });

  it('slug inexistente o proyecto inactivo: página amable con salida al catálogo', async () => {
    abrir('/p/no-existe');
    expect(await screen.findByRole('heading', { name: 'No encontramos ese proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todos los proyectos' })).toHaveAttribute('href', '/proyectos');
  });

  it('proyecto inactivo no se publica', async () => {
    abrir('/p/oculto');
    expect(await screen.findByRole('heading', { name: 'Este proyecto no está disponible' })).toBeInTheDocument();
  });

  it('el slug no distingue mayúsculas (QR tipeado a mano)', async () => {
    abrir('/p/ZONAR');
    expect(await screen.findByRole('heading', { level: 1, name: 'ZonAR' })).toBeInTheDocument();
  });
});

describe('Modos de animación', () => {
  it('/p/:slug?modo=canvas reenvía el modo a la experiencia de RA (para probar desde el celular)', async () => {
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ getExtension: () => null } as never);
    try {
      abrir('/p/zonar?modo=canvas');
      expect(await screen.findByRole('link', { name: /Activar cámara/ })).toHaveAttribute('href', '/p/zonar/ra?modo=canvas');
    } finally {
      vi.unstubAllGlobals();
      getContext.mockRestore();
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    }
  });

  it('un modo desconocido en la URL se ignora', async () => {
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ getExtension: () => null } as never);
    try {
      abrir('/p/zonar?modo=gif');
      expect(await screen.findByRole('link', { name: /Activar cámara/ })).toHaveAttribute('href', '/p/zonar/ra');
    } finally {
      vi.unstubAllGlobals();
      getContext.mockRestore();
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    }
  });

  it('proyecto sólo con capa Canvas: la vista sin RA dibuja la capa sobre el póster', async () => {
    abrir('/p/solo-capa/video');
    expect(await screen.findByText(/Modo sin realidad aumentada/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Animación del póster Solo Capa' }).tagName).toBe('CANVAS');
    expect(document.querySelector('video')).toBeNull();
  });

  it('recursos muestra el formato elegido y enlaces para forzar cada modo', async () => {
    const { CATALOGO_PRUEBA } = await import('../pruebas/catalogo-prueba.ts');
    const zonar = CATALOGO_PRUEBA.proyectos[0];
    const original = { urls: zonar.urls, estado: zonar.estado };
    zonar.urls = { ...zonar.urls, capa: '/posters/zonar/capa.js?v=1' };
    zonar.estado = { ...zonar.estado, animaciones: ['canvas', 'video'] };
    try {
      abrir('/recursos');
      const ficha = within(await screen.findByRole('article', { name: 'ZonAR' }));
      expect(ficha.getByText(/Capa Canvas → respaldo Video MP4/)).toBeInTheDocument();
      expect(ficha.getByRole('link', { name: 'Capa Canvas' })).toHaveAttribute('href', '/p/zonar/ra?modo=canvas');
      expect(ficha.getByRole('link', { name: 'Video MP4' })).toHaveAttribute('href', '/p/zonar/ra?modo=video');
    } finally {
      Object.assign(zonar, original);
    }
  });
});

describe('Vista alternativa (/p/:slug/video)', () => {
  it('reproduce el MP4 del proyecto, silenciado e inline, y aclara que no es RA', async () => {
    abrir('/p/zonar/video');
    expect(await screen.findByText(/Modo sin realidad aumentada/)).toBeInTheDocument();
    const video = document.querySelector('video')!;
    expect(video).toHaveAttribute('src', '/posters/zonar/animacion.mp4?v=1');
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video.loop).toBe(true);
  });
});

describe('Experiencia RA (/p/:slug/ra)', () => {
  it('si el navegador no puede usar la cámara, no deja al visitante bloqueado', async () => {
    abrir('/p/zonar/ra');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Conexión no segura' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver animación sin RA/ })).toHaveAttribute('href', '/p/zonar/video');
    expect(screen.getByRole('link', { name: /Volver al proyecto/ })).toHaveAttribute('href', '/p/zonar');
  });

  it('el botón Cerrar vuelve a la página del proyecto', async () => {
    const usuario = userEvent.setup();
    const router = abrir('/p/zonar/ra');
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar cámara' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/p/zonar'));
  });

  it('un proyecto sin target no intenta abrir la cámara', async () => {
    abrir('/p/solo-video/ra');
    expect(await screen.findByRole('heading', { name: 'La realidad aumentada no está lista' })).toBeInTheDocument();
  });
});

describe('Recursos para impresión (/recursos)', () => {
  it('lista todos los proyectos (incluso inactivos) con su URL, QR y estado', async () => {
    abrir('/recursos');
    expect(await screen.findByRole('heading', { level: 1, name: 'Recursos para impresión' })).toBeInTheDocument();
    for (const nombre of ['ZonAR', 'Proyecto Incompleto', 'Solo Video', 'Proyecto Oculto']) {
      expect(screen.getByRole('heading', { level: 2, name: nombre })).toBeInTheDocument();
    }
    const ficha = within(screen.getByRole('article', { name: 'ZonAR' }));
    expect(ficha.getByText(`${window.location.origin}/p/zonar`)).toBeInTheDocument();
    await waitFor(() => expect(ficha.getByAltText(`Código QR que abre ${window.location.origin}/p/zonar`)).toBeInTheDocument());
    expect(screen.getAllByText('Incompleto').length).toBeGreaterThan(0);
    expect(screen.getByText(/Carpetas con errores/)).toBeInTheDocument();
  });

  it('los QR usan la URL base editable', async () => {
    const usuario = userEvent.setup();
    abrir('/recursos');
    const campo = await screen.findByLabelText(/URL pública del sitio/);
    await usuario.clear(campo);
    await usuario.type(campo, 'https://museos.utn.edu.ar/');
    const ficha = within(screen.getByRole('article', { name: 'ZonAR' }));
    expect(await ficha.findByText('https://museos.utn.edu.ar/p/zonar')).toBeInTheDocument();
    expect(await ficha.findByAltText('Código QR que abre https://museos.utn.edu.ar/p/zonar')).toBeInTheDocument();
  });
});
