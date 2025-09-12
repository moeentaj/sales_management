// frontend/src/components/admin/CategoryModal.js - Fixed with Success Message
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
    const [activeTab, setActiveTab] = useState('basic');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

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
        setShowSuccess(false);
        setSuccessMessage('');
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
        const validationErrors = categoryService.utils.validateCategory(formData, !category);
        
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

    const resetForm = () => {
        setFormData({
            ...categoryService.utils.getDefaultCategoryData(),
            display_order: categoryService.utils.generateDisplayOrder(existingCategories)
        });
        setErrors({});
        setActiveTab('basic');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setActiveTab('basic');
            return;
        }

        try {
            setLoading(true);
            setShowSuccess(false);
            
            const submitData = {
                category_name: formData.category_name.trim(),
                description: formData.description?.trim() || null,
                display_order: parseInt(formData.display_order) || 0
            };
            
            let response;
            if (category) {
                response = await categoryService.updateCategory(category.category_id, submitData);
                setSuccessMessage('Category updated successfully!');
            } else {
                response = await categoryService.createCategory(submitData);
                setSuccessMessage('Category created successfully!');
            }
            
            // Show success message
            setShowSuccess(true);
            
            // Call onSuccess to refresh parent component data
            if (onSuccess) {
                onSuccess();
            }
            
            // For new categories, reset form after 2 seconds for next entry
            if (!category) {
                setTimeout(() => {
                    resetForm();
                    setShowSuccess(false);
                }, 2000);
            } else {
                // For updates, close modal after 2 seconds
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
            
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
                                {category ? 'Update category information' : 'Create a new category for organizing products'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-green-800">Success!</h4>
                            <p className="text-sm text-green-700">{successMessage}</p>
                            {!category && (
                                <p className="text-xs text-green-600 mt-1">Form will reset in 2 seconds for next category...</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveTab('basic')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'basic'
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Tag className="w-4 h-4 mr-2 inline" />
                            Basic Info
                        </button>
                        
                        {category && categoryMetrics && (
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'analytics'
                                        ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <BarChart3 className="w-4 h-4 mr-2 inline" />
                                Analytics
                            </button>
                        )}
                    </nav>
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
                            {/* Category Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.category_name}
                                    onChange={(e) => handleInputChange('category_name', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                        errors.category_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter category name"
                                    disabled={loading}
                                />
                                {errors.category_name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.category_name}</p>
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
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Category description (optional)"
                                    disabled={loading}
                                />
                            </div>

                            {/* Display Order */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Display Order
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.display_order || ''}
                                        onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="0"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateOrder}
                                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                        disabled={loading}
                                    >
                                        Auto
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Lower numbers appear first. Click "Auto" to set next available order.
                                </p>
                            </div>
                        </form>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && category && categoryMetrics && (
                        <div className="space-y-6">
                            {/* Category Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-purple-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <Package className="w-8 h-8 text-purple-600" />
                                        <div>
                                            <p className="text-sm font-medium text-purple-600">Total Products</p>
                                            <p className="text-2xl font-bold text-purple-900">
                                                {categoryService.utils.formatNumber(categoryMetrics.totalProducts)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <DollarSign className="w-8 h-8 text-green-600" />
                                        <div>
                                            <p className="text-sm font-medium text-green-600">Total Revenue</p>
                                            <p className="text-2xl font-bold text-green-900">
                                                {categoryService.utils.formatNumber(categoryMetrics.totalRevenue, 'currency')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <TrendingUp className="w-8 h-8 text-blue-600" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-600">Active Products</p>
                                            <p className="text-2xl font-bold text-blue-900">
                                                {categoryService.utils.formatNumber(categoryMetrics.activeProducts)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Metrics */}
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Active Products:</span>
                                            <span className="font-medium text-green-600">
                                                {categoryService.utils.formatNumber(categoryMetrics.activeProducts)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Inactive Products:</span>
                                            <span className="font-medium text-orange-600">
                                                {categoryService.utils.formatNumber(categoryMetrics.inactiveProducts)}
                                            </span>
                                        </div>
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
                                <h5 className="text-md font-semibold text-gray-900 mb-3">Category Information</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-purple-600">Created</p>
                                            <p className="font-medium text-purple-800">
                                                {new Date(category.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-blue-600">Display Order</p>
                                            <p className="font-medium text-blue-800">
                                                #{category.display_order}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-green-600">Status</p>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                category.is_active ? 'bg-green-100 text-green-600' : 'text-red-600'
                                            }`}>
                                                {category.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-blue-600">Last Updated</p>
                                            <p className="font-medium text-blue-800">
                                                {new Date(category.updated_at).toLocaleDateString()}
                                            </p>
                                        </div>
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
                            disabled={loading}
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