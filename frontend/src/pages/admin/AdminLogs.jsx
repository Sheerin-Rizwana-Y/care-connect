import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const actionColors = {
  listing_approved: 'badge-success',
  listing_rejected: 'badge-danger',
  user_suspended: 'badge-warning',
  item_escalated_to_security: 'badge-warning',
  listing_created: 'badge-primary',
};

const actionIcons = {
  listing_approved: '✅',
  listing_rejected: '❌',
  user_suspended: '🚫',
  item_escalated_to_security: '📦',
  listing_created: '🛍️',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getLogs({ limit: 100 });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Complete record of all admin actions</p>
        </div>
        <button onClick={fetchLogs} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400">No audit logs yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-lg flex-shrink-0">{actionIcons[log.action] || '📝'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${actionColors[log.action] || 'badge-gray'}`}>
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">by {log.admin_name || 'System'}</span>
                  </div>
                  {log.reason && <p className="text-xs text-gray-400 mt-0.5">Reason: {log.reason}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {log.timestamp ? format(new Date(log.timestamp), 'MMM d, h:mm a') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
