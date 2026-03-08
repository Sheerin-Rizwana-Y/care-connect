import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchingAPI, getImageUrl } from '../services/api';
import { Sparkles, Package, ArrowRight, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function ScoreBar({ label, value, color = 'bg-primary-500' }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function MatchCard({ match }) {
  const score = match.scores?.total || 0;
  const scoreColor = score >= 0.7 ? 'text-green-600' : score >= 0.5 ? 'text-amber-600' : 'text-gray-500';
  const scoreBg = score >= 0.7 ? 'bg-green-50 border-green-100' : score >= 0.5 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100';

  return (
    <div className={`card border ${scoreBg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-violet-500" />
          <span className="font-semibold text-gray-900">AI Match</span>
        </div>
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {Math.round(score * 100)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to={`/lost-found/lost/${match.lost_item?.id}`} className="p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors group">
          <p className="text-xs text-red-500 font-medium mb-1">🔍 Lost Item</p>
          <p className="font-medium text-gray-900 text-sm truncate">{match.lost_item?.name}</p>
          {match.lost_item?.images?.[0] && (
            <img src={getImageUrl(match.lost_item.images[0])} alt="" className="w-full h-20 object-cover rounded-lg mt-2" />
          )}
        </Link>
        <Link to={`/lost-found/found/${match.found_item?.id}`} className="p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group">
          <p className="text-xs text-green-500 font-medium mb-1">📦 Found Item</p>
          <p className="font-medium text-gray-900 text-sm truncate">{match.found_item?.name}</p>
          {match.found_item?.images?.[0] && (
            <img src={getImageUrl(match.found_item.images[0])} alt="" className="w-full h-20 object-cover rounded-lg mt-2" />
          )}
        </Link>
      </div>

      <div className="space-y-2 mb-4">
        <ScoreBar label="Text Similarity" value={match.scores?.text || 0} color="bg-blue-500" />
        <ScoreBar label="Image Similarity" value={match.scores?.image || 0} color="bg-violet-500" />
        <ScoreBar label="Location Match" value={match.scores?.location || 0} color="bg-green-500" />
        <ScoreBar label="Time Proximity" value={match.scores?.time || 0} color="bg-amber-500" />
      </div>

      <div className="flex items-center justify-between">
        <span className={`badge ${match.status === 'confirmed' ? 'badge-success' : match.status === 'rejected' ? 'badge-danger' : 'badge-warning'} capitalize`}>
          {match.status}
        </span>
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await matchingAPI.getMyMatches();
        setMatches(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const pending = matches.filter(m => m.status === 'pending');
  const confirmed = matches.filter(m => m.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">AI Matches</h1>
        <p className="page-subtitle">Potential matches found by our AI engine</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Matches', value: matches.length, color: 'bg-violet-500' },
          { label: 'Pending Review', value: pending.length, color: 'bg-amber-500' },
          { label: 'Confirmed', value: confirmed.length, color: 'bg-green-500' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="card p-5 bg-gradient-to-r from-primary-50 to-violet-50 border-primary-100">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary-500" />
          How AI Matching Works
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { icon: '📝', label: 'Text Analysis', desc: '40% weight — Compares names & descriptions' },
            { icon: '🖼️', label: 'Image Match', desc: '30% weight — Visual similarity detection' },
            { icon: '📍', label: 'Location', desc: '20% weight — Proximity of locations' },
            { icon: '⏰', label: 'Time Window', desc: '10% weight — Temporal proximity' },
          ].map(item => (
            <div key={item.label} className="p-3 bg-white/70 rounded-xl">
              <span className="text-xl">{item.icon}</span>
              <p className="font-medium text-gray-900 text-xs mt-1">{item.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Matches */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-28 bg-gray-200 rounded-xl" />
                <div className="h-28 bg-gray-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => <div key={j} className="h-2 bg-gray-200 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 card">
          <Sparkles size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-gray-400 font-medium">No matches yet</h3>
          <p className="text-gray-400 text-sm mt-1">Report lost or found items to trigger AI matching</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link to="/lost-found/report-lost" className="btn-danger text-sm">Report Lost</Link>
            <Link to="/lost-found/report-found" className="btn-primary text-sm">Report Found</Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {matches.map(match => <MatchCard key={match.match_id} match={match} />)}
        </div>
      )}
    </div>
  );
}
