import { useState, useEffect } from 'react';
import { adminAPI, marketplaceAPI, getImageUrl } from '../../services/api';
import toast from 'react-hot-toast';
import { Trash2, Package, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    fetchListings();
  }, [page]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Fetch all marketplace listings via admin endpoint — falls back to regular listing endpoint
      const res = await adminAPI.getAnalytics();
      // Use marketplaceAPI to get all listings (admin sees all statuses via own listings endpoint fallback)
      // We'll fetch using a broader approach: get all via admin logs or fetch all statuses
      const [active, sold, reserved] = await Promise.all([
        marketplaceAPI.getListings({ limit: 50, skip: page * LIMIT }),
        marketplaceAPI.getListings({ status: 'sold', limit: 20 }),
        marketplaceAPI.getListings({ status: 'reserved', limit: 20 }),
      ]);
      const all = [
        ...(active.data.listings || []),
      ];
      setListings(all);
      setTotal(active.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;
    try {
      await marketplaceAPI.deleteListing(id);
      toast.success('Listing deleted');
      setListings(prev => prev.filter(l => l.id !== id));
      if (selectedListing?.id === id) setSelectedListing(null);
    } catch {
      toast.error('Failed to delete listing');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Marketplace Listings</h1>
        <p className="page-subtitle">{total} total active listings</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 card">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-gray-400 font-medium">No listings found</h3>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-3">
            {listings.map(listing => (
              <div key={listing.id}
                onClick={() => setSelectedListing(listing)}
                className={`card p-4 cursor-pointer transition-all ${selectedListing?.id === listing.id ? 'border-2 border-primary-400' : 'hover:border-primary-200'}`}>
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {listing.images?.[0] ? (
                      <img src={getImageUrl(listing.images[0])} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={20} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{listing.title}</p>
                    <p className="text-xs text-gray-500">{listing.category} • {listing.condition}</p>
                    <p className="text-xs text-gray-500">By: {listing.seller_name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="font-semibold text-primary-600 text-sm">
                        {listing.is_free ? 'Free' : `₹${listing.price}`}
                      </p>
                      <span className={`badge text-xs capitalize ${listing.status === 'active' ? 'badge-success' : listing.status === 'sold' ? 'badge-gray' : 'badge-warning'}`}>
                        {listing.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(listing.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors ml-auto"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div>
            {selectedListing ? (
              <div className="card p-5 sticky top-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye size={18} /> Listing Detail
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {selectedListing.images?.map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
                  ))}
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{selectedListing.title}</h4>
                <div className="flex gap-2 mb-3">
                  <span className="badge-primary badge">{selectedListing.category}</span>
                  <span className="badge-gray badge">{selectedListing.condition}</span>
                  <span className={`badge capitalize ${selectedListing.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{selectedListing.status}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{selectedListing.description}</p>
                <div className="p-3 bg-gray-50 rounded-xl text-sm space-y-1 mb-4">
                  <p><span className="text-gray-500">Seller:</span> <span className="font-medium">{selectedListing.seller_name}</span></p>
                  <p><span className="text-gray-500">Price:</span> <span className="font-semibold text-primary-600">{selectedListing.is_free ? 'Free' : `₹${selectedListing.price}`}</span></p>
                  <p><span className="text-gray-500">Listed:</span> <span className="font-medium">{formatDistanceToNow(new Date(selectedListing.created_at), { addSuffix: true })}</span></p>
                  <p><span className="text-gray-500">Views:</span> <span className="font-medium">{selectedListing.views || 0}</span></p>
                </div>
                <button
                  onClick={() => handleDelete(selectedListing.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 font-medium transition-colors"
                >
                  <Trash2 size={16} /> Delete Listing
                </button>
              </div>
            ) : (
              <div className="card p-8 text-center text-gray-400">
                <Eye size={40} className="mx-auto mb-3 opacity-30" />
                <p>Select a listing to preview</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
