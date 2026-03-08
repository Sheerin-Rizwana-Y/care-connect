import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marketplaceAPI, getImageUrl } from '../services/api';
import { Search, Plus, Filter, SlidersHorizontal, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CONDITIONS = ['New', 'Like New', 'Used', 'Damaged but usable'];
const CATEGORIES = ['Textbook', 'Electronics', 'Clothing', 'Stationery', 'Lab Equipment', 'Hostel Items', 'ID/Documents', 'Accessories', 'Sports', 'Other'];

function ListingCard({ listing }) {
  const statusColors = {
    active: 'badge-success',
    reserved: 'badge-warning',
    sold: 'badge-gray',
    pending: 'badge-primary',
  };

  return (
    <Link to={`/marketplace/${listing.id}`} className="card-hover flex flex-col group">
      <div className="relative overflow-hidden bg-gray-100 h-44">
        {listing.images?.[0] ? (
          <img
            src={getImageUrl(listing.images[0])}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.querySelector('.fallback-icon')?.style?.removeProperty('display');
            }}
          />
        ) : null}
        <div
          className="fallback-icon w-full h-full flex items-center justify-center"
          style={{ display: listing.images?.[0] ? 'none' : 'flex' }}
        >
          <Package size={40} className="text-gray-300" />
        </div>
        <div className="absolute top-2 left-2">
          <span className={`badge ${statusColors[listing.status] || 'badge-gray'} capitalize`}>{listing.status}</span>
        </div>
        {listing.is_free && (
          <div className="absolute top-2 right-2">
            <span className="badge bg-green-500 text-white">FREE</span>
          </div>
        )}
        {listing.interested_count > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-rose-500 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
              ♥ {listing.interested_count}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="font-semibold text-gray-900 truncate mb-1">{listing.title}</p>
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-gray badge text-xs">{listing.condition}</span>
          <span className="badge badge-primary text-xs">{listing.category}</span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <p className="font-bold text-primary-600 text-lg">
            {listing.is_free ? <span className="text-green-600">Free</span> : `₹${listing.price}`}
          </p>
          <div className="text-right">
            <p className="text-xs text-gray-500">{listing.seller_name}</p>
            <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '', condition: '', min_price: '', max_price: '', is_free: ''
  });
  const [page, setPage] = useState(0);
  const LIMIT = 12;

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * LIMIT,
        limit: LIMIT,
        ...(search && { search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.condition && { condition: filters.condition }),
        ...(filters.min_price && { min_price: parseFloat(filters.min_price) }),
        ...(filters.max_price && { max_price: parseFloat(filters.max_price) }),
        ...(filters.is_free !== '' && { is_free: filters.is_free === 'true' }),
      };
      const res = await marketplaceAPI.getListings(params);
      setListings(res.data.listings);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever page, filters, or search changes
  useEffect(() => {
    fetchListings();
  }, [page, filters, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    // useEffect will fire because search state already updated
  };

  const clearFilters = () => {
    setFilters({ category: '', condition: '', min_price: '', max_price: '', is_free: '' });
    setSearch('');
    setPage(0);
    // useEffect will fire due to state changes above
  };

  const hasFilters = Object.values(filters).some(v => v !== '') || search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Campus Marketplace</h1>
          <p className="page-subtitle">{total} items available</p>
        </div>
        <Link to="/marketplace/create" className="btn-primary flex items-center gap-2 self-start">
          <Plus size={18} />
          List an Item
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-3 mb-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search textbooks, electronics, etc."
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary px-6">Search</button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${hasFilters ? 'border-primary-400 text-primary-600' : ''}`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
          </button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            <select value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))} className="input-field text-sm">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.condition} onChange={e => setFilters(f => ({...f, condition: e.target.value}))} className="input-field text-sm">
              <option value="">Any Condition</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.is_free} onChange={e => setFilters(f => ({...f, is_free: e.target.value}))} className="input-field text-sm">
              <option value="">Paid & Free</option>
              <option value="true">Free Only</option>
              <option value="false">Paid Only</option>
            </select>
            <div className="flex gap-2">
              <input value={filters.min_price} onChange={e => setFilters(f => ({...f, min_price: e.target.value}))} placeholder="Min ₹" className="input-field text-sm w-1/2" type="number" />
              <input value={filters.max_price} onChange={e => setFilters(f => ({...f, max_price: e.target.value}))} placeholder="Max ₹" className="input-field text-sm w-1/2" type="number" />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="col-span-2 sm:col-span-4 text-sm text-gray-500 hover:text-red-500 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="bg-gray-200 h-44" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-6 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 card">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-gray-400 font-medium">No listings found</h3>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          <Link to="/marketplace/create" className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> List your first item
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
          </div>
          
          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => p-1)} disabled={page === 0} className="btn-secondary px-4 py-2 disabled:opacity-40">Previous</button>
              <span className="text-sm text-gray-600">Page {page+1} of {Math.ceil(total/LIMIT)}</span>
              <button onClick={() => setPage(p => p+1)} disabled={(page+1) * LIMIT >= total} className="btn-secondary px-4 py-2 disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
