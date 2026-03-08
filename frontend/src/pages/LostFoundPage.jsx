import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lostItemsAPI, foundItemsAPI, getImageUrl } from '../services/api';
import { Search, Package, Plus, Clock, MapPin, AlertCircle, Filter, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = ['Textbook', 'Electronics', 'Clothing', 'Stationery', 'Lab Equipment', 'Hostel Items', 'ID/Documents', 'Accessories', 'Sports', 'Other'];

function ItemCard({ item, type }) {
  const to = `/lost-found/${type}/${item.id}`;
  const statusColors = {
    open: 'badge-danger', potential_match: 'badge-warning', claimed: 'badge-success', closed: 'badge-gray',
    unclaimed: 'badge-warning', handed_to_security: 'badge-gray',
  };

  return (
    <Link to={to} className="card-hover p-4 flex gap-3">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
        {item.images?.[0] ? (
          <img
            src={getImageUrl(item.images[0])}
            alt={item.item_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling?.style?.removeProperty('display');
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ display: item.images?.[0] ? 'none' : 'flex' }}
        >
          <Package size={24} className="text-gray-300" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-gray-900 truncate">{item.item_name}</p>
          <div className="flex gap-1 flex-shrink-0">
            {item.is_urgent && <span className="badge bg-red-500 text-white text-xs">URGENT</span>}
            <span className={`badge ${statusColors[item.status]} capitalize text-xs`}>{item.status?.replace('_', ' ')}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {type === 'lost' ? item.last_seen_location : item.found_location}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function LostFoundPage() {
  const [activeTab, setActiveTab] = useState('lost');
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'mine'
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [lostTotal, setLostTotal] = useState(0);
  const [foundTotal, setFoundTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams = {
        ...(category && { category }),
        limit: 20
      };
      const lostParams = {
        ...baseParams,
        ...(search && { search }),
        ...(urgentOnly && { is_urgent: true }),
      };
      const foundParams = {
        ...baseParams,
        ...(search && { search }),
      };
      const [lostRes, foundRes, myLostRes, myFoundRes] = await Promise.all([
        lostItemsAPI.getAll(lostParams),
        foundItemsAPI.getAll(foundParams),
        lostItemsAPI.getMy(),
        foundItemsAPI.getMy(),
      ]);
      setLostItems(lostRes.data.items || []);
      setLostTotal(lostRes.data.total || 0);
      setFoundItems(foundRes.data.items || []);
      setFoundTotal(foundRes.data.total || 0);
      setMyLostItems(myLostRes.data || []);
      setMyFoundItems(myFoundRes.data || []);
    } catch (err) {
      console.error('fetchItems error:', err);
      setError('Failed to load items. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, category, urgentOnly]);

  const allItems = activeTab === 'lost' ? lostItems : foundItems;
  const myItems = activeTab === 'lost' ? myLostItems : myFoundItems;
  const items = viewMode === 'mine' ? myItems : allItems;
  const total = activeTab === 'lost' ? lostTotal : foundTotal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Lost & Found</h1>
          <p className="page-subtitle">AI-powered item recovery system</p>
        </div>
        <div className="flex gap-2">
          <Link to="/lost-found/report-lost" className="btn-danger flex items-center gap-2">
            <Plus size={16} />
            Report Lost
          </Link>
          <Link to="/lost-found/report-found" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Report Found
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
          <AlertCircle size={18} className="flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchItems} className="ml-auto text-sm underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('lost')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'lost' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Lost Items ({lostTotal})
            {activeTab === 'lost' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t" />}
          </button>
          <button
            onClick={() => setActiveTab('found')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'found' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Found Items ({foundTotal})
            {activeTab === 'found' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t" />}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="px-4 pt-3 flex gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All Campus
          </button>
          <button
            onClick={() => setViewMode('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'mine' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <User size={11} />
            My Reports ({activeTab === 'lost' ? myLostItems.length : myFoundItems.length})
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-50 flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="input-field pl-9 text-sm"
            />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field text-sm w-auto">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {activeTab === 'lost' && (
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 text-sm">
              <input type="checkbox" checked={urgentOnly} onChange={e => setUrgentOnly(e.target.checked)} className="accent-red-500" />
              <span className="text-gray-700">Urgent Only</span>
            </label>
          )}
        </div>
        {/* Summary note */}
        <div className="px-4 pt-2 pb-1">
          <p className="text-xs text-gray-400">
            {viewMode === 'mine'
              ? `Showing your ${activeTab === 'lost' ? 'lost item reports' : 'found item reports'}`
              : `Showing all campus-wide ${activeTab === 'lost' ? 'lost item reports' : 'found item reports'}`}
          </p>
        </div>

        {/* Items List */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3 p-4 rounded-xl border border-gray-100">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">
                {viewMode === 'mine' ? `You haven't reported any ${activeTab} items yet` : `No ${activeTab} items found`}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {viewMode === 'mine' ? 'Use the buttons above to report an item' : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => <ItemCard key={item.id} item={item} type={activeTab} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
