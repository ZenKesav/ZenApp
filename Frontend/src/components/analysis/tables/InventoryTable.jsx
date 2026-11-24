import React, { useState } from 'react';
import { useAuth } from '../../../app/store';
import { Pagination, TableFilterBar } from '../../common/CommonComponents';

const InventoryTable = () => {
  const { products = [], deleteProduct } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredProducts = (products || []).filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.code && p.code.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term))
    );
  });

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteConfirm = () => {
    if (deleteId && deleteProduct) {
      deleteProduct(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <TableFilterBar
        variant="plain"
        className="mb-3"
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search products..."
        rightExtras={
          <>
            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-2xs text-nowrap">
              <i className="ti ti-filter"></i> Filter
            </button>
            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-2xs text-nowrap">
              <i className="ti ti-file-excel text-success"></i> Excel
            </button>
            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-2xs text-nowrap">
              <i className="ti ti-file-pdf text-danger"></i> PDF
            </button>
          </>
        }
      />

      <div className="card shadow-xs table-card">
        <div className="table-responsive">
          <div className="table-swipe-hint d-md-none">
            <i className="ti ti-arrows-left-right text-primary me-1"></i>
            <span>Swipe horizontally to view all columns</span>
          </div>
          <table className="table mb-0 text-nowrap table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Image & Product Name</th>
                <th>Code</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Price</th>
                <th>Unit</th>
                <th>Quantity</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="avatar avatar-md rounded-2 border"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                        )}
                        <span className="ms-2.5 fw-semibold text-dark">{p.name}</span>
                      </div>
                    </td>
                    <td><span className="badge bg-light text-dark border font-mono">{p.code}</span></td>
                    <td className="text-muted">{p.category}</td>
                    <td className="text-muted">{p.brand}</td>
                    <td className="fw-bold font-mono text-dark">${parseFloat(p.price || 0).toFixed(2)}</td>
                    <td className="text-muted">{p.unit}</td>
                    <td>
                      <span className={`badge font-mono ${p.quantity <= 10 ? 'bg-danger-subtle text-danger border border-danger' : 'bg-success-subtle text-success border border-success'}`}>
                        {p.quantity} in stock
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        <button
                          className="btn-action-edit"
                          title="Edit Product"
                          aria-label="Edit Product"
                        >
                          <i className="ti ti-edit fs-5"></i>
                        </button>
                        <button
                          className="btn-action-delete"
                          title="Delete Product"
                          onClick={() => setDeleteId(p.id)}
                          aria-label="Delete Product"
                        >
                          <i className="ti ti-trash fs-5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="ti ti-box-off fs-1 d-block mb-2 text-secondary opacity-50"></i>
                    <span className="fw-semibold">No products found matching "{searchTerm}"</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {deleteId && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">Delete Product</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteId(null)} aria-label="Close"></button>
              </div>
              <div className="modal-body py-4">
                <p className="mb-0 text-muted">Are you sure you want to delete this product? This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-top bg-light-subtle">
                <button type="button" className="btn btn-light" onClick={() => setDeleteId(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm}>
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable;
