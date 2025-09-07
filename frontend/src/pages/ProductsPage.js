// frontend/src/pages/ProductsPage.js - Complete Product Management Interface
import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Plus, Eye, Edit, Trash2, Package, DollarSign,
    TrendingUp, BarChart3, Download, Upload, CheckCircle, XCircle,
    Tag, Calendar, Grid, List, MoreVertical, Settings
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { productService } from '../services/productService';

const ProductsPage = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState(null);

    // Load data on component mount and when filters change
    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchStats();
    }, [currentPage, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const filters = productService.utils.createSearchFilters(searchTerm, categoryFilter, statusFilter);
            
            const response = await productService.getProducts({
                page: currentPage,
                limit: 20,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters
            });

            if (response.success) {
                setProducts(response.data.products || []);
                setTotalPages(response.data.pagination?.pages || 1);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await productService.getCategories();
            if (response.success) {
                setCategories(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await productService.getProductAnalytics();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const handleProductAction = async (action, product) => {
        try {
            switch (action) {
                case 'edit':
                    setSelectedProduct(product);
                    setShowProductModal(true);
                    break;
                case 'toggle':
                    await productService.toggleProductStatus(product.product_id, !product.is_active);
                    fetchProducts();
                    break;
                case 'delete':
                    if (window.confirm('Are you sure you want to delete this product?')) {
                        await productService.deleteProduct(product.product_id);
                        fetchProducts();
                    }
                    break;
                case 'view':
                    setSelectedProduct(product);
                    // Could open a detailed view modal
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error(`Error ${action} product:`, error);
            alert(`Failed to ${action} product. Please try again.`);
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedProducts.length === 0) {
            alert('Please select products first');
            return;
        }

        try {
            const promises = selectedProducts.map(productId => {
                const product = products.find(p => p.product_id === productId);
                if (action === 'activate') {
                    return productService.toggleProductStatus(productId, true);
                } else if (action === 'deactivate') {
                    return productService.toggleProductStatus(productId, false);
                }
                return null;
            });

            await Promise.all(promises.filter(Boolean));
            setSelectedProducts([]);
            fetchProducts();
        } catch (error) {
            console.error('Bulk action error:', error);
            alert('Failed to perform bulk action');
        }
    };

    // Statistics cards component
    const StatsCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
            </div>
        </div>
    );

    // Product card component (grid view)
    const ProductCard = ({ product }) => {
        const statusBadge = productService.utils.getStatusBadge(product.is_active);
        const metrics = productService.utils.calculateProductMetrics(product);

        return (
            <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.product_name}</h3>
                            {product.product_code && (
                                <p className="text-sm text-gray-600 mb-2">Code: {product.product_code}</p>
                            )}
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                                {statusBadge.label}
                            </span>
                        </div>
                        <div className="relative">
                            <button className="p-1 hover:bg-gray-100 rounded">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Price:</span>
                            <span className="text-sm font-medium">{productService.utils.formatCurrency(product.unit_price)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Category:</span>
                            <span className="text-sm">{product.category || 'Uncategorized'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Unit:</span>
                            <span className="text-sm">{product.unit_of_measure}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Sales:</span>
                            <span className="text-sm">{metrics.timesSold} orders</span>
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleProductAction('edit', product)}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleProductAction('toggle', product)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                product.is_active 
                                    ? 'bg-red-600 text-white hover:bg-red-700' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                            {product.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Product row component (list view)
    const ProductRow = ({ product }) => {
        const statusBadge = productService.utils.getStatusBadge(product.is_active);
        const metrics = productService.utils.calculateProductMetrics(product);

        return (
            <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                    <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.product_id)}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.product_id]);
                            } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.product_id));
                            }
                        }}
                        className="rounded border-gray-300"
                    />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                        <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                        {product.product_code && (
                            <div className="text-sm text-gray-500">{product.product_code}</div>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{product.category || 'Uncategorized'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                        {productService.utils.formatCurrency(product.unit_price)}
                    </span>
                    <div className="text-sm text-gray-500">per {product.unit_of_measure}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                        {statusBadge.label}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{metrics.timesSold} orders</div>
                    <div className="text-gray-500">{metrics.quantitySold} units</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleProductAction('edit', product)}
                            className="text-blue-600 hover:text-blue-900"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleProductAction('toggle', product)}
                            className={product.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        >
                            {product.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => handleProductAction('delete', product)}
                            className="text-red-600 hover:text-red-900"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-gray-600">Product management is available to administrators only.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
                    <p className="text-gray-600">Manage your product inventory and pricing</p>
                </div>
                <div className="flex space-x-3">
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Import
                    </button>
                    <button
                        onClick={() => {
                            setSelectedProduct(null);
                            setShowProductModal(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Products"
                        value={stats.total_products || 0}
                        icon={Package}
                        color="bg-blue-500"
                        subtitle={`${stats.active_products || 0} active`}
                    />
                    <StatsCard
                        title="Categories"
                        value={stats.total_categories || 0}
                        icon={Tag}
                        color="bg-purple-500"
                        subtitle="Product categories"
                    />
                    <StatsCard
                        title="Average Price"
                        value={productService.utils.formatCurrency(stats.average_price || 0)}
                        icon={DollarSign}
                        color="bg-green-500"
                        subtitle="Per product"
                    />
                    <StatsCard
                        title="Products with Sales"
                        value={stats.products_with_sales || 0}
                        icon={TrendingUp}
                        color="bg-orange-500"
                        subtitle="Have been sold"
                    />
                </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="min-w-[200px]">
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                                <option key={category.category} value={category.category}>
                                    {category.category} ({category.product_count})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="min-w-[150px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-200 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedProducts.length > 0 && (
                    <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-800">
                            {selectedProducts.length} product(s) selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkAction('activate')}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                                Activate
                            </button>
                            <button
                                onClick={() => handleBulkAction('deactivate')}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                                Deactivate
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Products Display */}
            <div className="bg-white rounded-lg shadow">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Package className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || categoryFilter || statusFilter !== 'all' 
                                ? 'Try adjusting your filters' 
                                : 'Get started by adding your first product'
                            }
                        </p>
                        <button
                            onClick={() => {
                                setSelectedProduct(null);
                                setShowProductModal(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Add Product
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map((product) => (
                                <ProductCard key={product.product_id} product={product} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.length === products.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProducts(products.map(p => p.product_id));
                                                } else {
                                                    setSelectedProducts([]);
                                                }
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                    </th>
                                    <th 
                                        onClick={() => handleSort('product_name')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                    >
                                        Product Name
                                        {sortBy === 'product_name' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th 
                                        onClick={() => handleSort('category')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                    >
                                        Category
                                        {sortBy === 'category' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th 
                                        onClick={() => handleSort('unit_price')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                    >
                                        Price
                                        {sortBy === 'unit_price' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sales
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.map((product) => (
                                    <ProductRow key={product.product_id} product={product} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                                <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Modal (placeholder - would need actual ProductForm component) */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                {selectedProduct ? 'Edit Product' : 'Add New Product'}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Product form component would go here. This would include fields for product name, 
                                code, description, price, category, etc.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowProductModal(false)}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;