// frontend/src/components/admin/ProductModal.js - FIXED VERSION
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
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Category management states
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [allCategories, setAllCategories] = useState(categories);

    // Form data
    const [formData, setFormData] = useState({
        product_name: '',
        product_code: '',
        description: '',
        unit_price: '',
        unit_of_measure: 'piece',
        category: '',
        tax_rate: 0
    });

    // Load categories when modal opens
    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    // Reset form when product changes
    useEffect(() => {
        console.log('ProductModal useEffect triggered', { product, isOpen });
        if (product) {
            setFormData({
                product_name: product.product_name || '',
                product_code: product.product_code || '',
                description: product.description || '',
                unit_price: product.unit_price || '',
                unit_of_measure: product.unit_of_measure || 'piece',
                category: product.category || '',
                tax_rate: product.tax_rate || 0
            });
        } else {
            setFormData({
                product_name: '',
                product_code: '',
                description: '',
                unit_price: '',
                unit_of_measure: 'piece',
                category: '',
                tax_rate: 0
            });
        }
        setErrors({});
        setShowSuccess(false);
        setSuccessMessage('');
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
        console.log(`Input changed: ${field} = ${value}`);
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
        const errors = {};

        // Product name validation
        if (!formData.product_name || formData.product_name.trim().length < 2) {
            errors.product_name = 'Product name must be at least 2 characters';
        }

        // Product code validation (optional but if provided, should be valid)
        if (formData.product_code && formData.product_code.length > 50) {
            errors.product_code = 'Product code cannot exceed 50 characters';
        }

        // Unit price validation
        if (!formData.unit_price || parseFloat(formData.unit_price) < 0) {
            errors.unit_price = 'Valid unit price is required (must be >= 0)';
        }

        // Tax rate validation
        if (formData.tax_rate && (formData.tax_rate < 0 || formData.tax_rate > 100)) {
            errors.tax_rate = 'Tax rate must be between 0 and 100';
        }

        // Description validation
        if (formData.description && formData.description.length > 1000) {
            errors.description = 'Description cannot exceed 1000 characters';
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetForm = () => {
        setFormData({
            product_name: '',
            product_code: '',
            description: '',
            unit_price: '',
            unit_of_measure: 'piece',
            category: '',
            tax_rate: 0
        });
        setErrors({});
    };

    const handleSubmit = async () => {
        console.log('Save button clicked');
        console.log('Form data:', formData);
        
        const isValid = validateForm();
        console.log('Validation result:', isValid);
        console.log('Validation errors:', errors);
        
        if (!isValid) {
            console.log('Form validation failed');
            return;
        }

        try {
            setLoading(true);
            setShowSuccess(false);
            
            // Prepare data for API
            const apiData = {
                product_name: formData.product_name.trim(),
                product_code: formData.product_code?.trim() || null,
                description: formData.description?.trim() || null,
                unit_price: parseFloat(formData.unit_price) || 0,
                unit_of_measure: formData.unit_of_measure || 'piece',
                category: formData.category || null,
                tax_rate: parseFloat(formData.tax_rate) || 0
            };
            
            console.log('Calling API with data:', apiData);
            
            let response;
            if (product) {
                response = await productService.updateProduct(product.product_id, apiData);
                setSuccessMessage('Product updated successfully!');
                console.log('Update response:', response);
            } else {
                response = await productService.createProduct(apiData);
                setSuccessMessage('Product created successfully!');
                console.log('Create response:', response);
            }
            
            console.log('API response:', response);
            
            // Show success message
            setShowSuccess(true);
            
            // Call onSuccess to refresh parent component data
            if (onSuccess) {
                onSuccess();
            }
            
            // For new products, reset form after 2 seconds for next entry
            if (!product) {
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
            console.error('Error saving product:', error);
            setErrors({ 
                submit: error.response?.data?.message || error.message || 'Failed to save product' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCategorySuccess = () => {
        loadCategories();
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
                                    {product ? 'Update product information' : 'Create a new product for your inventory'}
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
                                {!product && (
                                    <p className="text-xs text-green-600 mt-1">Form will reset in 2 seconds for next product...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {/* Test Button */}
                        <button 
                            onClick={() => console.log('Test button works! Form data:', formData)} 
                            className="mb-4 px-4 py-2 bg-gray-500 text-white rounded"
                        >
                            Test Button (Check Console)
                        </button>

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

                        {/* Form Content */}
                        <div className="space-y-6">
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
                                            errors.product_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter product name"
                                        disabled={loading}
                                    />
                                    {errors.product_name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.product_name}</p>
                                    )}
                                </div>

                                {/* Product Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Product Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.product_code}
                                        onChange={(e) => handleInputChange('product_code', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            errors.product_code ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                        }`}
                                        placeholder="e.g., PRD001"
                                        disabled={loading}
                                    />
                                    {errors.product_code && (
                                        <p className="mt-1 text-sm text-red-600">{errors.product_code}</p>
                                    )}
                                </div>

                                {/* Unit Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Unit Price <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.unit_price}
                                        onChange={(e) => handleInputChange('unit_price', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            errors.unit_price ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                        }`}
                                        placeholder="0.00"
                                        disabled={loading}
                                    />
                                    {errors.unit_price && (
                                        <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>
                                    )}
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Category
                                    </label>
                                    <div className="flex space-x-2">
                                        <select
                                            value={formData.category || ''}
                                            onChange={(e) => handleInputChange('category', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={loading}
                                        >
                                            <option value="">Select a category</option>
                                            {allCategories.map((cat) => (
                                                <option key={cat.id} value={cat.value}>
                                                    {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setShowCategoryModal(true)}
                                            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                            disabled={loading}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Unit of Measure */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Unit of Measure
                                    </label>
                                    <select
                                        value={formData.unit_of_measure || 'piece'}
                                        onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={loading}
                                    >
                                        <option value="piece">Piece</option>
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="gram">Gram (g)</option>
                                        <option value="lb">Pound (lb)</option>
                                        <option value="liter">Liter (L)</option>
                                        <option value="gallon">Gallon (gal)</option>
                                        <option value="meter">Meter (m)</option>
                                        <option value="feet">Feet (ft)</option>
                                        <option value="box">Box</option>
                                        <option value="pack">Pack</option>
                                        <option value="dozen">Dozen</option>
                                        <option value="bottle">Bottle</option>
                                        <option value="bag">Bag</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Product description..."
                                        disabled={loading}
                                    />
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
                                        value={formData.tax_rate || ''}
                                        onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
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
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Save Product button clicked!');
                                    handleSubmit();
                                }}
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