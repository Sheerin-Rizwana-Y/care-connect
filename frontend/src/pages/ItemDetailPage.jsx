import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lostItemsAPI, foundItemsAPI, messagingAPI, claimsAPI, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, Clock, MessageSquare, Package, AlertCircle, Shield, Sparkles } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function ItemDetailPage({ type }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [claimDesc, setClaimDesc] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = type === 'lost'
          ? await lostItemsAPI.getById(id)
          : await foundItemsAPI.getById(id);
        setItem(res.data);
      } catch {
        toast.error('Item not found');
        navigate('/lost-found');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, type]);

  const handleContact = async () => {
    if (!item) return;
    try {
      const receiverId = item.reported_by;
      await messagingAPI.sendMessage({
        receiver_id: receiverId,
        content: `Hi! I saw your ${type === 'lost' ? 'lost' : 'found'} item report for "${item.item_name}". I'd like to connect.`,
        related_item_id: id,
        related_item_type: type === 'lost' ? 'lost' : 'found'
      });
      toast.success('Message sent!');
      navigate(`/messages?user=${receiverId}&name=${encodeURIComponent(item.reporter_name || '')}`);
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleClaim = async () => {
    if (claimDesc.length < 20) { toast.error('Please provide more detail (min 20 characters)'); return; }
    setClaiming(true);
    try {
      await claimsAPI.submit({ found_item_id: id, proof_description: claimDesc });
      toast.success('Claim submitted! The finder will verify your details.');
      setShowClaimForm(false);
      setItem(prev => ({...prev, status: 'potential_match'}));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit claim');
    } finally {
      setClaiming(false);
    }
  };

  const handleEscalate = async () => {
    try {
      await foundItemsAPI.escalate(id);
      toast.success('Item escalated to campus security');
      setItem(prev => ({...prev, status: 'handed_to_security'}));
    } catch {
      toast.error('Failed to escalate');
    }
  };

  const handleClose = async () => {
    try {
      await lostItemsAPI.close(id);
      toast.success('Report closed');
      setItem(prev => ({...prev, status: 'closed'}));
    } catch {
      toast.error('Failed to close');
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="card p-6 space-y-4">
        <div className="h-64 bg-gray-200 rounded-xl" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded" />
      </div>
    </div>
  );

  if (!item) return null;

  const isOwner = item.reported_by === user?.id;
  const isLost = type === 'lost';
  const accentColor = isLost ? 'red' : 'green';

  const statusInfo = {
    open: { label: 'Open', color: 'badge-danger' },
    unclaimed: { label: 'Unclaimed', color: 'badge-warning' },
    potential_match: { label: 'Potential Match Found', color: 'badge-warning' },
    claimed: { label: 'Claimed', color: 'badge-success' },
    closed: { label: 'Closed', color: 'badge-gray' },
    handed_to_security: { label: 'Handed to Security', color: 'badge-gray' },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={18} /> Back to Lost & Found
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Images + Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="relative bg-gray-100 h-64">
              {item.images?.length > 0 ? (
                <img src={getImageUrl(item.images[activeImage])} alt={item.item_name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={64} className="text-gray-200" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`badge ${statusInfo[item.status]?.color || 'badge-gray'}`}>
                  {statusInfo[item.status]?.label || item.status}
                </span>
                {item.is_urgent && <span className="badge bg-red-600 text-white animate-pulse">🚨 URGENT</span>}
              </div>
            </div>
            {item.images?.length > 1 && (
              <div className="p-3 flex gap-2 overflow-x-auto">
                {item.images.map((img, idx) => (
                  <button key={idx} onClick={() => setActiveImage(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${activeImage === idx ? 'border-primary-500' : 'border-transparent'}`}>
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{item.item_name}</h1>
            <span className="badge-primary badge mb-4">{item.category}</span>
            <p className="text-gray-600 leading-relaxed mb-4">{item.description}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-gray-500 text-xs mb-1">{isLost ? 'Last Seen' : 'Found At'}</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <MapPin size={14} className="text-gray-400" />
                  {isLost ? item.last_seen_location : item.found_location}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-gray-500 text-xs mb-1">{isLost ? 'Date Lost' : 'Date Found'}</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Clock size={14} className="text-gray-400" />
                  {format(new Date(isLost ? item.date_lost : item.date_found), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* AI Matches */}
          {item.matches?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-500" />
                AI Potential Matches ({item.matches.length})
              </h3>
              <div className="space-y-3">
                {item.matches.map(match => (
                  <div key={match.match_id} className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm">{match.found_item_name || match.lost_item_name}</p>
                      <span className="badge-primary badge">{Math.round(match.total_score * 100)}% match</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 mb-2">
                      <div className="bg-gradient-to-r from-primary-500 to-violet-500 h-2 rounded-full transition-all"
                        style={{ width: `${match.total_score * 100}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <span>Text: {Math.round(match.text_score * 100)}%</span>
                      <span>Location: {Math.round(match.location_score * 100)}%</span>
                      <span>Time: {Math.round((match.time_score || 0) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Reporter */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Reported by</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold">
                {item.reporter_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{item.reporter_name}</p>
                <p className="text-xs text-gray-500">{item.reporter_department}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Reported {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Actions */}
          {!isOwner && (
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Actions</h3>

              {type === 'found' && item.status === 'unclaimed' && (
                <>
                  <button onClick={() => setShowClaimForm(!showClaimForm)}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    <Shield size={16} />
                    This is Mine!
                  </button>
                  {showClaimForm && (
                    <div className="space-y-2">
                      <label className="label text-xs">Describe identifying details to prove ownership:</label>
                      <textarea
                        value={claimDesc}
                        onChange={e => setClaimDesc(e.target.value)}
                        rows={3}
                        className="input-field resize-none text-sm"
                        placeholder="Describe unique features, what's inside, serial number, purchase date..."
                      />
                      <button onClick={handleClaim} disabled={claiming || claimDesc.length < 20}
                        className="btn-primary w-full text-sm">
                        {claiming ? 'Submitting...' : 'Submit Claim'}
                      </button>
                    </div>
                  )}
                </>
              )}

              <button onClick={handleContact} className="btn-secondary w-full flex items-center justify-center gap-2">
                <MessageSquare size={16} />
                Send Message
              </button>
            </div>
          )}

          {isOwner && (
            <div className="card p-4 space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Manage Report</h3>
              {type === 'found' && item.status !== 'handed_to_security' && (
                <button onClick={handleEscalate}
                  className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                  <Shield size={16} />
                  Hand to Security
                </button>
              )}
              {type === 'lost' && item.status !== 'closed' && (
                <button onClick={handleClose}
                  className="btn-secondary w-full text-sm">
                  Close Report (Found it!)
                </button>
              )}
              {item.status === 'handed_to_security' && (
                <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 text-center">
                  📦 Item has been handed to campus security
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
