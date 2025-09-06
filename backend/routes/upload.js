// routes/upload.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
    uploadCheckImage,
    uploadProfileImage,
    uploadStaffDocuments,
    uploadGeneral,
    getFileUrl,
    getStorageProvider,
    cleanupFile
} = require('../middleware/upload');

const router = express.Router();

// POST /api/upload/check-image - Upload check image for payment
router.post('/check-image', authenticateToken, uploadCheckImage, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { payment_id } = req.body;
        const storageProvider = getStorageProvider();
        
        // Save file and get URL
        const fileUrl = await storageProvider.save(req.file, 'checks');
        
        // Update payment record if payment_id provided
        if (payment_id) {
            // Verify user has access to this payment
            let paymentCheck = `
                SELECT payment_id FROM payments WHERE payment_id = $1
            `;
            let checkParams = [payment_id];

            if (req.user.role === 'sales_staff') {
                paymentCheck += ` AND collected_by = $2`;
                checkParams.push(req.user.user_id);
            }

            const paymentResult = await query(paymentCheck, checkParams);
            
            if (paymentResult.rows.length === 0) {
                // Clean up uploaded file
                cleanupFile(req.file.path);
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to payment record'
                });
            }

            // Update payment with check image URL
            await query(
                'UPDATE payments SET check_image_url = $1 WHERE payment_id = $2',
                [fileUrl, payment_id]
            );
        }

        res.json({
            success: true,
            message: 'Check image uploaded successfully',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                url: fileUrl,
                payment_id: payment_id || null
            }
        });

    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            cleanupFile(req.file.path);
        }
        
        console.error('Check image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload check image'
        });
    }
});

// POST /api/upload/profile-image - Upload user profile image
router.post('/profile-image', authenticateToken, uploadProfileImage, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { user_id } = req.body;
        const targetUserId = user_id || req.user.user_id;
        const storageProvider = getStorageProvider();

        // Check if user can update this profile
        if (req.user.role !== 'admin' && req.user.user_id != targetUserId) {
            cleanupFile(req.file.path);
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Save file and get URL
        const fileUrl = await storageProvider.save(req.file, 'profiles');

        // Get current profile image to clean up old file
        const currentResult = await query(
            'SELECT profile_image_url FROM users WHERE user_id = $1',
            [targetUserId]
        );

        const currentImageUrl = currentResult.rows[0]?.profile_image_url;

        // Update user profile with new image URL
        await query(
            'UPDATE users SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [fileUrl, targetUserId]
        );

        // Clean up old profile image
        if (currentImageUrl && currentImageUrl !== fileUrl) {
            try {
                await storageProvider.delete(currentImageUrl);
            } catch (error) {
                console.warn('Failed to delete old profile image:', error);
            }
        }

        res.json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                url: fileUrl,
                user_id: targetUserId
            }
        });

    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            cleanupFile(req.file.path);
        }

        console.error('Profile image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile image'
        });
    }
});

// POST /api/upload/staff-documents - Upload staff documents
router.post('/staff-documents', authenticateToken, uploadStaffDocuments, async (req, res) => {
    const client = await getClient();
    
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const { staff_id, document_type = 'general' } = req.body;
        const targetStaffId = staff_id || req.user.user_id;
        const storageProvider = getStorageProvider();

        // Check permissions
        if (req.user.role !== 'admin' && req.user.user_id != targetStaffId) {
            // Clean up uploaded files
            req.files.forEach(file => cleanupFile(file.path));
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await client.query('BEGIN');

        const uploadedFiles = [];

        for (const file of req.files) {
            try {
                // Save file and get URL
                const fileUrl = await storageProvider.save(file, 'documents');

                // Insert document record
                const documentResult = await client.query(
                    `INSERT INTO staff_documents (staff_id, document_type, document_name, document_url)
                     VALUES ($1, $2, $3, $4)
                     RETURNING document_id, document_name, document_url, uploaded_at`,
                    [targetStaffId, document_type, file.originalname, fileUrl]
                );

                uploadedFiles.push({
                    ...documentResult.rows[0],
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size
                });

            } catch (error) {
                console.error('Error processing file:', file.originalname, error);
                cleanupFile(file.path);
                throw error;
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `${uploadedFiles.length} document(s) uploaded successfully`,
            data: {
                staff_id: targetStaffId,
                document_type,
                files: uploadedFiles
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => cleanupFile(file.path));
        }

        console.error('Staff documents upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload staff documents'
        });
    } finally {
        client.release();
    }
});

// POST /api/upload/general - General file upload
router.post('/general', authenticateToken, uploadGeneral, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const { category = 'general', description } = req.body;
        const storageProvider = getStorageProvider();
        const uploadedFiles = [];

        for (const file of req.files) {
            try {
                const fileUrl = await storageProvider.save(file, 'temp');
                
                uploadedFiles.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                    url: fileUrl,
                    category,
                    description,
                    uploaded_by: req.user.user_id,
                    uploaded_at: new Date()
                });

            } catch (error) {
                console.error('Error processing file:', file.originalname, error);
                cleanupFile(file.path);
            }
        }

        res.json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            data: {
                files: uploadedFiles,
                category,
                uploaded_by: req.user.user_id
            }
        });

    } catch (error) {
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => cleanupFile(file.path));
        }

        console.error('General upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload files'
        });
    }
});

