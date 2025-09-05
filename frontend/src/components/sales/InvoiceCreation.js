// components/sales/InvoiceCreation.js
import React, { useState, useEffect } from 'react';
import { 
    Plus, Minus, Search, ShoppingCart, Calculator, 
    Save, Send, X, Check, AlertCircle, Package
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { invoiceService } from '../../services/invoiceService';
import { distributorService } from '../../services/distributorService';
import { productService } from '../../services/productService';

const MobileInvoiceCreation = ({ onClose, onSuccess, distributorId = null }) => {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1); // 1: Select Distributor, 2: Add Items, 3: Review & Save
    const [loading, setLoading] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState({
        distributor_id: distributorId || '',
        due_date: invoiceService.getDefaultDueDate(),
        discount_amount: 0,
        notes: '',
        items: []
    });

    // Data
    const [distributors, setDistributors] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedDistributor, setSelectedDistributor] = useState(null);
    
    // Search and filters
    const [distributorSearch, setDistributorSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);

    // Load initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [distributorsRes, productsRes, categoriesRes] = await Promise.all([
                distributorService.getDistributors({ limit: 100 }),
                productService.getProducts({ limit: 200 }),
                productService.getCategories()
            ]);

            setDistributors(distributorsRes.data.distributors);
            setProducts(productsRes.data.products);
            setCategories(categoriesRes.data);

            // If distributor is pre-selected, load it
            if (distributorId) {
                const distributor = distributorsRes.data.distributors.find(d => d.distributor_id == distributorId);
                if (distributor) {
                    setSelectedDistributor(distributor);
                    setCurrentStep(2);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // Filter distributors
    const filteredDistributors = distributors.filter(distributor =>
        distributor.distributor_name.toLowerCase().includes(distributorSearch.toLowerCase()) ||
        distributor.city.toLowerCase().includes(distributorSearch.toLowerCase())
    );

    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
                            (product.product_code && product.product_code.toLowerCase().includes(productSearch.toLowerCase()));
        const matchesCategory = !selectedCategory || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Select distributor
    const selectDistributor = (distributor) => {
        setFormData(prev => ({ ...prev, distributor_id: distributor.distributor_id }));
        setSelectedDistributor(distributor);
        setCurrentStep(2);
    };

    // Add product to invoice
    const addProduct = (product) => {
        const existingItem = formData.items.find(item => item.product_id === product.product_id);
        
        if (existingItem) {
            // Increase quantity if already exists
            setFormData(prev => ({
                ...prev,
                items: prev.items.map(item =>
                    item.product_id === product.product_id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }));
        } else {
            // Add new item
            setFormData(prev => ({
                ...prev,
                items: [...prev.items, {
                    product_id: product.product_id,
                    product_name: product.product_name,
                    product_code: product.product_code,
                    unit_price: product.unit_price,
                    quantity: 1,
                    discount_percentage: 0,
                    tax_rate: product.tax_rate || 0
                }]
            }));
        }
    };

    // Update item quantity
    const updateItemQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeItem(productId);
            return;
        }

        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.product_id === productId
                    ? { ...item, quantity: parseFloat(quantity) }
                    : item
            )
        }));
    };

    // Update item price
    const updateItemPrice = (productId, price) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.product_id === productId
                    ? { ...item, unit_price: parseFloat(price) }
                    : item
            )
        }));
    };

    // Update item discount
    const updateItemDiscount = (productId, discount) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.product_id === productId
                    ? { ...item, discount_percentage: parseFloat(discount) }
                    : item
            )
        }));
    };

    // Remove item
    const removeItem = (productId) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.product_id !== productId)
        }));
    };

    // Calculate totals
    const totals = invoiceService.calculateTotals(formData.items, formData.discount_amount, products);

    // Save as draft
    const saveDraft = async () => {
        setLoading(true);
        try {
            const invoiceData = invoiceService.formatInvoiceForAPI(formData);
            await invoiceService.createInvoice(invoiceData);
            onSuccess('Invoice saved as draft');
            onClose();
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('Error saving invoice');
        } finally {
            setLoading(false);
        }
    };

    // Send invoice
    const sendInvoice = async () => {
        setLoading(true);
        try {
            const invoiceData = invoiceService.formatInvoiceForAPI(formData);
            const response = await invoiceService.createInvoice(invoiceData);
            
            // Immediately send the invoice
            await invoiceService.sendInvoice(response.data.invoice_id);
            
            onSuccess('Invoice created and sent successfully');
            onClose();
        } catch (error) {
            console.error('Error sending invoice:', error);
            alert('Error creating/sending invoice');
        } finally {
            setLoading(false);
        }
    };

    // Render step 1: Select Distributor
    const renderDistributorSelection = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Select Distributor</h2>
                    <button onClick={onClose} className="p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Search */}
                <div className="mt-3 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                    <input
                        type="text"
                        placeholder="Search distributors..."
                        value={distributorSearch}
                        onChange={(e) => setDistributorSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-blue-500 border border-blue-400 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                </div>
            </div>

            {/* Distributor List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredDistributors.map(distributor => (
                    <div
                        key={distributor.distributor_id}
                        onClick={() => selectDistributor(distributor)}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm active:bg-gray-50"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{distributor.distributor_name}</h3>
                                <p className="text-sm text-gray-600">{distributor.city}</p>
                                <p className="text-sm text-gray-600">{distributor.primary_contact_person}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500">Pending</div>
                                <div className="text-sm font-medium text-red-600">
                                    ${parseFloat(distributor.pending_amount || 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredDistributors.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-gray-500">No distributors found</div>
                    </div>
                )}
            </div>
        </div>
    );

    // Render step 2: Add Items
    const renderItemSelection = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => setCurrentStep(1)} className="p-1">
                            <X className="w-6 h-6" />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold">Add Items</h2>
                            <p className="text-sm text-blue-200">{selectedDistributor?.distributor_name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm">Items: {formData.items.length}</div>
                        <div className="text-lg font-bold">${totals.total.toFixed(2)}</div>
                    </div>
                </div>

                {/* Search and Category Filter */}
                <div className="mt-3 space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-blue-500 border border-blue-400 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-blue-500 border border-blue-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                            <option key={category.category} value={category.category}>
                                {category.category} ({category.product_count})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto">
                {/* Current Items Summary (if any) */}
                {formData.items.length > 0 && (
                    <div className="bg-green-50 border-b border-green-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-green-800">Current Items ({formData.items.length})</span>
                            <button
                                onClick={() => setCurrentStep(3)}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
                            >
                                Review →
                            </button>
                        </div>
                        <div className="space-y-1">
                            {formData.items.slice(0, 3).map(item => (
                                <div key={item.product_id} className="flex justify-between text-sm">
                                    <span>{item.product_name}</span>
                                    <span>{item.quantity} × ${item.unit_price}</span>
                                </div>
                            ))}
                            {formData.items.length > 3 && (
                                <div className="text-sm text-green-600">+{formData.items.length - 3} more items</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Products */}
                <div className="p-4 space-y-3">
                    {filteredProducts.map(product => {
                        const inCart = formData.items.find(item => item.product_id === product.product_id);
                        
                        return (
                            <div
                                key={product.product_id}
                                className={`bg-white border rounded-lg p-4 shadow-sm ${
                                    inCart ? 'border-green-500 bg-green-50' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{product.product_name}</h3>
                                        <p className="text-sm text-gray-600">{product.product_code}</p>
                                        <p className="text-sm text-gray-600">{product.category}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-lg font-bold text-blue-600">
                                                ${parseFloat(product.unit_price).toFixed(2)}
                                            </span>
                                            <span className="text-xs text-gray-500">per {product.unit_of_measure}</span>
                                        </div>
                                    </div>

                                    <div className="ml-4">
                                        {inCart ? (
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => updateItemQuantity(product.product_id, inCart.quantity - 1)}
                                                    className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-8 text-center font-bold">{inCart.quantity}</span>
                                                <button
                                                    onClick={() => updateItemQuantity(product.product_id, inCart.quantity + 1)}
                                                    className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addProduct(product)}
                                                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredProducts.length === 0 && (
                        <div className="text-center py-8">
                            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <div className="text-gray-500">No products found</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar */}
            {formData.items.length > 0 && (
                <div className="bg-white border-t border-gray-200 p-4">
                    <button
                        onClick={() => setCurrentStep(3)}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        <span>Review Invoice ({formData.items.length} items)</span>
                    </button>
                </div>
            )}
        </div>
    );

    // Render step 3: Review & Save
    const renderReviewAndSave = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => setCurrentStep(2)} className="p-1">
                            <X className="w-6 h-6" />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold">Review Invoice</h2>
                            <p className="text-sm text-blue-200">{selectedDistributor?.distributor_name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm">Total</div>
                        <div className="text-xl font-bold">${totals.total.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Items List */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-semibold">Items ({formData.items.length})</h3>
                    </div>
                    <div className="space-y-3 p-4">
                        {formData.items.map(item => (
                            <div key={item.product_id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-medium">{item.product_name}</h4>
                                        <p className="text-sm text-gray-500">{item.product_code}</p>
                                    </div>
                                    <button
                                        onClick={() => removeItem(item.product_id)}
                                        className="text-red-500 p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">Quantity</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(e) => updateItemQuantity(item.product_id, e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => updateItemPrice(item.product_id, e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Discount %</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.discount_percentage}
                                            onChange={(e) => updateItemDiscount(item.product_id, e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mt-2 text-right">
                                    <span className="text-sm font-medium">
                                        Total: ${((item.unit_price * item.quantity) * (1 - item.discount_percentage / 100) * (1 + item.tax_rate / 100)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invoice Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="font-semibold mb-3">Invoice Settings</h3>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Discount</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.discount_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows="2"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Additional notes or terms..."
                            />
                        </div>
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax:</span>
                            <span>${totals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Discount:</span>
                            <span>-${totals.discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span>${totals.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white border-t border-gray-200 p-4 space-y-3">
                <button
                    onClick={saveDraft}
                    disabled={loading || formData.items.length === 0}
                    className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    <span>{loading ? 'Saving...' : 'Save as Draft'}</span>
                </button>

                <button
                    onClick={sendInvoice}
                    disabled={loading || formData.items.length === 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                    <Send className="w-5 h-5" />
                    <span>{loading ? 'Sending...' : 'Create & Send Invoice'}</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white z-50">
            {currentStep === 1 && renderDistributorSelection()}
            {currentStep === 2 && renderItemSelection()}
            {currentStep === 3 && renderReviewAndSave()}
        </div>
    );
};

export default MobileInvoiceCreation;