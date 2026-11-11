import { useEffect } from 'react';
import { TEXTOS } from '../config.ts';

/** Actualiza el título de la pestaña (útil también para lectores de pantalla). */
export function useTitulo(titulo?: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${TEXTOS.titulo}` : `${TEXTOS.titulo} · Noche de los Museos UTN BA`;
  }, [titulo]);
}
