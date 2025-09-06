// middleware/upload.js
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Create upload directories
const uploadDirs = {
    checks: path.join(__dirname, '../uploads/checks'),
    documents: path.join(__dirname, '../uploads/documents'),
    profiles: path.join(__dirname, '../uploads/profiles'),
    temp: path.join(__dirname, '../uploads/temp')
};

Object.values(uploadDirs).forEach(ensureDirectoryExists);

// File type validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
        'application/pdf': ['.pdf'],
        'text/plain': ['.txt'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    };

    if (allowedTypes[file.mimetype]) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
};

// Storage configuration for different file types
const createStorage = (uploadType) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = uploadDirs[uploadType] || uploadDirs.temp;
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueId = uuidv4();
            const timestamp = Date.now();
            const ext = path.extname(file.originalname).toLowerCase();
            const filename = `${uploadType}_${timestamp}_${uniqueId}${ext}`;
            cb(null, filename);
        }
    });
};

// Image processing middleware
const processImage = async (filePath, options = {}) => {
    const {
        width = 800,
        height = 600,
        quality = 80,
        format = 'jpeg'
    } = options;

    try {
        const processedPath = filePath.replace(path.extname(filePath), `_processed.${format}`);
        
        await sharp(filePath)
            .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality })
            .toFile(processedPath);

        // Delete original file after processing
        fs.unlinkSync(filePath);
        
        return processedPath;
    } catch (error) {
        console.error('Image processing error:', error);
        throw new Error('Failed to process image');
    }
};

// Upload configurations for different types
const uploadConfigs = {
    // Check images for payment collection
    checkImage: multer({
        storage: createStorage('checks'),
        fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
            files: 1
        }
    }).single('check_image'),

    // Staff profile images
    profileImage: multer({
        storage: createStorage('profiles'),
        fileFilter: (req, file, cb) => {
            const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (imageTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for profiles'), false);
            }
        },
        limits: {
            fileSize: 2 * 1024 * 1024, // 2MB
            files: 1
        }
    }).single('profile_image'),

    // Staff documents (ID cards, contracts, etc.)
    staffDocument: multer({
        storage: createStorage('documents'),
        fileFilter,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
            files: 5
        }
    }).array('documents', 5),

    // General file upload
    general: multer({
        storage: createStorage('temp'),
        fileFilter,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
            files: 10
        }
    }).array('files', 10)
};

// Middleware factory for different upload types
const createUploadMiddleware = (uploadType, options = {}) => {
    return async (req, res, next) => {
        const upload = uploadConfigs[uploadType];
        
        if (!upload) {
            return res.status(400).json({
                success: false,
                message: 'Invalid upload type'
            });
        }

        upload(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            success: false,
                            message: 'File too large'
                        });
                    }
                    if (err.code === 'LIMIT_FILE_COUNT') {
                        return res.status(400).json({
                            success: false,
                            message: 'Too many files'
                        });
                    }
                }
                
                return res.status(400).json({
                    success: false,
                    message: err.message || 'Upload failed'
                });
            }

            // Process images if needed
            if (options.processImages && req.file && req.file.mimetype.startsWith('image/')) {
                try {
                    const processedPath = await processImage(req.file.path, options.imageOptions);
                    req.file.path = processedPath;
                    req.file.filename = path.basename(processedPath);
                } catch (error) {
                    console.error('Image processing failed:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to process image'
                    });
                }
            }

            // Process multiple images
            if (options.processImages && req.files && Array.isArray(req.files)) {
                try {
                    for (const file of req.files) {
                        if (file.mimetype.startsWith('image/')) {
                            const processedPath = await processImage(file.path, options.imageOptions);
                            file.path = processedPath;
                            file.filename = path.basename(processedPath);
                        }
                    }
                } catch (error) {
                    console.error('Batch image processing failed:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to process images'
                    });
                }
            }

            next();
        });
    };
};

// File cleanup utility
const cleanupFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('File cleanup error:', error);
    }
};

// Get file URL helper
const getFileUrl = (filename, type = 'temp') => {
    if (!filename) return null;
    return `/uploads/${type}/${filename}`;
};

// File validation helper
const validateFile = (file, options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    } = options;

    const errors = [];

    if (file.size > maxSize) {
        errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} not allowed`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// Secure filename helper
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .replace(/\.+/g, '.')
        .substring(0, 100);
};

// AWS S3 integration helper (for future use)
const getS3Config = () => {
    return {
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        enabled: !!(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID)
    };
};

// Storage abstraction for local/cloud
const StorageManager = {
    local: {
        save: async (file, type) => {
            // File is already saved by multer
            return getFileUrl(file.filename, type);
        },
        delete: async (filePath) => {
            const fullPath = path.join(__dirname, '../uploads', filePath.replace('/uploads/', ''));
            cleanupFile(fullPath);
        },
        getUrl: (filename, type) => getFileUrl(filename, type)
    },
    
    s3: {
        save: async (file, type) => {
            // TODO: Implement S3 upload
            // const AWS = require('aws-sdk');
            // const s3 = new AWS.S3(getS3Config());
            // ... S3 upload logic
            throw new Error('S3 storage not implemented yet');
        },
        delete: async (key) => {
            // TODO: Implement S3 delete
            throw new Error('S3 storage not implemented yet');
        },
        getUrl: (key) => {
            const config = getS3Config();
            return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
        }
    }
};

// Get active storage provider
const getStorageProvider = () => {
    const s3Config = getS3Config();
    return s3Config.enabled ? StorageManager.s3 : StorageManager.local;
};

module.exports = {
    createUploadMiddleware,
    processImage,
    cleanupFile,
    getFileUrl,
    validateFile,
    sanitizeFilename,
    StorageManager,
    getStorageProvider,
    uploadDirs,
    
    // Pre-configured middleware
    uploadCheckImage: createUploadMiddleware('checkImage', {
        processImages: true,
        imageOptions: { width: 800, height: 600, quality: 85 }
    }),
    
    uploadProfileImage: createUploadMiddleware('profileImage', {
        processImages: true,
        imageOptions: { width: 300, height: 300, quality: 90 }
    }),
    
    uploadStaffDocuments: createUploadMiddleware('staffDocument'),
    
    uploadGeneral: createUploadMiddleware('general')
};