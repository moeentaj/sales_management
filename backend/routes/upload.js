// backend/routes/upload.js - Complete implementation
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, requireRole } = require('../middleware/auth');
const { query, getClient } = require('../config/database');

const router = express.Router();

// Create uploads directory if it doesn't exist
const createUploadDirs = async () => {
    const dirs = [
        'uploads',
        'uploads/checks',
        'uploads/profiles',
        'uploads/documents',
        'uploads/temp'
    ];
    
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
};

// Initialize upload directories
createUploadDirs();

// Configure multer for different upload types
const createMulterConfig = (destination, fileFilter) => {
    return multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, destination);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(file.originalname);
                cb(null, file.fieldname + '-' + uniqueSuffix + ext);
            }
        }),
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit
        },
        fileFilter: fileFilter || ((req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|webp|pdf|doc|docx|txt/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            
            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Invalid file type'));
            }
        })
    });
};

// Image file filter
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

// Configure multer instances
const checkImageUpload = createMulterConfig('uploads/checks', imageFilter);
const profileImageUpload = createMulterConfig('uploads/profiles', imageFilter);
const documentUpload = createMulterConfig('uploads/documents');

// POST /api/upload/check-image - Upload check image
router.post('/check-image', authenticateToken, checkImageUpload.single('check_image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const paymentId = req.body.payment_id;
        const imageUrl = `/uploads/checks/${req.file.filename}`;

        // If payment_id provided, update the payment record
        if (paymentId) {
            const updateResult = await query(
                'UPDATE payments SET check_image_url = $1 WHERE payment_id = $2 RETURNING payment_id',
                [imageUrl, paymentId]
            );

            if (updateResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }
        }

        res.json({
            success: true,
            message: 'Check image uploaded successfully',
            data: {
                image_url: imageUrl,
                filename: req.file.filename,
                size: req.file.size
            }
        });

    } catch (error) {
        console.error('Upload check image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload check image'
        });
    }
});

// POST /api/upload/profile-image - Upload profile image
router.post('/profile-image', authenticateToken, profileImageUpload.single('profile_image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const userId = req.body.user_id || req.user.user_id;
        const imageUrl = `/uploads/profiles/${req.file.filename}`;

        // Update user profile image
        const updateResult = await query(
            'UPDATE users SET profile_image_url = $1 WHERE user_id = $2 RETURNING user_id',
            [imageUrl, userId]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                image_url: imageUrl,
                filename: req.file.filename,
                size: req.file.size
            }
        });

    } catch (error) {
        console.error('Upload profile image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile image'
        });
    }
});

// POST /api/upload/documents - Upload multiple documents
router.post('/documents', authenticateToken, documentUpload.array('documents', 5), async (req, res) => {
    const client = await getClient();
    
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files provided'
            });
        }

        await client.query('BEGIN');

        const uploadedFiles = [];
        const userId = req.body.user_id || req.user.user_id;
        const documentType = req.body.document_type || 'general';
        const description = req.body.description || '';

        for (const file of req.files) {
            const fileUrl = `/uploads/documents/${file.filename}`;
            
            // Save file info to database
            const result = await client.query(
                `INSERT INTO staff_documents 
                 (user_id, document_type, file_name, file_path, file_size, description, uploaded_by) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING document_id`,
                [userId, documentType, file.originalname, fileUrl, file.size, description, req.user.user_id]
            );

            uploadedFiles.push({
                document_id: result.rows[0].document_id,
                filename: file.originalname,
                file_url: fileUrl,
                size: file.size
            });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `${uploadedFiles.length} document(s) uploaded successfully`,
            data: {
                uploaded_files: uploadedFiles
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Upload documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload documents'
        });
    } finally {
        client.release();
    }
});

// GET /api/upload/files/:filename - Serve uploaded files
router.get('/files/:type/:filename', (req, res) => {
    try {
        const { type, filename } = req.params;
        const allowedTypes = ['checks', 'profiles', 'documents'];
        
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type'
            });
        }

        const filePath = path.join(__dirname, '../../uploads', type, filename);
        
        // Check if file exists and serve it
        res.sendFile(filePath, (err) => {
            if (err) {
                res.status(404).json({
                    success: false,
                    message: 'File not found'
                });
            }
        });

    } catch (error) {
        console.error('Serve file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to serve file'
        });
    }
});

// DELETE /api/upload/file/:type/:filename - Delete uploaded file
router.delete('/file/:type/:filename', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { type, filename } = req.params;
        const allowedTypes = ['checks', 'profiles', 'documents'];
        
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type'
            });
        }

        const filePath = path.join(__dirname, '../../uploads', type, filename);
        const fileUrl = `/uploads/${type}/${filename}`;

        // Remove file from filesystem
        try {
            await fs.unlink(filePath);
        } catch (fsError) {
            console.log('File not found on filesystem:', fsError.message);
        }

        // Remove references from database based on type
        if (type === 'checks') {
            await query('UPDATE payments SET check_image_url = NULL WHERE check_image_url = $1', [fileUrl]);
        } else if (type === 'profiles') {
            await query('UPDATE users SET profile_image_url = NULL WHERE profile_image_url = $1', [fileUrl]);
        } else if (type === 'documents') {
            await query('DELETE FROM staff_documents WHERE file_path = $1', [fileUrl]);
        }

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file'
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 5 files allowed.'
            });
        }
    } else if (error.message === 'Invalid file type' || error.message === 'Only image files are allowed') {
        return res.status(415).json({
            success: false,
            message: error.message
        });
    }
    
    console.error('Upload error:', error);
    res.status(500).json({
        success: false,
        message: 'Upload failed'
    });
});

module.exports = router;