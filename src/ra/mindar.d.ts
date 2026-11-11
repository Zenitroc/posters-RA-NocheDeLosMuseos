/** Tipos mínimos del build de navegador de MindAR (el paquete no publica tipos). */
declare module 'mind-ar/dist/mindar-image.prod.js' {
  export type DatosActualizacion =
    | { type: 'updateMatrix'; targetIndex: number; worldMatrix: number[] | null }
    | { type: 'processDone' };

  export interface OpcionesController {
    inputWidth: number;
    inputHeight: number;
    onUpdate?: (datos: DatosActualizacion) => void;
    maxTrack?: number;
    filterMinCF?: number | null;
    filterBeta?: number | null;
    warmupTolerance?: number | null;
    missTolerance?: number | null;
  }

  export class Controller {
    constructor(opciones: OpcionesController);
    worker: Worker;
    inputWidth: number;
    inputHeight: number;
    addImageTargetsFromBuffer(buffer: ArrayBuffer): { dimensions: [number, number][] };
    getProjectionMatrix(): number[];
    dummyRun(entrada: HTMLVideoElement): void;
    processVideo(entrada: HTMLVideoElement): void;
    stopProcessVideo(): void;
    dispose(): void;
  }

  export class Compiler {
    compileImageTargets(
      imagenes: Array<HTMLImageElement | HTMLCanvasElement>,
      alProgreso: (porcentaje: number) => void,
    ): Promise<unknown[]>;
    exportData(): ArrayBuffer;
  }
}
