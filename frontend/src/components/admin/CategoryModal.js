// frontend/src/components/admin/CategoryModal.js - Complete Category Management Modal
import React, { useState, useEffect } from 'react';
import {
    X, Save, Tag, FileText, AlertCircle, CheckCircle, 
    Loader, BarChart3, Package, TrendingUp, DollarSign,
    Hash, Eye, Users
} from 'lucide-react';
import { categoryService } from '../../services/categoryService';

const CategoryModal = ({ 
    category = null, 
    isOpen, 
    onClose, 
    onSuccess,
    existingCategories = []
}) => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState('basic'); // basic, analytics

    // Form data
    const [formData, setFormData] = useState(
        category || categoryService.utils.getDefaultCategoryData()
    );

    // Reset form when category changes
    useEffect(() => {
        if (category) {
            setFormData({
                ...category,
                display_order: category.display_order || categoryService.utils.generateDisplayOrder(existingCategories)
            });
        } else {
            setFormData({
                ...categoryService.utils.getDefaultCategoryData(),
                display_order: categoryService.utils.generateDisplayOrder(existingCategories)
            });
        }
        setErrors({});
        setActiveTab('basic');
    }, [category, isOpen, existingCategories]);

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

        // Real-time validation for category name
        if (field === 'category_name') {
            const validation = categoryService.utils.validateCategoryName(
                value, 
                existingCategories, 
                category?.category_id
            );
            
            if (!validation.valid) {
                setErrors(prev => ({
                    ...prev,
                    category_name: validation.message
                }));
            }
        }
    };

    const validateForm = () => {
        const validationErrors = categoryService.utils.validateCategory(formData, !!category);
        
        // Additional unique name validation
        const nameValidation = categoryService.utils.validateCategoryName(
            formData.category_name, 
            existingCategories, 
            category?.category_id
        );
        
        if (!nameValidation.valid) {
            validationErrors.category_name = nameValidation.message;
        }

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
            
            const submitData = {
                category_name: formData.category_name.trim(),
                description: formData.description?.trim() || null,
                display_order: parseInt(formData.display_order) || 0
            };
            
            if (category) {
                await categoryService.updateCategory(category.category_id, submitData);
            } else {
                await categoryService.createCategory(submitData);
            }
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving category:', error);
            setErrors({ 
                submit: error.response?.data?.message || 'Failed to save category' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateOrder = () => {
        const newOrder = categoryService.utils.generateDisplayOrder(existingCategories);
        handleInputChange('display_order', newOrder);
    };

    // Calculate metrics for existing category
    const categoryMetrics = category ? categoryService.utils.calculateCategoryMetrics(category) : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Tag className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {category ? 'Edit Category' : 'Add New Category'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {category ? 
                                    'Update category information and settings' : 
                                    'Create a new product category'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'basic'
                                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Tag className="w-4 h-4 mr-2 inline" />
                        Basic Information
                    </button>
                    {category && (
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${
                                activeTab === 'analytics'
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4 mr-2 inline" />
                            Analytics
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Error Alert */}
                    {errors.submit && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-red-800">Error</h4>
                                <p className="text-sm text-red-700">{errors.submit}</p>
                            </div>
                        </div>
                    )}

                    {/* Basic Information Tab */}
                    {activeTab === 'basic' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Category Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Category Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.category_name}
                                        onChange={(e) => handleInputChange('category_name', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                            errors.category_name ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter category name"
                                        required
                                    />
                                    {errors.category_name && (
                                        <p className="mt-1 text-xs text-red-600">{errors.category_name}</p>
                                    )}
                                </div>

                                {/* Display Order */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Display Order
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="number"
                                            value={formData.display_order || ''}
                                            onChange={(e) => handleInputChange('display_order', e.target.value)}
                                            className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                                errors.display_order ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                            placeholder="Order"
                                            min="0"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGenerateOrder}
                                            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                            title="Generate next order"
                                        >
                                            <Hash className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {errors.display_order && (
                                        <p className="mt-1 text-xs text-red-600">{errors.display_order}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Lower numbers appear first in lists
                                    </p>
                                </div>

                                {/* Status Toggle (only for edit) */}
                                {category && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status
                                        </label>
                                        <div className="flex items-center space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => handleInputChange('is_active', !formData.is_active)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    formData.is_active ? 'bg-purple-600' : 'bg-gray-200'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        formData.is_active ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                            <span className={`text-sm font-medium ${
                                                formData.is_active ? 'text-purple-600' : 'text-gray-500'
                                            }`}>
                                                {formData.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Inactive categories won't appear in product forms
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    rows={3}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                        errors.description ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="Optional description for this category"
                                />
                                {errors.description && (
                                    <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    {(formData.description || '').length}/500 characters
                                </p>
                            </div>
                        </form>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && category && categoryMetrics && (
                        <div className="space-y-6">
                            {/* Category Overview */}
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
                                <h4 className="flex items-center text-lg font-medium text-gray-900 mb-4">
                                    <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                                    Category Performance
                                </h4>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                                            <Package className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {categoryMetrics.totalProducts}
                                        </p>
                                        <p className="text-sm text-gray-600">Total Products</p>
                                    </div>
                                    
                                    <div className="text-center">
                                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <p className="text-2xl font-bold text-green-600">
                                            {categoryMetrics.activeProducts}
                                        </p>
                                        <p className="text-sm text-gray-600">Active Products</p>
                                    </div>
                                    
                                    <div className="text-center">
                                        <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-2">
                                            <DollarSign className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <p className="text-2xl font-bold text-yellow-600">
                                            {categoryService.utils.formatNumber(categoryMetrics.avgPrice, 'currency')}
                                        </p>
                                        <p className="text-sm text-gray-600">Avg. Price</p>
                                    </div>
                                    
                                    <div className="text-center">
                                        <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
                                            <TrendingUp className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {categoryService.utils.formatNumber(categoryMetrics.productUtilization, 'percentage')}
                                        </p>
                                        <p className="text-sm text-gray-600">Utilization</p>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <h5 className="font-medium text-gray-900 mb-3">Product Breakdown</h5>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Active Products:</span>
                                            <span className="font-medium text-green-600">
                                                {categoryMetrics.activeProducts}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Inactive Products:</span>
                                            <span className="font-medium text-red-600">
                                                {categoryMetrics.inactiveProducts}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Products:</span>
                                            <span className="font-medium text-blue-600">
                                                {categoryMetrics.totalProducts}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <h5 className="font-medium text-gray-900 mb-3">Financial Metrics</h5>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Revenue:</span>
                                            <span className="font-medium text-green-600">
                                                {categoryService.utils.formatNumber(categoryMetrics.totalRevenue, 'currency')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Revenue/Product:</span>
                                            <span className="font-medium text-blue-600">
                                                {categoryService.utils.formatNumber(categoryMetrics.revenuePerProduct, 'currency')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Average Price:</span>
                                            <span className="font-medium text-purple-600">
                                                {categoryService.utils.formatNumber(categoryMetrics.avgPrice, 'currency')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Category Information */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h5 className="font-medium text-gray-900 mb-3">Category Information</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Created:</span>
                                        <span className="ml-2 font-medium">
                                            {new Date(category.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Last Updated:</span>
                                        <span className="ml-2 font-medium">
                                            {new Date(category.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Display Order:</span>
                                        <span className="ml-2 font-medium">
                                            {category.display_order}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Status:</span>
                                        <span className={`ml-2 font-medium ${
                                            category.is_active ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {category.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                        {category && (
                            <>
                                <Eye className="w-4 h-4" />
                                <span>ID: {category.category_id}</span>
                            </>
                        )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        
                        {activeTab === 'basic' && (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                                {loading ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                <span>{loading ? 'Saving...' : 'Save Category'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryModal;