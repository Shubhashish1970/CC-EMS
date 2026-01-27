import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Loader2, Download, Upload, Search, CheckCircle, XCircle, Trash2, CheckSquare, Square } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import ConfirmationModal from '../../shared/ConfirmationModal';
import * as XLSX from 'xlsx';

interface Product {
  _id: string;
  name: string;
  category?: string;
  segment?: string;
  subcategory?: string;
  productCode?: string;
  focusProducts?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

// Helper to get auth headers including active role
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const activeRole = localStorage.getItem('activeRole');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(activeRole && { 'X-Active-Role': activeRole }),
  };
};

const ProductsMasterView: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    category: '', 
    segment: '', 
    subcategory: '', 
    productCode: '', 
    focusProducts: false, 
    isActive: true 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/master-data/products/all`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.products);
      } else {
        showError('Failed to fetch products');
      }
    } catch (error) {
      showError('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        name: product.name || '', 
        category: product.category || '', 
        segment: product.segment || '', 
        subcategory: product.subcategory || '', 
        productCode: product.productCode || '', 
        focusProducts: product.focusProducts || false, 
        isActive: product.isActive 
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        name: '', 
        category: '', 
        segment: '', 
        subcategory: '', 
        productCode: '', 
        focusProducts: false, 
        isActive: true 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      category: '', 
      segment: '', 
      subcategory: '', 
      productCode: '', 
      focusProducts: false, 
      isActive: true 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Product name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingProduct
        ? `${API_BASE}/master-data/products/${editingProduct._id}`
        : `${API_BASE}/master-data/products`;
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(editingProduct ? 'Product updated successfully' : 'Product created successfully');
        handleCloseModal();
        fetchProducts();
      } else {
        showError(data.error?.message || 'Operation failed');
      }
    } catch (error) {
      showError('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const response = await fetch(`${API_BASE}/master-data/products/${product._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !product.isActive }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`Product ${product.isActive ? 'deactivated' : 'activated'} successfully`);
        fetchProducts();
      } else {
        showError(data.error?.message || 'Operation failed');
      }
    } catch (error) {
      showError('Operation failed');
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/master-data/products/bulk`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`${data.data.modifiedCount} product(s) deleted successfully`);
        setSelectedIds(new Set());
        setShowBulkDeleteModal(false);
        fetchProducts();
      } else {
        showError(data.error?.message || 'Bulk delete failed');
      }
    } catch (error) {
      showError('Bulk delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Name': 'Sample Product 1',
        'Category': 'Category 1',
        'Segment': 'Segment 1',
        'Subcategory': 'Subcategory 1',
        'Product Code': 'PRD-001',
        'Focus Products (Yes/No)': 'Yes',
        'Status (Active/Inactive)': 'Active',
      },
      {
        'Name': 'Sample Product 2',
        'Category': 'Category 2',
        'Segment': 'Segment 2',
        'Subcategory': 'Subcategory 2',
        'Product Code': 'PRD-002',
        'Focus Products (Yes/No)': 'No',
        'Status (Active/Inactive)': 'Active',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products_template.xlsx');
  };

  const handleDownloadData = () => {
    const excelData = products.map(product => ({
      'Name': product.name || '',
      'Category': product.category || '',
      'Segment': product.segment || '',
      'Subcategory': product.subcategory || '',
      'Product Code': product.productCode || '',
      'Focus Products': product.focusProducts ? 'Yes' : 'No',
      'Status': product.isActive ? 'Active' : 'Inactive',
      'Created At': new Date(product.createdAt).toLocaleDateString(),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          showError('Failed to read file');
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        if (rows.length === 0) {
          showError('Excel file must have at least one data row');
          return;
        }

        // Get headers from first row
        const firstRow = rows[0];
        const headers = Object.keys(firstRow).map(h => h.trim().toLowerCase());
        const nameKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('name') && !k.toLowerCase().includes('code')) || '';
        const categoryKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('category')) || '';
        const segmentKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('segment')) || '';
        const subcategoryKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('subcategory')) || '';
        const productCodeKey = Object.keys(firstRow).find(k => (k.toLowerCase().includes('product code') || k.toLowerCase().includes('productcode')) && !k.toLowerCase().includes('focus')) || '';
        const focusProductsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('focus')) || '';
        const statusKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('status')) || '';

        if (!nameKey) {
          showError('Excel must have a "Name" column');
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const row of rows) {
          const name = String(row[nameKey] || '').trim();
          if (!name) continue;

          const category = categoryKey ? String(row[categoryKey] || '').trim() : '';
          const segment = segmentKey ? String(row[segmentKey] || '').trim() : '';
          const subcategory = subcategoryKey ? String(row[subcategoryKey] || '').trim() : '';
          const productCode = productCodeKey ? String(row[productCodeKey] || '').trim() : '';
          const focusProductsValue = focusProductsKey ? String(row[focusProductsKey] || '').trim().toLowerCase() : '';
          const focusProducts = focusProductsValue === 'yes' || focusProductsValue === 'true';
          const statusValue = statusKey ? String(row[statusKey] || '').trim().toLowerCase() : '';
          const isActive = statusValue === 'active' || statusValue === '';

          try {
            const response = await fetch(`${API_BASE}/master-data/products`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                name,
                category: category || undefined,
                segment: segment || undefined,
                subcategory: subcategory || undefined,
                productCode: productCode || undefined,
                focusProducts,
                isActive,
              }),
            });

            const data = await response.json();
            if (data.success) {
              successCount++;
            } else {
              errorCount++;
              errors.push(`${name}: ${data.error?.message || 'Failed'}`);
            }
          } catch (error) {
            errorCount++;
            errors.push(`${name}: Import failed`);
          }
        }

        if (successCount > 0) {
          showSuccess(`${successCount} product(s) imported successfully${errorCount > 0 ? `. ${errorCount} failed` : ''}`);
          if (errorCount > 0 && errors.length > 0) {
            console.error('Import errors:', errors);
          }
          fetchProducts();
        } else {
          showError(`Failed to import products. ${errorCount} error(s)`);
        }
      } catch (error) {
        showError('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || product.isActive;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Products Master</h2>
          <p className="text-sm text-slate-600 mt-1">Manage product catalog for call interactions</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              Delete ({selectedIds.size})
            </button>
          )}
          <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
            <Upload size={16} />
            Import
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Template
          </button>
          <button
            onClick={handleDownloadData}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-lime-600 focus:ring-lime-500"
          />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-lime-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider w-12">
                    <button
                      onClick={handleSelectAll}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                      title="Select all"
                    >
                      {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
                        <CheckSquare size={18} className="text-lime-600" />
                      ) : (
                        <Square size={18} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Segment</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Product Code</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Focus</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleSelect(product._id)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {selectedIds.has(product._id) ? (
                          <CheckSquare size={18} className="text-lime-600" />
                        ) : (
                          <Square size={18} className="text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-900">{product.name}</span>
                        {product.subcategory && (
                          <div className="text-xs text-slate-500 mt-0.5">{product.subcategory}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {product.category || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {product.segment || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {product.productCode ? (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded">
                          {product.productCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {product.focusProducts ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-lime-100 text-lime-800 text-xs font-bold rounded-full">
                          <CheckCircle size={12} />
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          product.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`p-2 rounded-lg transition-colors ${
                            product.isActive
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={product.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {product.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl font-black text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                  placeholder="Enter product name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                    placeholder="e.g., Agri Inputs"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Segment
                  </label>
                  <input
                    type="text"
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                    placeholder="e.g., Crop Protection"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                    placeholder="e.g., Soil Conditioners"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Product Code
                  </label>
                  <input
                    type="text"
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                    placeholder="e.g., SC-001"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="focusProducts"
                  checked={formData.focusProducts}
                  onChange={(e) => setFormData({ ...formData, focusProducts: e.target.checked })}
                  className="w-5 h-5 text-lime-600 border-slate-300 rounded focus:ring-lime-500"
                  disabled={isSubmitting}
                />
                <label htmlFor="focusProducts" className="text-sm font-medium text-slate-700">
                  Focus Product
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-lime-600 border-slate-300 rounded focus:ring-lime-500"
                  disabled={isSubmitting}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Active
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Products"
        message={`Are you sure you want to delete ${selectedIds.size} product(s)? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ProductsMasterView;
