import type { ReactNode } from 'react';
import { IconoAlerta, IconoInfo } from './Iconos.tsx';

interface Props {
  tipo?: 'info' | 'alerta' | 'error';
  children: ReactNode;
  className?: string;
}

export function Aviso({ tipo = 'info', children, className = '' }: Props) {
  const Icono = tipo === 'info' ? IconoInfo : IconoAlerta;
  return (
    <div className={`aviso aviso--${tipo} ${className}`} role={tipo === 'error' ? 'alert' : undefined}>
      <Icono />
      <div>{children}</div>
    </div>
  );
}
