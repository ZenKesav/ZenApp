export const laserController = {
  triggerMarking: async (templateId, serialNo) => {
    console.log('[Laser Controller Trigger]:', { templateId, serialNo });
    return true;
  }
};
