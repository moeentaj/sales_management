// services/uploadService.js
import api from './api';

export const uploadService = {
    // Upload check image for payment
    uploadCheckImage: async (imageFile, paymentId = null, onProgress = null) => {
        const formData = new FormData();
        formData.append('check_image', imageFile);
        
        if (paymentId) {
            formData.append('payment_id', paymentId);
        }

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        };

        if (onProgress) {
            config.onUploadProgress = (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percentCompleted);
            };
        }

        const response = await api.post('/upload/check-image', formData, config);
        return response.data;
    },

    // Upload profile image
    uploadProfileImage: async (imageFile, userId = null, onProgress = null) => {
        const formData = new FormData();
        formData.append('profile_image', imageFile);
        
        if (userId) {
            formData.append('user_id', userId);
        }

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        };

        if (onProgress) {
            config.onUploadProgress = (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percentCompleted);
            };
        }

        const response = await api.post('/upload/profile-image', formData, config);
        return response.data;