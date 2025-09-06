// components/common/CameraCapture.js
import React, { useRef, useState, useEffect } from 'react';
import { 
    Camera, X, RotateCcw, Download, Upload, 
    CheckCircle, AlertCircle, Loader, RefreshCw
} from 'lucide-react';
import { uploadService } from '../../services/uploadService';

const CameraCapture = ({ 
    onCapture, 
    onClose, 
    onUpload = null,
    title = "Take Photo",
    uploadType = "check-image",
    paymentId = null,
    autoUpload = false
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
    const [cameraReady, setCameraReady] = useState(false);

    useEffect(() => {
        initializeCamera();
        return () => {
            stopCamera();
        };
    }, [facingMode]);

    const initializeCamera = async () => {
        try {
            setCameraError(null);
            setCameraReady(false);

            // Stop existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // Start new camera stream
            const mediaStream = await uploadService.camera.startCamera(videoRef.current, facingMode);
            setStream(mediaStream);
            setCameraReady(true);
        } catch (error) {
            console.error('Camera initialization error:', error);
            setCameraError(error.message);
        }
    };

    const stopCamera = () => {
        if (stream) {
            uploadService.camera.stopCamera(stream);
            setStream(null);
        }
        setCameraReady(false);
    };

    const capturePhoto = async () => {
        try {
            if (!videoRef.current || !cameraReady) {
                throw new Error('Camera not ready');
            }

            const imageBlob = await uploadService.camera.capturePhoto(videoRef.current, canvasRef.current);
            const imageUrl = URL.createObjectURL(imageBlob);
            
            setCapturedImage({ blob: imageBlob, url: imageUrl });
            stopCamera();

            if (onCapture) {
                onCapture(imageBlob, imageUrl);
            }

            // Auto-upload if enabled
            if (autoUpload && uploadType && onUpload) {
                await handleUpload(imageBlob);
            }
        } catch (error) {
            console.error('Capture error:', error);
            setCameraError('Failed to capture photo');
        }
    };

    const retakePhoto = () => {
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage.url);
            setCapturedImage(null);
        }
        initializeCamera();
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const handleUpload = async (imageBlob) => {
        if (!onUpload) return;

        try {
            setUploading(true);
            setUploadProgress(0);

            let result;
            
            if (uploadType === 'check-image') {
                result = await uploadService.uploadCheckImage(
                    imageBlob, 
                    paymentId,
                    (progress) => setUploadProgress(progress)
                );
            } else if (uploadType === 'profile-image') {
                result = await uploadService.uploadProfileImage(
                    imageBlob,
                    null,
                    (progress) => setUploadProgress(progress)
                );
            }

            onUpload(result);
        } catch (error) {
            console.error('Upload error:', error);
            setCameraError(uploadService.handleUploadError(error));
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const downloadImage = () => {
        if (capturedImage) {
            const a = document.createElement('a');
            a.href = capturedImage.url;
            a.download = `photo-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleClose = () => {
        stopCamera();
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage.url);
        }
        onClose();
    };

    // Render camera error state
    if (cameraError) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 m-4 max-w-sm w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
                    <p className="text-gray-600 mb-4">{cameraError}</p>
                    <div className="flex space-x-3">
                        <button
                            onClick={initializeCamera}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                        >
                            <RefreshCw className="w-4 h-4 inline mr-2" />
                            Retry
                        </button>
                        <button
                            onClick={handleClose}
                            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="bg-black bg-opacity-75 text-white p-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Camera/Image View */}
            <div className="flex-1 relative overflow-hidden">
                {!capturedImage ? (
                    // Camera View
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                        
                        {!cameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                <div className="text-white text-center">
                                    <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    <p>Starting camera...</p>
                                </div>
                            </div>
                        )}

                        {/* Camera Controls Overlay */}
                        <div className="absolute top-4 right-4">
                            <button
                                onClick={switchCamera}
                                className="bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70"
                                title="Switch Camera"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Capture Guidelines */}
                        <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg pointer-events-none">
                            <div className="absolute top-2 left-2 right-2 text-white text-center text-sm bg-black bg-opacity-50 p-2 rounded">
                                Position {uploadType === 'check-image' ? 'check' : 'subject'} within frame
                            </div>
                        </div>
                    </>
                ) : (
                    // Captured Image View
                    <div className="relative w-full h-full">
                        <img
                            src={capturedImage.url}
                            alt="Captured"
                            className="w-full h-full object-contain"
                        />
                        
                        {/* Upload Progress Overlay */}
                        {uploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                                <div className="text-white text-center">
                                    <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    <p>Uploading... {uploadProgress}%</p>
                                    <div className="w-48 bg-gray-600 rounded-full h-2 mt-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-black bg-opacity-75 p-4">
                {!capturedImage ? (
                    // Camera Controls
                    <div className="flex justify-center">
                        <button
                            onClick={capturePhoto}
                            disabled={!cameraReady}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Camera className="w-8 h-8 text-gray-800" />
                        </button>
                    </div>
                ) : (
                    // Image Controls
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={retakePhoto}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Retake</span>
                        </button>

                        <button
                            onClick={downloadImage}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
                        >
                            <Download className="w-4 h-4" />
                            <span>Save</span>
                        </button>

                        {onUpload && !autoUpload && (
                            <button
                                onClick={() => handleUpload(capturedImage.blob)}
                                disabled={uploading}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                            </button>
                        )}

                        {autoUpload && !uploading && (
                            <div className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>Uploaded</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default CameraCapture;