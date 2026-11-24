// Low-Level WebUSB API driver (DO NOT EDIT BY STAGE DEVS)
export class WebUsbDriver {
  async requestDevice(filters = []) {
    if (!('usb' in navigator)) throw new Error('WebUSB not supported');
    return await navigator.usb.requestDevice({ filters });
  }
}
