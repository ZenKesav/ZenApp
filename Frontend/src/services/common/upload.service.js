import { axiosClient } from '../../core/api/axiosClient';
export const uploadService = {
  uploadFile: (formData) => axiosClient.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
};
