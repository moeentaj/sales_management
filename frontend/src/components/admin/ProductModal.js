// frontend/src/components/admin/ProductModal.js - Complete Product Management Modal
import React, { useState, useEffect } from 'react';
import {
    X, Save, Package, DollarSign, Tag, FileText, 
    AlertCircle, CheckCircle, Loader, Plus, Minus,
    BarChart3, TrendingUp, Calendar, Eye, Upload
} from 'lucide-react';
import { productService } from '../../services/productService';

const ProductModal = ({ 
    product = null, 
    isOpen, 
    onClose, 
    onSuccess, 
    categories = [] 
}) => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState('basic'); // basic, pricing, details

    // Form data
    const [formData, setFormData] = useState(
        product || productService.utils.getDefaultProductData()
    );

    // Reset form when product changes
    useEffect(() => {
        if (product) {
            setFormData(product);
        } else {
            setFormData(productService.utils.getDefaultProductData());
        }
        setErrors({});
        setActiveTab('basic');
    }, [product, isOpen]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const validationErrors = productService.utils.validateProduct(formData, !!product);
        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setActiveTab('basic'); // Switch to basic tab if there are errors
            return;
        }

        try {
            setLoading(true);
            
            if (product) {
                await productService.updateProduct(product.product_id, formData);
            } else {
                await productService.createProduct(formData);
            }
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
            setErrors({ 
                submit: error.response?.data?.message || 'Failed to save product' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCode = () => {
        const code = productService.utils.generateProductCode(formData.product_name, formData.category);
        handleInputChange('product_code', code);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {product ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {product ? `Product ID: ${product.product_id}` : 'Create a new product in your catalog'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex px-6">
                        {[
                            { id: 'basic', label: 'Basic Info', icon: Package },
                            { id: 'pricing', label: 'Pricing', icon: DollarSign },
                            { id: 'details', label: 'Details', icon: FileText }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden">
                    <div className="p-6 max-h-96 overflow-y-auto">
                        {/* Error Display */}
                        {errors.submit && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    <p className="text-red-800">{errors.submit}</p>
                                </div>
                            </div>
                        )}

                        {/* Basic Info Tab */}
                        {activeTab === 'basic' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Product Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Product Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.product_name}
                                            onChange={(e) => handleInputChange('product_name', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                errors.product_name ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                            placeholder="Enter product name"
                                        />
                                        {errors.product_name && (
                                            <p className="mt-1 text-sm text-red-600">{errors.product_name}</p>
                                        )}
                                    </div>

                                    {/* Product Code */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Product Code *
                                        </label>
                                        <div className="flex space-x-2">
                                            <input
                                                type="text"
                                                value={formData.product_code}
                                                onChange={(e) => handleInputChange('product_code', e.target.value)}
                                                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                    errors.product_code ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                                placeholder="Enter product code"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateCode}
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                                title="Generate Code"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {errors.product_code && (
                                            <p className="mt-1 text-sm text-red-600">{errors.product_code}</p>
                                        )}
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => handleInputChange('category', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select category</option>
                                            {categories.map(category => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Unit of Measure */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Unit of Measure
                                        </label>
                                        <select
                                            value={formData.unit_of_measure}
                                            onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="piece">Piece</option>
                                            <option value="kg">Kilogram</option>
                                            <option value="liter">Liter</option>
                                            <option value="meter">Meter</option>
                                            <option value="box">Box</option>
                                            <option value="dozen">Dozen</option>
                                            <option value="pack">Pack</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter product description"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Active Product</span>
                                    </label>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Inactive products won't appear in invoices or sales
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Pricing Tab */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Unit Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Unit Price (PKR) *
                                        </label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.unit_price}
                                                onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || '')}
                                                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                    errors.unit_price ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {errors.unit_price && (
                                            <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>
                                        )}
                                    </div>

                                    {/* Tax Rate */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tax Rate (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={formData.tax_rate}
                                            onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Price Preview */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Price Preview</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Base Price:</span>
                                            <span>PKR {(formData.unit_price || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tax ({formData.tax_rate || 0}%):</span>
                                            <span>PKR {((formData.unit_price || 0) * (formData.tax_rate || 0) / 100).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-medium border-t pt-2">
                                            <span>Total Price:</span>
                                            <span>PKR {((formData.unit_price || 0) * (1 + (formData.tax_rate || 0) / 100)).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <div className="space-y-6">
                                {/* Product Analytics (if editing) */}
                                {product && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            Product Performance
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-blue-600">Total Sales</p>
                                                <p className="font-medium text-blue-800">
                                                    {product.total_sold || 0} units
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-blue-600">Revenue</p>
                                                <p className="font-medium text-blue-800">
                                                    PKR {(product.total_revenue || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-blue-600">Created</p>
                                                <p className="font-medium text-blue-800">
                                                    {new Date(product.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-blue-600">Last Updated</p>
                                                <p className="font-medium text-blue-800">
                                                    {new Date(product.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Additional Information */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-gray-700">Additional Information</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">
                                                Barcode
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.barcode || ''}
                                                onChange={(e) => handleInputChange('barcode', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Product barcode"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">
                                                Brand
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.brand || ''}
                                                onChange={(e) => handleInputChange('brand', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Product brand"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">
                                                Weight (kg)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.weight || ''}
                                                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || '')}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">
                                                Min. Order Qty
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.min_order_quantity || ''}
                                                onChange={(e) => handleInputChange('min_order_quantity', parseInt(e.target.value) || '')}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="1"
                                            />
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Internal Notes
                                        </label>
                                        <textarea
                                            value={formData.notes || ''}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Internal notes about this product"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                * Required fields
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{product ? 'Update Product' : 'Create Product'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;