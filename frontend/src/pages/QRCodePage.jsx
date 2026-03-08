import { useState, useEffect } from 'react';
import { qrAPI } from '../services/api';
import toast from 'react-hot-toast';
import { QrCode, Plus, Download, Trash2, Eye } from 'lucide-react';

const CATEGORIES = ['Textbook', 'Electronics', 'Clothing', 'Stationery', 'Lab Equipment', 'Hostel Items', 'Accessories', 'Sports', 'Other'];

export default function QRCodePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ item_name: '', description: '', category: '' });
  const [selectedQR, setSelectedQR] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await qrAPI.getMyItems();
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.item_name || !form.category) { toast.error('Please fill all required fields'); return; }
    setGenerating(true);
    try {
      const res = await qrAPI.registerItem(form);
      toast.success('QR Code generated! Print and attach to your item.');
      setShowForm(false);
      setForm({ item_name: '', description: '', category: '' });
      fetchItems();
      setSelectedQR(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeactivate = async (itemId) => {
    if (!confirm('Deactivate this QR code? The code will no longer work.')) return;
    try {
      await qrAPI.deactivate(itemId);
      toast.success('QR code deactivated');
      fetchItems();
      if (selectedQR?.id === itemId) setSelectedQR(null);
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  const downloadQR = (item) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${item.qr_code_base64}`;
    link.download = `QR_${item.item_name.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">QR Code Protection</h1>
          <p className="page-subtitle">Register items and generate scannable QR codes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Register Item
        </button>
      </div>

      {/* How it works */}
      <div className="card p-5 bg-gradient-to-r from-primary-50 to-violet-50 border-primary-100">
        <h3 className="font-semibold text-gray-900 mb-3">How QR Protection Works</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { step: '1', text: 'Register your valuable item' },
            { step: '2', text: 'Download the generated QR code' },
            { step: '3', text: 'Print & attach to your item' },
            { step: '4', text: 'If found, scanner contacts you safely' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-2">
              <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{s.step}</span>
              <p className="text-gray-700 text-xs">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Register Form */}
      {showForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Register New Item</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Item Name *</label>
                <input value={form.item_name} onChange={e => setForm(f => ({...f, item_name: e.target.value}))}
                  className="input-field" placeholder="e.g. Dell Laptop, iPhone 14, Blue Casio Calculator" required />
              </div>
              <div>
                <label className="label">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="input-field" required>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={2} className="input-field resize-none" placeholder="Color, model, distinguishing features..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={generating} className="btn-primary flex-1">
                {generating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Generate QR Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Items Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-32 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 card">
              <QrCode size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-gray-400 font-medium">No registered items</h3>
              <p className="text-gray-400 text-sm mt-1">Register your valuable items to generate QR codes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map(item => (
                <div key={item.id} className={`card p-4 cursor-pointer transition-all ${selectedQR?.id === item.id ? 'border-2 border-primary-400' : 'hover:border-primary-200'}`}
                  onClick={() => setSelectedQR(item)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{item.item_name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <span className="badge-primary badge text-xs">{item.scan_count} scans</span>
                  </div>
                  <div className="flex items-center justify-center bg-gray-50 rounded-xl p-3 mb-3">
                    <img src={`data:image/png;base64,${item.qr_code_base64}`} alt="QR Code" className="w-32 h-32" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); downloadQR(item); }}
                      className="btn-secondary flex-1 text-xs flex items-center justify-center gap-1 py-1.5">
                      <Download size={13} /> Download
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeactivate(item.id); }}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview / Instructions */}
        <div className="space-y-4">
          {selectedQR ? (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">{selectedQR.item_name}</h3>
              <div className="flex items-center justify-center bg-gray-50 rounded-xl p-4 mb-4">
                <img src={`data:image/png;base64,${selectedQR.qr_code_base64}`} alt="QR Code" className="w-48 h-48" />
              </div>
              <button onClick={() => downloadQR(selectedQR)} className="btn-primary w-full flex items-center justify-center gap-2">
                <Download size={16} />
                Download QR Code
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Print this QR code and attach it to your {selectedQR.item_name}
              </p>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <QrCode size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Select an item to preview its QR code</p>
            </div>
          )}

          <div className="card p-4">
            <h4 className="font-medium text-gray-900 mb-3 text-sm">📌 Tips for QR Tags</h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex gap-2"><span>•</span>Print on sticker paper for best adhesion</li>
              <li className="flex gap-2"><span>•</span>Laminate to protect from water damage</li>
              <li className="flex gap-2"><span>•</span>Place in a visible but protected location</li>
              <li className="flex gap-2"><span>•</span>Your contact info remains hidden until scanned</li>
              <li className="flex gap-2"><span>•</span>Deactivate if you sell or lose the item</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
