export const zebraPrintClient = {
  printZpl: async (zpl) => {
    console.log('[Zebra Printer ZPL Sent]:', zpl);
    return true;
  }
};
