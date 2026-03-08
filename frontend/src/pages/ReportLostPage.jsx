import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { lostItemsAPI } from '../services/api';
import { Upload, X, ArrowLeft } from 'lucide-react';

const CATEGORIES = ['Textbook', 'Electronics', 'Clothing', 'Stationery', 'Lab Equipment', 'Hostel Items', 'ID/Documents', 'Accessories', 'Sports', 'Other'];

export default function ReportLostPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) { toast.error('Max 5 images'); return; }
    setImages(p => [...p, ...files]);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = ev => setPreviews(p => [...p, ev.target.result]);
      r.readAsDataURL(f);
    });
  };

  const removeImage = (idx) => {
    setImages(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('item_name', data.item_name);
    formData.append('category', data.category);
    formData.append('description', data.description);
    formData.append('last_seen_location', data.last_seen_location);
    formData.append('date_lost', new Date(data.date_lost).toISOString());
    if (data.time_lost) formData.append('time_lost', data.time_lost);
    formData.append('is_urgent', isUrgent);
    images.forEach(img => formData.append('images', img));

    setLoading(true);
    try {
      await lostItemsAPI.report(formData);
      toast.success('Lost item reported! AI matching will run automatically. 🔍');
      navigate('/lost-found');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={18} /> Back
      </button>
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <span className="text-xl">🔍</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Report Lost Item</h1>
            <p className="text-gray-500 text-sm">AI will automatically search for matches</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="accent-red-500 w-4 h-4" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Mark as Urgent</p>
              <p className="text-xs text-amber-600">Use for ID cards, hall tickets, or critical documents</p>
            </div>
          </label>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input {...register('item_name', { required: 'Item name is required' })} className="input-field" placeholder="e.g. Blue Casio Calculator" />
              {errors.item_name && <p className="text-red-500 text-xs mt-1">{errors.item_name.message}</p>}
            </div>
            <div>
              <label className="label">Category *</label>
              <select {...register('category', { required: true })} className="input-field">
                <option value="">Select</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date Lost *</label>
              <input {...register('date_lost', { required: true })} type="date" className="input-field" max={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Approximate Time</label>
              <input {...register('time_lost')} type="time" className="input-field" />
            </div>
            <div>
              <label className="label">Last Seen Location *</label>
              <input {...register('last_seen_location', { required: true })} className="input-field" placeholder="e.g. Library 2nd floor" />
            </div>
          </div>

          <div>
            <label className="label">Description * (include identifying details)</label>
            <textarea {...register('description', { required: true, minLength: 10 })} rows={4}
              className="input-field resize-none"
              placeholder="Color, brand, model, serial number, distinguishing marks, what was inside..." />
          </div>

          <div>
            <label className="label">Photos (optional but helps AI matching)</label>
            <div className="flex flex-wrap gap-3">
              {previews.map((p, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Add</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-danger flex-1 py-3">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Report Lost Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
