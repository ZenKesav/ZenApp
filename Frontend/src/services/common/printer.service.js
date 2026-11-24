import { axiosClient } from '../../core/api/axiosClient';
export const printerService = {
  triggerPrint: (payload) => axiosClient.post('/printer/print', payload)
};
