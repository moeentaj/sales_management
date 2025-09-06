// components/sales/PaymentCollection.js
import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Camera, DollarSign, Check, X, AlertCircle,
    Calendar, CreditCard, Banknote, FileText, Smartphone,
    CheckCircle, Clock, ArrowRight, Plus, Minus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/paymentService';
import { uploadService } from '../../services/uploadService';
import CameraCapture from '../common/CameraCapture';

const MobilePaymentCollection = ({ onClose, onSuccess, preSelectedInvoice = null }) => {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(preSelectedInvoice ? 2 : 1); // 1: Select Invoice, 2: Payment Details, 3: Confirmation
    const [loading, setLoading] = useState(false);

    // Data
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(preSelectedInvoice);
    const [searchTerm, setSearchTerm] = useState('');

    // Payment form data
    const [paymentData, setPaymentData] = useState({
        amount: '',
        payment_method: 'cash',
        payment_date: paymentService.getDefaultPaymentDate(),
        check_number: '',
        bank_reference: '',
        notes: '',
        check_image_url: ''
    });

    // Camera states
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [checkImageUrl, setCheckImageUrl] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Load pending invoices
    useEffect(() => {
        loadPendingInvoices();
    }, []);

    const loadPendingInvoices = async () => {
        try {
            setLoading(true);
            const response = await paymentService.mobile.getMobilePendingInvoices(50);
            setPendingInvoices(response.data);
        } catch (error) {
            console.error('Error loading pending invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter invoices based on search
    const filteredInvoices = pendingInvoices.filter(invoice =>
        invoice.distributor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Payment methods configuration
    const paymentMethods = paymentService.mobile.getPaymentMethods();

    // Select invoice and move to payment step
    const selectInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentData(prev => ({
            ...prev,
            amount: invoice.balance_amount.toString()
        }));
        setCurrentStep(2);
    };

    // Handle payment amount suggestions
    const handleAmountSuggestion = (amount) => {
        setPaymentData(prev => ({
            ...prev,
            amount: amount.toString()
        }));
    };

    // Camera functions
    const startCamera = async () => {
        try {
            setShowCamera(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Camera access denied or not available');
            setShowCamera(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;

            context.drawImage(videoRef.current, 0, 0);

            canvasRef.current.toBlob((blob) => {
                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                setShowCamera(false);

                // Stop camera stream
                if (videoRef.current && videoRef.current.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const handleCameraCapture = async (imageBlob, imageUrl) => {
        try {
            setCapturedImage({ blob: imageBlob, url: imageUrl });

            // If this is for a check payment, upload immediately
            if (paymentData.payment_method === 'check') {
                setUploadProgress(0);

                const result = await uploadService.uploadCheckImage(
                    imageBlob,
                    null, // No payment ID yet - will be updated after payment creation
                    (progress) => setUploadProgress(progress)
                );

                setCheckImageUrl(result.data.url);
                setPaymentData(prev => ({
                    ...prev,
                    check_image_url: result.data.url
                }));
            }

            setShowCamera(false);
        } catch (error) {
            console.error('Camera capture error:', error);
            alert('Failed to capture image. Please try again.');
            setShowCamera(false);
        }
    };

    const stopCamera = async (imageBlob, imageUrl) => {
        try {
            setCapturedImage({ blob: imageBlob, url: imageUrl });

            // If this is for a check payment, upload immediately
            if (paymentData.payment_method === 'check') {
                setUploadProgress(0);

                const result = await uploadService.uploadCheckImage(
                    imageBlob,
                    null, // No payment ID yet - will be updated after payment creation
                    (progress) => setUploadProgress(progress)
                );

                setCheckImageUrl(result.data.url);
                setPaymentData(prev => ({
                    ...prev,
                    check_image_url: result.data.url
                }));
            }

            setShowCamera(false);
        } catch (error) {
            console.error('Camera capture error:', error);
            alert('Failed to capture image. Please try again.');
            setShowCamera(false);
        }
    };

    const removeCheckImage = () => {
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage.url);
        }
        setCapturedImage(null);
        setCheckImageUrl('');
        setPaymentData(prev => ({
            ...prev,
            check_image_url: ''
        }));
    };

    // Validate payment data
    const validatePayment = () => {
        const errors = [];

        if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
            errors.push('Valid amount is required');
        }

        if (parseFloat(paymentData.amount) > parseFloat(selectedInvoice.balance_amount)) {
            errors.push('Amount cannot exceed invoice balance');
        }

        if (paymentData.payment_method === 'check' && !paymentData.check_number) {
            errors.push('Check number is required');
        }

        if (paymentData.payment_method === 'bank_transfer' && !paymentData.bank_reference) {
            errors.push('Bank reference is required');
        }

        return errors;
    };

    // Submit payment
    const submitPayment = async () => {
        const errors = validatePayment();
        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                ...paymentService.formatPaymentForAPI(paymentData),
                invoice_id: selectedInvoice.invoice_id,
                check_image_url: checkImageUrl
            };

            await paymentService.recordPayment(submitData);
            setCurrentStep(3);

            // Auto-close after showing success
            setTimeout(() => {
                onSuccess('Payment recorded successfully');
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Error recording payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Render step 1: Select Invoice
    const renderInvoiceSelection = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-green-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Collect Payment</h2>
                    <button onClick={onClose} className="p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search */}
                <div className="mt-3 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-green-200" />
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-green-500 border border-green-400 rounded-lg text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                </div>
            </div>

            {/* Invoice List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading invoices...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">No pending invoices found</p>
                    </div>
                ) : (
                    filteredInvoices.map(invoice => (
                        <div
                            key={invoice.invoice_id}
                            onClick={() => selectInvoice(invoice)}
                            className={`bg-white border rounded-lg p-4 shadow-sm active:bg-gray-50 ${invoice.days_overdue > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                                    <p className="text-sm text-gray-600">{invoice.distributor_name}</p>
                                    <p className="text-sm text-gray-600">{invoice.city}</p>

                                    <div className="flex items-center mt-2">
                                        {invoice.days_overdue > 0 ? (
                                            <div className="flex items-center text-red-600">
                                                <AlertCircle className="w-4 h-4 mr-1" />
                                                <span className="text-xs font-medium">
                                                    {invoice.days_overdue} days overdue
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-gray-500">
                                                <Calendar className="w-4 h-4 mr-1" />
                                                <span className="text-xs">
                                                    Due: {new Date(invoice.due_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right ml-4">
                                    <div className="text-lg font-bold text-green-600">
                                        ${parseFloat(invoice.balance_amount).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Total: ${parseFloat(invoice.total_amount).toLocaleString()}
                                    </div>
                                    {invoice.paid_amount > 0 && (
                                        <div className="text-xs text-blue-600">
                                            Paid: ${parseFloat(invoice.paid_amount).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    // Render step 2: Payment Details
    const renderPaymentDetails = () => {
        const suggestions = paymentService.calculatePaymentSuggestions(selectedInvoice.balance_amount);

        return (
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="bg-green-600 text-white p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setCurrentStep(1)} className="p-1">
                                <ArrowRight className="w-6 h-6 transform rotate-180" />
                            </button>
                            <div>
                                <h2 className="text-lg font-semibold">Payment Details</h2>
                                <p className="text-sm text-green-200">{selectedInvoice.invoice_number}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Invoice Summary */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold mb-3">Invoice Summary</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Distributor:</span>
                                <span className="font-medium">{selectedInvoice.distributor_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="font-medium">${parseFloat(selectedInvoice.total_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Paid Amount:</span>
                                <span className="font-medium text-green-600">${parseFloat(selectedInvoice.paid_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600 font-medium">Balance Due:</span>
                                <span className="font-bold text-lg text-red-600">${parseFloat(selectedInvoice.balance_amount).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Amount */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold mb-3">Payment Amount</h3>

                        {/* Amount Input */}
                        <div className="relative mb-3">
                            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                                type="number"
                                step="0.01"
                                value={paymentData.amount}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Quick Amount Suggestions */}
                        <div className="grid grid-cols-2 gap-2">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAmountSuggestion(suggestion.amount)}
                                    className="p-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 active:bg-gray-100"
                                >
                                    <div className="font-medium">{suggestion.label}</div>
                                    <div className="text-xs text-gray-500">{suggestion.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold mb-3">Payment Method</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map(method => {
                                const Icon = {
                                    Banknote,
                                    FileText,
                                    CreditCard,
                                    Smartphone
                                }[method.icon];

                                return (
                                    <button
                                        key={method.value}
                                        onClick={() => setPaymentData(prev => ({ ...prev, payment_method: method.value }))}
                                        className={`p-3 border rounded-lg flex flex-col items-center text-center transition-colors ${paymentData.payment_method === method.value
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="w-6 h-6 mb-2" />
                                        <span className="font-medium text-sm">{method.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Method-specific fields */}
                    {paymentData.payment_method === 'check' && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-semibold mb-3">Check Details</h3>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Check Number"
                                    value={paymentData.check_number}
                                    onChange={(e) => setPaymentData(prev => ({ ...prev, check_number: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />

                                {/* Check Image Section */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">Check Photo</label>

                                    {!capturedImage ? (
                                        <button
                                            onClick={startCamera}
                                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700"
                                        >
                                            <Camera className="w-5 h-5" />
                                            <span>Take Photo of Check</span>
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="relative border-2 border-green-500 rounded-lg overflow-hidden">
                                                <img
                                                    src={capturedImage.url}
                                                    alt="Check"
                                                    className="w-full h-40 object-cover"
                                                />
                                                <button
                                                    onClick={removeCheckImage}
                                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {uploadProgress > 0 && uploadProgress < 100 && (
                                                <div className="text-center">
                                                    <div className="text-sm text-blue-600 mb-1">Uploading... {uploadProgress}%</div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${uploadProgress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}

                                            {checkImageUrl && (
                                                <div className="flex items-center text-green-600 text-sm">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Check photo uploaded successfully
                                                </div>
                                            )}

                                            <button
                                                onClick={startCamera}
                                                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-700"
                                            >
                                                <Camera className="w-4 h-4" />
                                                <span>Retake Photo</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {paymentData.payment_method === 'bank_transfer' && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-semibold mb-3">Bank Transfer Details</h3>
                            <input
                                type="text"
                                placeholder="Bank Reference Number"
                                value={paymentData.bank_reference}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, bank_reference: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    )}

                    {/* Payment Date */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold mb-3">Payment Date</h3>
                        <input
                            type="date"
                            value={paymentData.payment_date}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold mb-3">Notes (Optional)</h3>
                        <textarea
                            value={paymentData.notes}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Add payment notes..."
                        />
                    </div>
                </div>

                {/* Action Button */}
                <div className="bg-white border-t border-gray-200 p-4">
                    <button
                        onClick={submitPayment}
                        disabled={loading || !paymentData.amount}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                        <DollarSign className="w-5 h-5" />
                        <span>{loading ? 'Recording...' : 'Record Payment'}</span>
                    </button>
                </div>
            </div>
        );
    };

    // Render step 3: Confirmation
    const renderConfirmation = () => (
        <div className="flex flex-col h-full items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Recorded!</h2>
            <p className="text-gray-600 mb-4">
                ${parseFloat(paymentData.amount).toLocaleString()} payment has been successfully recorded for invoice {selectedInvoice.invoice_number}
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-sm">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">${parseFloat(paymentData.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Method:</span>
                        <span className="font-medium capitalize">{paymentData.payment_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">{new Date(paymentData.payment_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                        <span>Remaining Balance:</span>
                        <span className="font-medium">
                            ${(parseFloat(selectedInvoice.balance_amount) - parseFloat(paymentData.amount)).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    // Camera Modal
    const renderCameraModal = () => (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 relative">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                <div className="absolute top-4 left-4 right-4 flex justify-between">
                    <button
                        onClick={stopCamera}
                        className="bg-black bg-opacity-50 text-white p-3 rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
                        <span className="text-sm">Position check in frame</span>
                    </div>
                </div>
            </div>

            <div className="bg-black p-6 flex justify-center">
                <button
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center"
                >
                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                </button>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white z-50">
            {showCamera && (
                <CameraCapture
                    title="Capture Check Photo"
                    uploadType="check-image"
                    onCapture={handleCameraCapture}
                    onClose={handleCameraClose}
                    autoUpload={false}
                />
            )}
            {currentStep === 1 && renderInvoiceSelection()}
            {currentStep === 2 && renderPaymentDetails()}
            {currentStep === 3 && renderConfirmation()}
        </div>
    );
};

export default MobilePaymentCollection;