import { useEffect } from 'react';

/** Evita que la pantalla se apague mientras se apunta al póster (si el navegador lo permite). */
export function useMantenerPantallaEncendida(activo: boolean) {
  useEffect(() => {
    if (!activo || !('wakeLock' in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    let cancelado = false;
    const pedir = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((b) => {
          if (cancelado) b.release().catch(() => {});
          else bloqueo = b;
        })
        .catch(() => {});
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', pedir);
      bloqueo?.release().catch(() => {});
    };
  }, [activo]);
}
