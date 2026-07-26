/**
 * Preparación del entorno jsdom para Vitest.
 *
 * jsdom implementa `<dialog>` pero no `showModal`/`close`, así que el panel de
 * acusación no puede abrir su confirmación en las pruebas. El sustituto refleja
 * lo único que las pruebas observan: el atributo `open` y el evento `close`.
 * Solo se carga en el entorno de Vitest; el navegador real usa su diálogo nativo.
 */

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
    this.open = true;
  };

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement): void {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
