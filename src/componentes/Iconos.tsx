import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoCamara = (p: Props) => (
  <Base {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3.5" />
  </Base>
);

export const IconoVideo = (p: Props) => (
  <Base {...p}>
    <rect x="2" y="5" width="15" height="14" rx="2" />
    <path d="m17 10 5-3v10l-5-3" />
  </Base>
);

export const IconoQr = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </Base>
);

export const IconoVolver = (p: Props) => (
  <Base {...p}>
    <path d="m15 18-6-6 6-6" />
  </Base>
);

export const IconoCerrar = (p: Props) => (
  <Base {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
);

export const IconoRepetir = (p: Props) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Base>
);

export const IconoPausa = (p: Props) => (
  <Base {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </Base>
);

export const IconoPlay = (p: Props) => (
  <Base {...p}>
    <path d="M7 4v16l13-8z" />
  </Base>
);

export const IconoCheck = (p: Props) => (
  <Base {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Base>
);

export const IconoAlerta = (p: Props) => (
  <Base {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Base>
);

export const IconoInfo = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Base>
);

export const IconoDescargar = (p: Props) => (
  <Base {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </Base>
);

export const IconoCopiar = (p: Props) => (
  <Base {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Base>
);

export const IconoImprimir = (p: Props) => (
  <Base {...p}>
    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </Base>
);

export const IconoEncuadre = (p: Props) => (
  <Base {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <rect x="8" y="7" width="8" height="10" rx="1" />
  </Base>
);

export const IconoChispa = (p: Props) => (
  <Base {...p}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="2.5" />
  </Base>
);

export const IconoOjo = (p: Props) => (
  <Base {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

/** Isotipo: póster con ondas que "cobran vida". */
export function Logo(props: Props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4163b" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect x="6" y="3" width="17" height="24" rx="3" fill="none" stroke="url(#logo-g)" strokeWidth="2.4" />
      <path d="M10 18v-3M13.5 20v-7M17 18v-3" stroke="#f7f7f8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26 10.5a7 7 0 0 1 0 9M28.6 8a10.5 10.5 0 0 1 0 14" fill="none" stroke="#e4163b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export const IconoPremio = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" />
  </Base>
);

/** Distinción del proyecto (p. ej. un premio en un congreso). */
export function Premio({ texto, className = '' }: { texto: string; className?: string }) {
  return (
    <span className={`premio ${className}`.trim()}>
      <IconoPremio />
      <span>{texto}</span>
    </span>
  );
}

export const IconoExpandir = (p: Props) => (
  <Base {...p}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </Base>
);
