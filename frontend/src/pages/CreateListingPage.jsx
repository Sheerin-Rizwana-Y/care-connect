import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { marketplaceAPI } from '../services/api';
import { Upload, X, ArrowLeft, Info } from 'lucide-react';

const CATEGORIES = ['Textbook', 'Electronics', 'Clothing', 'Stationery', 'Lab Equipment', 'Hostel Items', 'ID/Documents', 'Accessories', 'Sports', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Used', 'Damaged but usable'];

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isFree, setIsFree] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data) => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('category', data.category);
    formData.append('description', data.description);
    formData.append('condition', data.condition);
    formData.append('is_free', isFree);
    if (!isFree) formData.append('price', data.price);
    if (data.pickup_location) formData.append('pickup_location', data.pickup_location);
    images.forEach(img => formData.append('images', img));

    setLoading(true);
    try {
      await marketplaceAPI.createListing(formData);
      toast.success('Listing create successfully! 🎉');
      navigate('/marketplace');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={18} /> Back to Marketplace
      </button>

      <div className="card p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Create Listing</h1>
        <p className="text-gray-500 text-sm mb-6">List an item for sale or exchange with fellow students</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Images */}
          <div>
            <label className="label">Item Photos * (Min 1, Max 5)</label>
            <div className="flex flex-wrap gap-3">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Add Photo</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Item Title *</label>
            <input {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Min 3 characters' } })}
              className="input-field" placeholder="e.g. Engineering Mathematics Textbook - 3rd Edition" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="label">Category *</label>
              <select {...register('category', { required: 'Category is required' })} className="input-field">
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
            </div>

            {/* Condition */}
            <div>
              <label className="label">Condition *</label>
              <select {...register('condition', { required: 'Condition is required' })} className="input-field">
                <option value="">Select condition</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Min 10 characters' } })}
              rows={4} className="input-field resize-none"
              placeholder="Describe the item, its condition, any defects, edition, etc." />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          {/* Price */}
          <div>
            <label className="label">Price</label>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="accent-primary-500 w-4 h-4" />
                <span className="text-sm text-gray-700">Give away for free</span>
              </label>
            </div>
            {!isFree && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                <input {...register('price', { required: !isFree ? 'Price is required' : false })}
                  type="number" min="0" step="1"
                  className="input-field pl-8" placeholder="Enter price" />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
              </div>
            )}
          </div>

          {/* Pickup Location */}
          <div>
            <label className="label">Pickup Location (optional)</label>
            <input {...register('pickup_location')} className="input-field"
              placeholder="e.g. Main Block, Library, Hostel A" />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Your listing will be reviewed by an administrator before becoming visible. 
              This usually takes a few hours.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
