declare module 'mind-ar/src/image-target/offline-compiler.js' {
  export class OfflineCompiler {
    compileImageTargets(
      imagenes: Array<{ width: number; height: number }>,
      alProgreso: (porcentaje: number) => void,
    ): Promise<unknown[]>;
    exportData(): ArrayBuffer;
  }
}
