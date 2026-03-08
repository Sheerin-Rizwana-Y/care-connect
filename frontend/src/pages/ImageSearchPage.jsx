import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { imageSearchAPI } from '../services/api';
import { Upload, Search, Zap, Package, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ImageSearchPage() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchIn, setSearchIn] = useState('all');
  const [searched, setSearched] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    setResults([]);
    setSearched(false);
  };

  const handleSearch = async () => {
    if (!image) { toast.error('Please select an image first'); return; }
    setSearching(true);
    const formData = new FormData();
    formData.append('image', image);
    formData.append('search_in', searchIn);
    try {
      const res = await imageSearchAPI.search(formData);
      setResults(res.data.results || []);
      setSearched(true);
      if (res.data.results.length === 0) toast('No similar items found. Try a clearer image.', { icon: '🔍' });
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    setResults([]);
    setSearched(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const typeLabels = { marketplace: 'Marketplace', found_item: 'Found Item', lost_item: 'Lost Item' };
  const typeBadge = { marketplace: 'badge-primary', found_item: 'badge-success', lost_item: 'badge-danger' };
  const typeLinks = {
    marketplace: (id) => `/marketplace/${id}`,
    found_item: (id) => `/lost-found/found/${id}`,
    lost_item: (id) => `/lost-found/lost/${id}`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Visual Image Search</h1>
        <p className="page-subtitle">Upload an image to find visually similar items across the platform</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload section */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap size={18} className="text-primary-500" />
            Upload Image to Search
          </h3>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${preview ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Selected" className="max-h-64 mx-auto rounded-xl object-contain" />
                <button onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Drop an image here or click to browse</p>
                <p className="text-gray-400 text-sm mt-1">JPG, PNG, WebP — max 5MB</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>

          <div>
            <label className="label">Search In</label>
            <select value={searchIn} onChange={e => setSearchIn(e.target.value)} className="input-field">
              <option value="all">All (Marketplace + Lost & Found)</option>
              <option value="marketplace">Marketplace Only</option>
              <option value="found">Found Items Only</option>
              <option value="lost">Lost Items Only</option>
            </select>
          </div>

          <button onClick={handleSearch} disabled={!image || searching} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {searching ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Search size={18} /> Search by Image</>
            )}
          </button>

          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            💡 <strong>Tip:</strong> Upload a clear, well-lit photo for best results. The AI analyzes visual features to find similar items.
          </div>
        </div>

        {/* Results */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {searched ? `Results (${results.length})` : 'Search Results'}
          </h3>
          {!searched ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Search size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-400">Upload an image and search to find similar items</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Package size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-400">No similar items found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different image or search category</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[500px]">
              {results.map((result, idx) => (
                <Link key={idx} to={typeLinks[result.type]?.(result.id) || '#'}
                  className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {result.image ? (
                      <img src={result.image} alt={result.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={20} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{result.title}</p>
                    <p className="text-xs text-gray-500">{result.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge text-xs ${typeBadge[result.type]}`}>{typeLabels[result.type]}</span>
                      <span className="text-xs text-gray-400">{Math.round(result.similarity_score * 100)}% match</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
