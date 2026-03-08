import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { foundItemsAPI } from '../services/api';
import { Upload, X, ArrowLeft } from 'lucide-react';

const CATEGORIES = ['Textbook', 'Electronics', 'Clothing', 'Stationery', 'Lab Equipment', 'Hostel Items', 'ID/Documents', 'Accessories', 'Sports', 'Other'];

export default function ReportFoundPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
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
    formData.append('found_location', data.found_location);
    formData.append('date_found', new Date(data.date_found).toISOString());
    images.forEach(img => formData.append('images', img));

    setLoading(true);
    try {
      await foundItemsAPI.report(formData);
      toast.success('Found item reported! You earned 5 points! 🏅');
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">🙌</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Report Found Item</h1>
            <p className="text-gray-500 text-sm">Help reunite items with their owners. Earn reward points!</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input {...register('item_name', { required: true })} className="input-field" placeholder="What did you find?" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select {...register('category', { required: true })} className="input-field">
                <option value="">Select</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date Found *</label>
              <input {...register('date_found', { required: true })} type="date" className="input-field" max={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="col-span-2">
              <label className="label">Found Location *</label>
              <input {...register('found_location', { required: true })} className="input-field" placeholder="e.g. Canteen, Lab 3, Hostel B corridor" />
            </div>
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea {...register('description', { required: true, minLength: 10 })} rows={4}
              className="input-field resize-none"
              placeholder="Describe the item in detail - color, brand, condition, contents if applicable..." />
          </div>

          <div>
            <label className="label">Photos * (helps identify the owner)</label>
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
                  <span className="text-xs text-gray-400 mt-1">Add Photo</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
            🏅 You'll earn <strong>5 points</strong> for reporting this item, and <strong>20 more points</strong> when you successfully return it to the owner!
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Report Found Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
