// Global USB keyboard wedge barcode scanner hook engine
export class HidScannerDriver {
  static listen(callback, options = { minLength: 5, timeout: 50 }) {
    let buffer = '';
    let timer = null;

    const handler = (e) => {
      if (e.key === 'Enter') {
        if (buffer.length >= options.minLength) {
          callback(buffer.trim());
        }
        buffer = '';
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, options.timeout);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }
}
