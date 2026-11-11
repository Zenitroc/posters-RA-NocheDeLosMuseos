// Capa Canvas mínima para pruebas (misma API que zonar-overlay.js).
(function (global) {
  global.CapaPrueba = {
    WIDTH: 240,
    HEIGHT: 340,
    DURATION: 2,
    load: function () {
      return Promise.resolve();
    },
    render: function (ctx, t) {
      ctx.fillStyle = 'rgba(255,0,0,0.8)';
      ctx.fillRect(20 + t * 10, 20, 40, 40);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
