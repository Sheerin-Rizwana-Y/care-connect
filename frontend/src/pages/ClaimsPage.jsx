import { useState, useEffect } from 'react';
import { claimsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Heart, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ClaimsPage() {
  const [myClaims, setMyClaims] = useState([]);
  const [receivedClaims, setReceivedClaims] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const [myRes, recRes] = await Promise.all([
          claimsAPI.getMyClaims(),
          claimsAPI.getReceivedClaims()
        ]);
        setMyClaims(myRes.data);
        setReceivedClaims(recRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  const handleApprove = async (claimId) => {
    try {
      await claimsAPI.approve(claimId);
      toast.success('Claim approved! Item marked as returned. 🎉 You earned 20 points!');
      setReceivedClaims(prev => prev.map(c => c.id === claimId ? {...c, status: 'approved'} : c));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async (claimId) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await claimsAPI.reject(claimId, reason);
      toast.success('Claim rejected');
      setReceivedClaims(prev => prev.map(c => c.id === claimId ? {...c, status: 'rejected'} : c));
    } catch {
      toast.error('Failed to reject');
    }
  };

  const statusBadge = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

  const claims = activeTab === 'received' ? receivedClaims : myClaims;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Claims</h1>
        <p className="page-subtitle">Manage ownership claims for found items</p>
      </div>

      <div className="card">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'received', label: `Claims on My Items (${receivedClaims.length})` },
            { key: 'my', label: `My Claims (${myClaims.length})` }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === tab.key ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t" />}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <Heart size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">No claims {activeTab === 'received' ? 'on your items' : 'submitted'}</p>
            </div>
          ) : (
            claims.map(claim => (
              <div key={claim.id} className="p-4 border border-gray-100 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{claim.found_item_name}</p>
                    {activeTab === 'received' && <p className="text-sm text-gray-500">Claimed by: <span className="font-medium">{claim.claimant_name}</span></p>}
                  </div>
                  <span className={`badge ${statusBadge[claim.status]} capitalize`}>{claim.status}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg mb-3">
                  <p className="text-xs text-gray-500 mb-1">Proof of ownership:</p>
                  <p className="text-sm text-gray-700">{claim.proof_description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} />
                    {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                  </span>
                  {activeTab === 'received' && claim.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleReject(claim.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm transition-colors">
                        <XCircle size={14} /> Reject
                      </button>
                      <button onClick={() => handleApprove(claim.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm transition-colors">
                        <CheckCircle size={14} /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
