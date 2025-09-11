// frontend/src/pages/ProductsPage.js - Updated with Modal Integration
import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Plus, Eye, Edit, Trash2, Package, DollarSign,
    TrendingUp, BarChart3, Download, Upload, CheckCircle, XCircle,
    Tag, Calendar, Grid, List, MoreVertical, Settings
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { productService } from '../services/productService';
import ProductModal from '../components/admin/ProductModal';

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
                case 'create':
                    setSelectedProduct(null);
                    setShowProductModal(true);
                    break;
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

    const handleModalSuccess = () => {
        fetchProducts();
        fetchStats();
    };

    const handleBulkAction = async (action) => {
        if (selectedProducts.length === 0) {
            alert('Please select products first');
            return;
        }

        try {
            const promises = selectedProducts.map(productId => {
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
        const categoryBadge = productService.utils.getCategoryBadge(product.category);

        return (
            <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {product.product_name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                                Code: {product.product_code}
                            </p>
                            {product.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {product.description}
                                </p>
                            )}
                        </div>
                        <div className="ml-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}>
                                    {statusBadge.text}
                                </span>
                                {product.category && (
                                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                        {product.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                PKR {(product.unit_price || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">
                                per {product.unit_of_measure || 'unit'}
                            </p>
                        </div>
                        {product.tax_rate > 0 && (
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Tax: {product.tax_rate}%</p>
                                <p className="text-sm font-medium text-gray-900">
                                    Total: PKR {(product.unit_price * (1 + product.tax_rate / 100)).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Created: {new Date(product.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleProductAction('view', product)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleProductAction('edit', product)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Edit Product"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleProductAction('toggle', product)}
                                className={`p-2 rounded-lg transition-colors ${
                                    product.is_active 
                                        ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' 
                                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                }`}
                                title={product.is_active ? 'Deactivate' : 'Activate'}
                            >
                                {product.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => handleProductAction('delete', product)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Product"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Product row component (list view)
    const ProductRow = ({ product }) => {
        const statusBadge = productService.utils.getStatusBadge(product.is_active);

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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                            <Package className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900">
                                {product.product_name}
                            </div>
                            <div className="text-sm text-gray-500">
                                {product.product_code}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {product.category || 'Uncategorized'}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    PKR {(product.unit_price || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.unit_of_measure || 'piece'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}>
                        {statusBadge.text}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleProductAction('view', product)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleProductAction('edit', product)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Edit"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleProductAction('toggle', product)}
                            className={`transition-colors ${
                                product.is_active 
                                    ? 'text-orange-600 hover:text-orange-900' 
                                    : 'text-green-600 hover:text-green-900'
                            }`}
                            title={product.is_active ? 'Deactivate' : 'Activate'}
                        >
                            {product.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => handleProductAction('delete', product)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-600">Manage your product catalog</p>
                </div>
                <button
                    onClick={() => handleProductAction('create')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                </button>
            </div>

            {/* Statistics */}
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
                        color="bg-green-500"
                    />
                    <StatsCard
                        title="Avg. Price"
                        value={`PKR ${(stats.average_price || 0).toLocaleString()}`}
                        icon={DollarSign}
                        color="bg-yellow-500"
                    />
                    <StatsCard
                        title="This Month"
                        value={stats.products_added_this_month || 0}
                        icon={TrendingUp}
                        color="bg-purple-500"
                        subtitle="New products"
                    />
                </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Category Filter */}
                    <div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'grid' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'list' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedProducts.length > 0 && (
                    <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-700">
                            {selectedProducts.length} product(s) selected
                        </span>
                        <button
                            onClick={() => handleBulkAction('activate')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                            Activate
                        </button>
                        <button
                            onClick={() => handleBulkAction('deactivate')}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                        >
                            Deactivate
                        </button>
                        <button
                            onClick={() => setSelectedProducts([])}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Products Display */}
            <div className="bg-white rounded-lg shadow">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading products...</span>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || categoryFilter || statusFilter !== 'all' 
                                ? 'Try adjusting your filters to see more results.'
                                : 'Get started by adding your first product to the catalog.'
                            }
                        </p>
                        <button
                            onClick={() => handleProductAction('create')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Add First Product
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map(product => (
                                <ProductCard key={product.product_id} product={product} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.length === products.length && products.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProducts(products.map(p => p.product_id));
                                                } else {
                                                    setSelectedProducts([]);
                                                }
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('product_name')}>
                                        Product
                                        {sortBy === 'product_name' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('unit_price')}>
                                        Price
                                        {sortBy === 'unit_price' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Unit
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('created_at')}>
                                        Created
                                        {sortBy === 'created_at' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.map(product => (
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

            {/* Product Modal */}
            <ProductModal
                product={selectedProduct}
                isOpen={showProductModal}
                onClose={() => {
                    setShowProductModal(false);
                    setSelectedProduct(null);
                }}
                onSuccess={handleModalSuccess}
                categories={categories}
            />
        </div>
    );
};

export default ProductsPage;