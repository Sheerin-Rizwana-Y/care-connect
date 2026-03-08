import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { qrAPI } from '../services/api';
import { Package, MessageSquare, AlertCircle, Loader } from 'lucide-react';

export default function QRScanPage() {
  const { code } = useParams();
  const [itemInfo, setItemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await qrAPI.scanCode(code);
        setItemInfo(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired QR code');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <Loader size={40} className="mx-auto text-primary-400 mb-4 animate-spin" />
            <p className="text-gray-600">Loading item information...</p>
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">QR Code Invalid</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link to="/" className="btn-primary">Go to CARE Connect+</Link>
          </div>
        ) : (
          <div className="card p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package size={32} className="text-primary-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Item Found!</h2>
              <p className="text-gray-500 text-sm mt-1">This item is registered on CARE Connect+</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Item Name</p>
                <p className="font-semibold text-gray-900">{itemInfo?.item_name}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <p className="font-medium text-gray-900">{itemInfo?.category}</p>
              </div>
              {itemInfo?.description && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{itemInfo.description}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 mb-4">
              <p className="text-sm text-primary-700 text-center">
                {itemInfo?.message}
              </p>
            </div>

            <div className="space-y-3">
              <Link to={itemInfo?.contact_url || '/login'} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                <MessageSquare size={18} />
                Contact Owner via CARE Connect+
              </Link>
              <Link to="/" className="btn-secondary w-full text-center py-3 block">
                Go to CARE Connect+
              </Link>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              🔒 Owner's contact information is protected. Please use the platform to communicate safely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
