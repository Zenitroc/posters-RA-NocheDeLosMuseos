import { describe, expect, it } from 'vitest';
import { normalizarUrlBase, problemasUrlBase, rutaProyecto, urlProyecto } from './urls.ts';

describe('URLs de proyectos', () => {
  it('normaliza la URL base', () => {
    expect(normalizarUrlBase('https://museos.utn.edu.ar/')).toBe('https://museos.utn.edu.ar');
    expect(normalizarUrlBase(' https://dominio.com/noche/ ')).toBe('https://dominio.com/noche');
    expect(normalizarUrlBase('ftp://x')).toBeNull();
    expect(normalizarUrlBase('dominio sin protocolo')).toBeNull();
    expect(normalizarUrlBase('https://x.com/?a=1')).toBeNull();
    expect(normalizarUrlBase('')).toBeNull();
    expect(normalizarUrlBase(undefined)).toBeNull();
  });

  it('arma la URL de cada proyecto (lo que va dentro del QR)', () => {
    expect(rutaProyecto('zonar')).toBe('/p/zonar');
    expect(urlProyecto('https://dominio', 'zonar')).toBe('https://dominio/p/zonar');
    expect(urlProyecto('https://dominio/', 'proyecto-02')).toBe('https://dominio/p/proyecto-02');
    expect(urlProyecto('https://dominio/noche', 'zonar')).toBe('https://dominio/noche/p/zonar');
  });

  it('detecta URLs base inadecuadas para imprimir', () => {
    expect(problemasUrlBase('https://museos.utn.edu.ar')).toEqual([]);
    expect(problemasUrlBase('http://museos.utn.edu.ar').join()).toMatch(/HTTPS/);
    expect(problemasUrlBase('https://localhost:5173').join()).toMatch(/local/);
    expect(problemasUrlBase('https://192.168.0.10').join()).toMatch(/local/);
  });
});