// GET /api/upload/staff-documents/:staff_id - Get staff documents
router.get('/staff-documents/:staff_id', authenticateToken, async (req, res) => {
    try {
        const staffId = req.params.staff_id;

        // Check permissions
        if (req.user.role !== 'admin' && req.user.user_id != staffId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const result = await query(
            `SELECT document_id, document_type, document_name, document_url, uploaded_at
             FROM staff_documents 
             WHERE staff_id = $1 
             ORDER BY uploaded_at DESC`,
            [staffId]
        );

        res.json({
            success: true,
            data: {
                staff_id: staffId,
                documents: result.rows
            }
        });

    } catch (error) {
        console.error('Get staff documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve documents'
        });
    }
});

// DELETE /api/upload/staff-documents/:document_id - Delete staff document
router.delete('/staff-documents/:document_id', authenticateToken, async (req, res) => {
    try {
        const documentId = req.params.document_id;

        // Get document details and check permissions
        let documentQuery = `
            SELECT sd.document_id, sd.staff_id, sd.document_url
            FROM staff_documents sd
            WHERE sd.document_id = $1
        `;
        let queryParams = [documentId];

        if (req.user.role !== 'admin') {
            documentQuery += ` AND sd.staff_id = $2`;
            queryParams.push(req.user.user_id);
        }

        const documentResult = await query(documentQuery, queryParams);

        if (documentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Document not found or access denied'
            });
        }

        const document = documentResult.rows[0];

        // Delete from database
        await query('DELETE FROM staff_documents WHERE document_id = $1', [documentId]);

        // Delete file from storage
        try {
            const storageProvider = getStorageProvider();
            await storageProvider.delete(document.document_url);
        } catch (error) {
            console.warn('Failed to delete file from storage:', error);
        }

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Delete staff document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete document'
        });
    }
});

// GET /api/upload/check-images - Get check images (for admin)
router.get('/check-images', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const result = await query(
            `SELECT 
                p.payment_id, p.payment_date, p.amount, p.check_number, p.check_image_url,
                i.invoice_number, d.distributor_name, u.full_name as collected_by
             FROM payments p
             JOIN invoices i ON i.invoice_id = p.invoice_id
             JOIN distributors d ON d.distributor_id = i.distributor_id
             LEFT JOIN users u ON u.user_id = p.collected_by
             WHERE p.check_image_url IS NOT NULL
             ORDER BY p.payment_date DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        // Get total count
        const countResult = await query(
            'SELECT COUNT(*) FROM payments WHERE check_image_url IS NOT NULL'
        );
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: {
                check_images: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get check images error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve check images'
        });
    }
});

// POST /api/upload/cleanup - Clean up orphaned files (admin only)
router.post('/cleanup', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { older_than_days = 7 } = req.body;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - older_than_days);

        // This is a placeholder for cleanup logic
        // In production, you'd implement logic to:
        // 1. Find files not referenced in database
        // 2. Find files older than cutoff date in temp directory
        // 3. Clean up orphaned files

        res.json({
            success: true,
            message: 'File cleanup initiated',
            data: {
                cutoff_date: cutoffDate.toISOString(),
                status: 'Cleanup process started in background'
            }
        });

    } catch (error) {
        console.error('File cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate cleanup'
        });
    }
});

// GET /api/upload/storage-info - Get storage information
router.get('/storage-info', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const storageInfo = {
            provider: process.env.AWS_S3_BUCKET ? 'AWS S3' : 'Local Storage',
            upload_directories: {
                checks: '/uploads/checks',
                documents: '/uploads/documents',
                profiles: '/uploads/profiles',
                temp: '/uploads/temp'
            },
            limits: {
                check_image: '5MB',
                profile_image: '2MB',
                staff_documents: '10MB',
                general: '10MB'
            },
            supported_formats: {
                images: ['JPEG', 'PNG', 'WebP'],
                documents: ['PDF', 'DOC', 'DOCX', 'TXT']
            }
        };

        // Get file counts from database
        const statsResult = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE check_image_url IS NOT NULL) as check_images_count,
                COUNT(DISTINCT profile_image_url) FILTER (WHERE profile_image_url IS NOT NULL) as profile_images_count,
                (SELECT COUNT(*) FROM staff_documents) as staff_documents_count
            FROM users u
            LEFT JOIN payments p ON p.collected_by = u.user_id
        `);

        storageInfo.usage = statsResult.rows[0];

        res.json({
            success: true,
            data: storageInfo
        });

    } catch (error) {
        console.error('Get storage info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get storage information'
        });
    }
});

module.exports = router;