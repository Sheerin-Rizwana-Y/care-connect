import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { marketplaceAPI, messagingAPI, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, MessageSquare, MapPin, Clock, Package, Tag, AlertTriangle, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [messaging, setMessaging] = useState(false);
  const [interested, setInterested] = useState(false);
  const [interestedCount, setInterestedCount] = useState(0);
  const [togglingInterest, setTogglingInterest] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await marketplaceAPI.getListing(id);
        setListing(res.data);
        setInterestedCount(res.data.interested_count || 0);
        // Fetch whether current user is interested
        try {
          const interestRes = await marketplaceAPI.getInterestStatus(id);
          setInterested(interestRes.data.interested);
          setInterestedCount(interestRes.data.interested_count);
        } catch {}
      } catch (err) {
        toast.error('Listing not found');
        navigate('/marketplace');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const handleContact = async () => {
    setMessaging(true);
    try {
      await messagingAPI.sendMessage({
        receiver_id: listing.seller_id,
        content: `Hi! I'm interested in your listing: "${listing.title}"`,
        related_item_id: listing.id,
        related_item_type: 'marketplace'
      });
      toast.success('Message sent! Check your messages.');
      navigate(`/messages?user=${listing.seller_id}&name=${encodeURIComponent(listing.seller_name || '')}`);
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setMessaging(false);
    }
  };

  const handleToggleInterest = async () => {
    if (togglingInterest) return;
    setTogglingInterest(true);
    try {
      const res = await marketplaceAPI.toggleInterest(listing.id);
      setInterested(res.data.interested);
      setInterestedCount(res.data.interested_count);
      toast.success(res.data.interested ? 'Added to your interests!' : 'Removed from interests');
    } catch (err) {
      toast.error('Failed to update interest');
    } finally {
      setTogglingInterest(false);
    }
  };

  const handleMarkSold = async () => {
    try {
      await marketplaceAPI.markSold(listing.id);
      toast.success('Marked as sold');
      setListing(prev => ({...prev, status: 'sold'}));
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleReserve = async () => {
    try {
      await marketplaceAPI.reserveListing(listing.id);
      toast.success('Marked as reserved');
      setListing(prev => ({...prev, status: 'reserved'}));
    } catch (err) {
      toast.error('Failed to update');
    }
  };


  if (loading) return (
    <div className="max-w-4xl mx-auto">
      <div className="card animate-pulse">
        <div className="h-80 bg-gray-200" />
        <div className="p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );

  if (!listing) return null;

  const isOwner = listing.seller_id === user?.id;
  const statusColors = { active: 'badge-success', reserved: 'badge-warning', sold: 'badge-gray', pending: 'badge-primary' };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={18} /> Back to Marketplace
      </button>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Images */}
        <div className="card overflow-hidden">
          <div className="relative bg-gray-100 h-72">
            {listing.images?.length > 0 ? (
              <img
                src={getImageUrl(listing.images[activeImage])}
                alt={listing.title}
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.style?.removeProperty('display'); }}
              />
            ) : null}
            {(!listing.images?.length) && (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={64} className="text-gray-200" />
              </div>
            )}
            <span className={`absolute top-3 left-3 badge ${statusColors[listing.status]} capitalize`}>{listing.status}</span>
          </div>
          {listing.images?.length > 1 && (
            <div className="p-3 flex gap-2 overflow-x-auto">
              {listing.images.map((img, idx) => (
                <button key={idx} onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all
                  ${activeImage === idx ? 'border-primary-500' : 'border-transparent'}`}>
                  <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = ''; e.target.style.background = '#f3f4f6'; }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-xl font-bold text-gray-900">{listing.title}</h1>
              <p className="text-2xl font-bold text-primary-600 whitespace-nowrap">
                {listing.is_free ? <span className="text-green-600">FREE</span> : `₹${listing.price}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge-primary badge">{listing.category}</span>
              <span className="badge-gray badge">{listing.condition}</span>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-4">{listing.description}</p>

            <div className="space-y-2 text-sm text-gray-500">
              {listing.pickup_location && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span>Pickup: {listing.pickup_location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <span>Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-gray-400" />
                <span>{listing.views || 0} views</span>
              </div>
              {/* Interest Count */}
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-rose-400" />
                <span>
                  <span className="font-semibold text-rose-500">{interestedCount}</span>
                  {interestedCount === 1 ? ' person interested' : ' people interested'}
                </span>
              </div>
            </div>
          </div>

          {/* Seller */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Listed by</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold">
                {listing.seller_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{listing.seller_name}</p>
                <p className="text-xs text-gray-500">{listing.seller_department}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isOwner && listing.status === 'active' ? (
            <div className="space-y-2">
              {/* Interest toggle */}
              <button
                onClick={handleToggleInterest}
                disabled={togglingInterest}
                className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all border
                  ${interested
                    ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200'
                  }`}
              >
                <Heart size={16} className={interested ? 'fill-rose-500 text-rose-500' : ''} />
                {interested ? `Interested · ${interestedCount}` : `Show Interest · ${interestedCount}`}
              </button>
              <button onClick={handleContact} disabled={messaging} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                <MessageSquare size={18} />
                {messaging ? 'Sending...' : 'Contact Seller'}
              </button>
              <button
                onClick={() => { marketplaceAPI.reportListing(id, 'Inappropriate content'); toast.success('Report submitted'); }}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-red-500 border-red-200 hover:bg-red-50">
                <AlertTriangle size={16} />
                Report Listing
              </button>
            </div>
          ) : isOwner ? (
            <div className="space-y-2">
              {/* Show interest count to owner */}
              {interestedCount > 0 && (
                <div className="p-3 bg-rose-50 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
                  <Heart size={16} className="fill-rose-400 text-rose-400 flex-shrink-0" />
                  <span><span className="font-semibold">{interestedCount}</span> {interestedCount === 1 ? 'person is' : 'people are'} interested in this listing</span>
                </div>
              )}
              {listing.status === 'active' && (
                <>
                  <button onClick={handleReserve} className="btn-secondary w-full">Mark as Reserved</button>
                  <button onClick={handleMarkSold} className="btn-primary w-full">Mark as Sold/Exchanged</button>
                </>
              )}
              {listing.status === 'reserved' && (
                <button onClick={handleMarkSold} className="btn-primary w-full">Mark as Sold/Exchanged</button>
              )}
              {listing.status === 'sold' && (
                <div className="p-3 bg-green-50 rounded-xl text-center text-green-700 text-sm font-medium">
                  ✅ This item has been sold
                </div>
              )}
            </div>
          ) : (
            <div className={`p-3 rounded-xl text-center text-sm font-medium
              ${listing.status === 'sold' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>
              {listing.status === 'sold' ? '❌ This item has been sold' : `⚠️ Item is ${listing.status}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
