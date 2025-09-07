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
    },

    // Upload staff documents
    uploadStaffDocuments: async (files, staffId = null, documentType = 'general', onProgress = null) => {
        const formData = new FormData();

        // Add files to FormData
        files.forEach((file, index) => {
            formData.append('documents', file);
        });

        if (staffId) {
            formData.append('staff_id', staffId);
        }

        formData.append('document_type', documentType);

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

        const response = await api.post('/upload/staff-documents', formData, config);
        return response.data;
    },

    // General file upload
    uploadFiles: async (files, category = 'general', description = '', onProgress = null) => {
        const formData = new FormData();

        // Add files to FormData
        files.forEach((file, index) => {
            formData.append('files', file);
        });

        formData.append('category', category);
        if (description) {
            formData.append('description', description);
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

        const response = await api.post('/upload/general', formData, config);
        return response.data;
    },

    // Camera utilities
    camera: {
        // Start camera stream
        startCamera: async (videoElement, facingMode = 'environment') => {
            try {
                const constraints = {
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (videoElement) {
                    videoElement.srcObject = stream;

                    // Wait for video to be ready
                    return new Promise((resolve, reject) => {
                        videoElement.onloadedmetadata = () => {
                            videoElement.play()
                                .then(() => resolve(stream))
                                .catch(reject);
                        };
                        videoElement.onerror = () => reject(new Error('Video element error'));
                    });
                }

                return stream;
            } catch (error) {
                console.error('Camera access error:', error);
                let errorMessage = 'Camera access failed';

                if (error.name === 'NotAllowedError') {
                    errorMessage = 'Camera permission denied. Please allow camera access and try again.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = 'No camera found on this device.';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage = 'Camera not supported on this device.';
                } else if (error.name === 'NotReadableError') {
                    errorMessage = 'Camera is already in use by another application.';
                }

                throw new Error(errorMessage);
            }
        },

        // Stop camera stream
        stopCamera: (stream) => {
            if (stream) {
                stream.getTracks().forEach(track => {
                    track.stop();
                });
            }
        },

        // Capture photo from video element
        capturePhoto: async (videoElement, canvasElement = null) => {
            if (!videoElement || videoElement.readyState < 2) {
                throw new Error('Video not ready for capture');
            }

            // Create canvas if not provided
            const canvas = canvasElement || document.createElement('canvas');
            const context = canvas.getContext('2d');

            // Set canvas dimensions to match video
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            // Draw video frame to canvas
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Convert canvas to blob
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create image blob'));
                    }
                }, 'image/jpeg', 0.8);
            });
        },

        // Get available camera devices
        getCameraDevices: async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                return devices.filter(device => device.kind === 'videoinput');
            } catch (error) {
                console.error('Error getting camera devices:', error);
                return [];
            }
        },

        // Check camera support
        isCameraSupported: () => {
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        }
    },

    // File validation utilities
    validation: {
        // Validate image file
        validateImageFile: (file, maxSize = 5 * 1024 * 1024) => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const errors = [];

            if (!validTypes.includes(file.type)) {
                errors.push('File must be JPEG, PNG, or WebP format');
            }

            if (file.size > maxSize) {
                errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        },

        // Validate document file
        validateDocumentFile: (file, maxSize = 10 * 1024 * 1024) => {
            const validTypes = [
                'image/jpeg', 'image/png', 'image/webp',
                'application/pdf',
                'text/plain',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            const errors = [];

            if (!validTypes.includes(file.type)) {
                errors.push('Invalid file type. Allowed: Images, PDF, DOC, DOCX, TXT');
            }

            if (file.size > maxSize) {
                errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        },

        // Validate multiple files
        validateFiles: (files, validator, maxFiles = 10) => {
            const errors = [];
            const validFiles = [];

            if (files.length > maxFiles) {
                errors.push(`Maximum ${maxFiles} files allowed`);
                return { isValid: false, errors, validFiles };
            }

            files.forEach((file, index) => {
                const validation = validator(file);
                if (validation.isValid) {
                    validFiles.push(file);
                } else {
                    errors.push(`File ${index + 1} (${file.name}): ${validation.errors.join(', ')}`);
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                validFiles
            };
        }
    },

    // File utilities
    utils: {
        // Convert file to base64
        fileToBase64: (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
        },

        // Resize image file
        resizeImage: async (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
            return new Promise((resolve, reject) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    // Calculate new dimensions
                    let { width, height } = img;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw and convert to blob
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(resolve, file.type, quality);
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = URL.createObjectURL(file);
            });
        },

        // Format file size
        formatFileSize: (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // Get file extension
        getFileExtension: (filename) => {
            return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
        },

        // Generate unique filename
        generateUniqueFilename: (originalName, prefix = '') => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const extension = uploadService.utils.getFileExtension(originalName);
            const name = originalName.replace(/\.[^/.]+$/, ''); // Remove extension

            return `${prefix}${name}_${timestamp}_${random}.${extension}`;
        }
    },

    // Error handling
    handleUploadError: (error) => {
        console.error('Upload error:', error);

        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            switch (status) {
                case 400:
                    return data.message || 'Invalid file or request';
                case 401:
                    return 'Authentication required';
                case 403:
                    return 'Permission denied';
                case 413:
                    return 'File too large';
                case 422:
                    return data.message || 'Invalid file format';
                case 500:
                    return 'Server error. Please try again.';
                default:
                    return data.message || 'Upload failed';
            }
        } else if (error.request) {
            // Network error
            return 'Network error. Check your connection and try again.';
        } else {
            // Other error
            return error.message || 'An unexpected error occurred';
        }
    },

    // Progress tracking
    createProgressTracker: () => {
        let totalBytes = 0;
        let uploadedBytes = 0;
        let callbacks = [];

        return {
            setTotal: (bytes) => {
                totalBytes = bytes;
            },

            updateProgress: (bytes) => {
                uploadedBytes = bytes;
                const percentage = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
                callbacks.forEach(callback => callback(percentage));
            },

            onProgress: (callback) => {
                callbacks.push(callback);
            },

            reset: () => {
                totalBytes = 0;
                uploadedBytes = 0;
                callbacks = [];
            }
        };
    },
    // Get default payment date (today in YYYY-MM-DD format)
    getDefaultPaymentDate: () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    // Format payment data for API submission
    formatPaymentForAPI: (paymentData) => {
        return {
            amount: parseFloat(paymentData.amount),
            payment_method: paymentData.payment_method,
            payment_date: paymentData.payment_date,
            check_number: paymentData.check_number || null,
            bank_reference: paymentData.bank_reference || null,
            notes: paymentData.notes || null,
            check_image_url: paymentData.check_image_url || null
        };
    },

    // Upload check image
    uploadCheckImage: async (imageFile, paymentId = null) => {
        const formData = new FormData();
        formData.append('check_image', imageFile);

        if (paymentId) {
            formData.append('payment_id', paymentId);
        }

        const response = await api.post('/upload/check-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    },

    // Calculate payment suggestions based on invoice amount
    calculatePaymentSuggestions: (invoiceBalance) => {
        const balance = parseFloat(invoiceBalance);

        return [
            { label: 'Full Amount', amount: balance },
            { label: '50%', amount: Math.round(balance * 0.5) },
            { label: '25%', amount: Math.round(balance * 0.25) },
            { label: 'Custom', amount: null }
        ];
    },

    // Format currency for display
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    // Get payment method icon
    getPaymentMethodIcon: (method) => {
        const icons = {
            cash: 'Banknote',
            check: 'FileText',
            bank_transfer: 'CreditCard',
            online: 'Smartphone'
        };
        return icons[method] || 'DollarSign';
    },

    // Validate payment amount
    validatePaymentAmount: (amount, invoiceBalance) => {
        const numAmount = parseFloat(amount);
        const numBalance = parseFloat(invoiceBalance);

        if (isNaN(numAmount) || numAmount <= 0) {
            return { isValid: false, error: 'Amount must be greater than 0' };
        }

        if (numAmount > numBalance) {
            return { isValid: false, error: 'Amount cannot exceed invoice balance' };
        }

        return { isValid: true, error: null };
    },

    // Get status badge info
    getStatusBadge: (status) => {
        const statusMap = {
            pending: { label: 'Pending', color: 'yellow' },
            partial_paid: { label: 'Partial', color: 'blue' },
            paid: { label: 'Paid', color: 'green' },
            overdue: { label: 'Overdue', color: 'red' },
            cancelled: { label: 'Cancelled', color: 'gray' }
        };

        return statusMap[status] || { label: status, color: 'gray' };
    }
};

export default uploadService;