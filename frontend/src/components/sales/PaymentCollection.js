// components/sales/PaymentCollection.js - COMPLETE IMPLEMENTATION
import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Camera, DollarSign, Check, X, AlertCircle,
    Calendar, CreditCard, Banknote, FileText, Smartphone,
    CheckCircle, Clock, ArrowRight, Plus, Minus, ArrowLeft,
    Upload, Download, RotateCcw, Loader
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/paymentService';
import CameraCapture from '../common/CameraCapture';

const MobilePaymentCollection = ({ onClose, onSuccess, preSelectedInvoice = null }) => {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(preSelectedInvoice ? 2 : 1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Data states
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(preSelectedInvoice);
    const [searchTerm, setSearchTerm] = useState('');

    // Payment form data
    const [paymentData, setPaymentData] = useState({
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0], // Today's date
        check_number: '',
        bank_reference: '',
        notes: '',
        check_image_url: ''
    });

    // Camera and upload states
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Load pending invoices on component mount
    useEffect(() => {
        if (currentStep === 1) {
            loadPendingInvoices();
        }
    }, [currentStep]);

    // Set initial amount when invoice is selected
    useEffect(() => {
        if (selectedInvoice && !paymentData.amount) {
            setPaymentData(prev => ({
                ...prev,
                amount: selectedInvoice.balance_amount?.toString() || ''
            }));
        }
    }, [selectedInvoice]);

    const loadPendingInvoices = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await paymentService.getPendingInvoices(null, 50);
            
            if (response.success && response.data) {
                // Sort by priority: overdue first, then by due date
                const sortedInvoices = response.data.sort((a, b) => {
                    const aOverdue = a.days_overdue || 0;
                    const bOverdue = b.days_overdue || 0;
                    
                    if (aOverdue > 0 && bOverdue === 0) return -1;
                    if (aOverdue === 0 && bOverdue > 0) return 1;
                    if (aOverdue > 0 && bOverdue > 0) {
                        return bOverdue - aOverdue; // Most overdue first
                    }
                    return new Date(a.due_date) - new Date(b.due_date);
                });
                
                setPendingInvoices(sortedInvoices);
            } else {
                setPendingInvoices([]);
                setError('Failed to load pending invoices');
            }
        } catch (error) {
            console.error('Error loading pending invoices:', error);
            setPendingInvoices([]);
            setError('Failed to load pending invoices. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Filter invoices based on search term
    const filteredInvoices = pendingInvoices.filter(invoice =>
        invoice.distributor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ''
    );

    // Payment methods configuration
    const paymentMethods = [
        { 
            value: 'cash', 
            label: 'Cash', 
            icon: Banknote, 
            description: 'Cash payment',
            color: 'green'
        },
        { 
            value: 'check', 
            label: 'Check', 
            icon: FileText, 
            description: 'Check payment',
            color: 'blue'
        },
        { 
            value: 'bank_transfer', 
            label: 'Bank Transfer', 
            icon: CreditCard, 
            description: 'Bank transfer',
            color: 'purple'
        },
        { 
            value: 'online', 
            label: 'Online', 
            icon: Smartphone, 
            description: 'Online payment',
            color: 'indigo'
        }
    ];

    // Select invoice and move to payment step
    const selectInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentData(prev => ({
            ...prev,
            amount: invoice.balance_amount?.toString() || ''
        }));
        setCurrentStep(2);
        setError('');
    };

    // Handle payment amount suggestions
    const handleAmountSuggestion = (amount) => {
        setPaymentData(prev => ({
            ...prev,
            amount: amount.toString()
        }));
    };

    // Handle camera capture
    const handleCameraCapture = async (imageBlob, imageUrl) => {
        try {
            setCapturedImage({ blob: imageBlob, url: imageUrl });
            setShowCamera(false);
            
            // Optionally upload immediately
            if (imageBlob) {
                setUploading(true);
                try {
                    const uploadResult = await uploadCheckImage(imageBlob);
                    setPaymentData(prev => ({
                        ...prev,
                        check_image_url: uploadResult.data?.image_url || ''
                    }));
                } catch (uploadError) {
                    console.error('Upload failed:', uploadError);
                    // Keep the captured image but don't set URL
                } finally {
                    setUploading(false);
                }
            }
        } catch (error) {
            console.error('Camera capture error:', error);
            setError('Failed to capture image');
        }
    };

    const handleCameraClose = () => {
        setShowCamera(false);
    };

    // Upload check image
    const uploadCheckImage = async (imageBlob) => {
        const formData = new FormData();
        formData.append('check_image', imageBlob);
        
        const response = await fetch('/api/upload/check-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        return await response.json();
    };

    // Remove captured image
    const removeCheckImage = () => {
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage.url);
        }
        setCapturedImage(null);
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

        if (!selectedInvoice?.balance_amount) {
            errors.push('Invalid invoice selected');
        } else if (parseFloat(paymentData.amount) > parseFloat(selectedInvoice.balance_amount)) {
            errors.push('Amount cannot exceed invoice balance');
        }

        if (paymentData.payment_method === 'check' && !paymentData.check_number.trim()) {
            errors.push('Check number is required');
        }

        if (paymentData.payment_method === 'bank_transfer' && !paymentData.bank_reference.trim()) {
            errors.push('Bank reference is required');
        }

        if (!paymentData.payment_date) {
            errors.push('Payment date is required');
        }

        return errors;
    };

    // Submit payment
    const submitPayment = async () => {
        const errors = validatePayment();
        if (errors.length > 0) {
            setError(errors.join('\n'));
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const submitData = {
                invoice_id: selectedInvoice.invoice_id,
                amount: parseFloat(paymentData.amount),
                payment_method: paymentData.payment_method,
                payment_date: paymentData.payment_date,
                check_number: paymentData.check_number || null,
                bank_reference: paymentData.bank_reference || null,
                notes: paymentData.notes || null,
                check_image_url: paymentData.check_image_url || null
            };

            const response = await paymentService.recordPayment(submitData);
            
            if (response.success) {
                setCurrentStep(3);
                
                // Auto-close after showing success
                setTimeout(() => {
                    if (onSuccess) onSuccess('Payment recorded successfully');
                    if (onClose) onClose();
                }, 2500);
            } else {
                setError(response.message || 'Failed to record payment');
            }

        } catch (error) {
            console.error('Error recording payment:', error);
            setError(error.response?.data?.message || 'Error recording payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Get payment amount suggestions
    const getAmountSuggestions = () => {
        if (!selectedInvoice?.balance_amount) return [];
        
        const balance = parseFloat(selectedInvoice.balance_amount);
        return [
            { label: 'Full Amount', amount: balance },
            { label: '50%', amount: Math.round(balance * 0.5 * 100) / 100 },
            { label: '25%', amount: Math.round(balance * 0.25 * 100) / 100 }
        ];
    };

    // Format currency display
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    // Get payment method color
    const getMethodColor = (method) => {
        const methodConfig = paymentMethods.find(m => m.value === method);
        return methodConfig?.color || 'gray';
    };

    // Render step 1: Invoice Selection
    const renderInvoiceSelection = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Select Invoice</h2>
                        <p className="text-sm text-gray-600">Choose invoice to collect payment</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by distributor or invoice number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Invoice List */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading invoices...</p>
                        </div>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                        <FileText className="w-16 h-16 mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">No pending invoices</h3>
                        <p className="text-center text-gray-400">
                            {searchTerm ? 'No invoices match your search' : 'All invoices have been paid'}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-blue-600 hover:text-blue-800"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 p-4">
                        {filteredInvoices.map((invoice) => (
                            <div
                                key={invoice.invoice_id}
                                onClick={() => selectInvoice(invoice)}
                                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md active:bg-gray-50 cursor-pointer transition-all duration-200"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                                            {invoice.days_overdue > 0 && (
                                                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                                                    {invoice.days_overdue} days overdue
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400" />
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3 font-medium">{invoice.distributor_name}</p>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">Balance Due</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {formatCurrency(invoice.balance_amount)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Due Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {new Date(invoice.due_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // Render step 2: Payment Details
    const renderPaymentDetails = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => setCurrentStep(1)} 
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
                        <p className="text-sm text-gray-600">Enter payment details</p>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Invoice Summary */}
            <div className="p-4 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-blue-900">{selectedInvoice?.invoice_number}</p>
                        <p className="text-sm text-blue-700">{selectedInvoice?.distributor_name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-blue-900">
                            {formatCurrency(selectedInvoice?.balance_amount)}
                        </p>
                        <p className="text-sm text-blue-700">Balance Due</p>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
                    </div>
                </div>
            )}

            {/* Payment Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={selectedInvoice?.balance_amount || ''}
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-lg font-semibold"
                            placeholder="0.00"
                        />
                    </div>
                    
                    {/* Amount Suggestions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {getAmountSuggestions().map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => handleAmountSuggestion(suggestion.amount)}
                                className="px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors font-medium"
                            >
                                {suggestion.label} ({formatCurrency(suggestion.amount)})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method *</label>
                    <div className="space-y-3">
                        {paymentMethods.map((method) => {
                            const IconComponent = method.icon;
                            const isSelected = paymentData.payment_method === method.value;
                            return (
                                <button
                                    key={method.value}
                                    onClick={() => setPaymentData(prev => ({ ...prev, payment_method: method.value }))}
                                    className={`w-full flex items-center space-x-4 p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                                        isSelected
                                            ? `border-${method.color}-500 bg-${method.color}-50 shadow-md`
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg ${
                                        isSelected ? `bg-${method.color}-100` : 'bg-gray-100'
                                    }`}>
                                        <IconComponent className={`w-6 h-6 ${
                                            isSelected ? `text-${method.color}-600` : 'text-gray-600'
                                        }`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-semibold ${
                                            isSelected ? `text-${method.color}-900` : 'text-gray-900'
                                        }`}>
                                            {method.label}
                                        </p>
                                        <p className={`text-sm ${
                                            isSelected ? `text-${method.color}-700` : 'text-gray-600'
                                        }`}>
                                            {method.description}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <div className={`p-1 rounded-full bg-${method.color}-500`}>
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Check Number and Image (if check selected) */}
                {paymentData.payment_method === 'check' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Check Number *</label>
                            <input
                                type="text"
                                value={paymentData.check_number}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, check_number: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                placeholder="Enter check number"
                            />
                        </div>
                        
                        {/* Check Image Capture */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Check Photo (Optional)</label>
                            {capturedImage ? (
                                <div className="relative">
                                    <img 
                                        src={capturedImage.url} 
                                        alt="Check" 
                                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                                    />
                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <button
                                            onClick={() => setShowCamera(true)}
                                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={removeCheckImage}
                                            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                                            <div className="text-white text-center">
                                                <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                <p className="text-sm">Uploading...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowCamera(true)}
                                    className="w-full flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-all duration-200"
                                >
                                    <Camera className="w-6 h-6" />
                                    <span className="font-medium">Take Check Photo</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Bank Reference (if bank transfer selected) */}
                {paymentData.payment_method === 'bank_transfer' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Reference Number *</label>
                        <input
                            type="text"
                            value={paymentData.bank_reference}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, bank_reference: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            placeholder="Enter bank reference or transaction ID"
                        />
                    </div>
                )}

                {/* Payment Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="date"
                            value={paymentData.payment_date}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
                        placeholder="Add any additional notes about this payment..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {paymentData.notes?.length || 0}/500 characters
                    </p>
                </div>
            </div>

            {/* Submit Button */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <button
                    onClick={submitPayment}
                    disabled={loading || uploading}
                    className="w-full bg-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            <span>Recording Payment...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-6 h-6" />
                            <span>Record Payment</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    // Render step 3: Confirmation
    const renderConfirmation = () => (
        <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-gradient-to-b from-green-50 to-white">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <CheckCircle className="w-16 h-16 text-green-600" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-3">Payment Recorded!</h2>
            <p className="text-gray-600 mb-6 text-lg max-w-md">
                {formatCurrency(paymentData.amount)} payment has been successfully recorded for invoice {selectedInvoice?.invoice_number}
            </p>

            <div className="bg-white border border-green-200 rounded-xl p-6 w-full max-w-md shadow-lg">
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment Amount:</span>
                        <span className="font-bold text-green-700 text-lg">
                            {formatCurrency(paymentData.amount)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-semibold capitalize">
                            {paymentData.payment_method.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment Date:</span>
                        <span className="font-semibold">
                            {new Date(paymentData.payment_date).toLocaleDateString()}
                        </span>
                    </div>
                    {paymentData.check_number && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Check Number:</span>
                            <span className="font-semibold">{paymentData.check_number}</span>
                        </div>
                    )}
                    {paymentData.bank_reference && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Bank Reference:</span>
                            <span className="font-semibold">{paymentData.bank_reference}</span>
                        </div>
                    )}
                    <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Previous Balance:</span>
                            <span className="font-semibold">
                                {formatCurrency(selectedInvoice?.balance_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Payment:</span>
                            <span className="font-semibold text-green-600">
                                -{formatCurrency(paymentData.amount)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                            <span className="text-gray-900">Remaining Balance:</span>
                            <span className={`${
                                (parseFloat(selectedInvoice?.balance_amount || 0) - parseFloat(paymentData.amount)) <= 0 
                                    ? 'text-green-600' 
                                    : 'text-orange-600'
                            }`}>
                                {formatCurrency(
                                    Math.max(
                                        parseFloat(selectedInvoice?.balance_amount || 0) - parseFloat(paymentData.amount),
                                        0
                                    )
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            <div className="mt-6">
                {(parseFloat(selectedInvoice?.balance_amount || 0) - parseFloat(paymentData.amount)) <= 0 ? (
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                        ✅ Invoice Fully Paid
                    </div>
                ) : (
                    <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-semibold">
                        💰 Partial Payment Recorded
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col space-y-3 w-full max-w-md">
                <button
                    onClick={() => {
                        // Reset form and go back to invoice selection
                        setCurrentStep(1);
                        setSelectedInvoice(null);
                        setPaymentData({
                            amount: '',
                            payment_method: 'cash',
                            payment_date: new Date().toISOString().split('T')[0],
                            check_number: '',
                            bank_reference: '',
                            notes: '',
                            check_image_url: ''
                        });
                        setCapturedImage(null);
                        setError('');
                        loadPendingInvoices();
                    }}
                    className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                    Record Another Payment
                </button>
                
                <button
                    onClick={() => {
                        if (onSuccess) onSuccess('Payment recorded successfully');
                        if (onClose) onClose();
                    }}
                    className="bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Camera Modal */}
            {showCamera && (
                <CameraCapture
                    title="Capture Check Photo"
                    uploadType="check-image"
                    onCapture={handleCameraCapture}
                    onClose={handleCameraClose}
                    autoUpload={false}
                />
            )}
            
            {/* Main Content */}
            {currentStep === 1 && renderInvoiceSelection()}
            {currentStep === 2 && renderPaymentDetails()}
            {currentStep === 3 && renderConfirmation()}
        </div>
    );
};

export default MobilePaymentCollection;