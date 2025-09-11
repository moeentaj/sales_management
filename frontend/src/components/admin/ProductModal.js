// frontend/src/components/admin/ProductModal.js - Updated with Category Management
import React, { useState, useEffect } from 'react';
import {
    X, Save, Package, DollarSign, Tag, FileText, 
    AlertCircle, CheckCircle, Loader, Plus, Minus,
    BarChart3, TrendingUp, Calendar, Eye, Upload, Settings
} from 'lucide-react';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import CategoryModal from './CategoryModal';

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

    // Category management states
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [allCategories, setAllCategories] = useState(categories);

    // Form data
    const [formData, setFormData] = useState(
        product || productService.utils.getDefaultProductData()
    );

    // Load categories when modal opens
    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

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

    const loadCategories = async () => {
        try {
            const response = await categoryService.getActiveCategoriesSimple();
            if (response.success) {
                setAllCategories(response.data);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

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
        const validationErrors = productService.utils.validateProduct(formData, !product);
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

    const handleCategorySuccess = () => {
        loadCategories(); // Reload categories after add/edit
        setShowCategoryModal(false);
        setSelectedCategory(null);
    };

    const handleAddCategory = () => {
        setSelectedCategory(null);
        setShowCategoryModal(true);
    };

    const handleEditCategory = (categoryName) => {
        const category = allCategories.find(cat => cat.value === categoryName);
        if (category) {
            setSelectedCategory(category);
            setShowCategoryModal(true);
        }
    };

    if (!isOpen) return null;

    return (
        <>
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
                                    {product ? 
                                        'Update product information and settings' : 
                                        'Create a new product for your catalog'
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
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Package className="w-4 h-4 mr-2 inline" />
                            Basic Info
                        </button>
                        <button
                            onClick={() => setActiveTab('pricing')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${
                                activeTab === 'pricing'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <DollarSign className="w-4 h-4 mr-2 inline" />
                            Pricing
                        </button>
                        {product && (
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-6 py-3 text-sm font-medium transition-colors ${
                                    activeTab === 'details'
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <BarChart3 className="w-4 h-4 mr-2 inline" />
                                Details
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
                                    {/* Product Name */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Product Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.product_name}
                                            onChange={(e) => handleInputChange('product_name', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                errors.product_name ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                            placeholder="Enter product name"
                                            required
                                        />
                                        {errors.product_name && (
                                            <p className="mt-1 text-xs text-red-600">{errors.product_name}</p>
                                        )}
                                    </div>

                                    {/* Product Code */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Product Code
                                        </label>
                                        <div className="flex space-x-2">
                                            <input
                                                type="text"
                                                value={formData.product_code}
                                                onChange={(e) => handleInputChange('product_code', e.target.value)}
                                                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                    errors.product_code ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                                placeholder="Auto-generated or custom"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateCode}
                                                className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                title="Generate product code"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {errors.product_code && (
                                            <p className="mt-1 text-xs text-red-600">{errors.product_code}</p>
                                        )}
                                    </div>

                                    {/* Category with Management */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category
                                        </label>
                                        <div className="flex space-x-2">
                                            <select
                                                value={formData.category}
                                                onChange={(e) => handleInputChange('category', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">Select category</option>
                                                {allCategories.map(category => (
                                                    <option key={category.id || category.value} value={category.value}>
                                                        {category.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={handleAddCategory}
                                                className="px-3 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                                title="Add new category"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            {formData.category && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditCategory(formData.category)}
                                                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                                    title="Manage categories"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
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
                                        </select>
                                    </div>

                                    {/* Status Toggle (only for edit) */}
                                    {product && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Status
                                            </label>
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleInputChange('is_active', !formData.is_active)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        formData.is_active ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                            formData.is_active ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                                <span className={`text-sm font-medium ${
                                                    formData.is_active ? 'text-blue-600' : 'text-gray-500'
                                                }`}>
                                                    {formData.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
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
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            errors.description ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                        placeholder="Product description (optional)"
                                    />
                                    {errors.description && (
                                        <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                                    )}
                                </div>
                            </form>
                        )}

                        {/* Pricing Tab */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Unit Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Unit Price (PKR) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.unit_price}
                                            onChange={(e) => handleInputChange('unit_price', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                errors.unit_price ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                            placeholder="0.00"
                                            required
                                        />
                                        {errors.unit_price && (
                                            <p className="mt-1 text-xs text-red-600">{errors.unit_price}</p>
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
                                            value={formData.tax_rate || ''}
                                            onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Price Calculator */}
                                {formData.unit_price && (
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <h4 className="flex items-center text-sm font-medium text-blue-900 mb-3">
                                            <DollarSign className="w-4 h-4 mr-2" />
                                            Price Calculator
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-blue-600">Unit Price</p>
                                                <p className="font-medium text-blue-800">
                                                    PKR {parseFloat(formData.unit_price).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-blue-600">Tax Amount</p>
                                                <p className="font-medium text-blue-800">
                                                    PKR {((parseFloat(formData.unit_price) * (parseFloat(formData.tax_rate) || 0)) / 100).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-blue-600">Total Price</p>
                                                <p className="font-medium text-blue-800">
                                                    PKR {(parseFloat(formData.unit_price) + ((parseFloat(formData.unit_price) * (parseFloat(formData.tax_rate) || 0)) / 100)).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Details Tab (only for existing products) */}
                        {activeTab === 'details' && product && (
                            <div className="space-y-6">
                                {/* Product Performance */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                                    <h4 className="flex items-center text-lg font-medium text-gray-900 mb-4">
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

                                {/* Additional Product Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Barcode */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
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

                                    {/* Brand */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
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

                                    {/* Weight */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Weight (kg)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.weight || ''}
                                            onChange={(e) => handleInputChange('weight', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    {/* Minimum Order Quantity */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Min. Order Qty
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.min_order_qty || ''}
                                            onChange={(e) => handleInputChange('min_order_qty', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="1"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            {product && (
                                <>
                                    <Eye className="w-4 h-4" />
                                    <span>ID: {product.product_id}</span>
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
                            
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                                {loading ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                <span>{loading ? 'Saving...' : 'Save Product'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <CategoryModal
                    category={selectedCategory}
                    isOpen={showCategoryModal}
                    onClose={() => {
                        setShowCategoryModal(false);
                        setSelectedCategory(null);
                    }}
                    onSuccess={handleCategorySuccess}
                    existingCategories={allCategories}
                />
            )}
        </>
    );
};

export default ProductModal;