import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, escRes] = await Promise.all([
          adminAPI.getReports(),
          adminAPI.getEscalations()
        ]);
        setReports(reportsRes.data);
        setEscalations(escRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleResolve = async (reportId) => {
    const resolution = prompt('Resolution notes:');
    if (!resolution) return;
    try {
      await adminAPI.resolveReport(reportId, resolution);
      toast.success('Report resolved');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch {
      toast.error('Failed to resolve');
    }
  };

  const typeColors = {
    marketplace_listing: 'badge-primary',
    message: 'badge-danger',
    lost_item: 'badge-warning',
    found_item: 'badge-success',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports & Escalations</h1>
        <p className="page-subtitle">Review user-reported issues</p>
      </div>

      <div className="card">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'reports', label: `Reports (${reports.length})` },
            { key: 'escalations', label: `Security Escalations (${escalations.length})` }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === tab.key ? 'text-primary-600' : 'text-gray-500'}`}>
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t" />}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
          ) : activeTab === 'reports' ? (
            reports.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={40} className="mx-auto text-green-300 mb-3" />
                <p className="text-gray-400">No pending reports</p>
              </div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      <span className={`badge ${typeColors[report.report_type] || 'badge-gray'}`}>
                        {report.report_type?.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1"><span className="font-medium">By:</span> {report.reporter_name}</p>
                  <p className="text-sm text-gray-600 mb-3">{report.reason}</p>
                  <button onClick={() => handleResolve(report.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm transition-colors">
                    <CheckCircle size={14} /> Mark Resolved
                  </button>
                </div>
              ))
            )
          ) : (
            escalations.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={40} className="mx-auto text-green-300 mb-3" />
                <p className="text-gray-400">No items escalated to security</p>
              </div>
            ) : (
              escalations.map(item => (
                <div key={item.id} className="p-4 border border-amber-100 bg-amber-50 rounded-xl">
                  <div className="flex justify-between mb-2">
                    <p className="font-semibold text-gray-900">{item.item_name}</p>
                    <span className="badge-warning badge">Escalated</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                  <p className="text-xs text-gray-500">Found at: {item.found_location}</p>
                  <p className="text-xs text-gray-500">Reported by: {item.reporter_name}</p>
                  {item.escalated_at && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Clock size={11} /> Escalated {formatDistanceToNow(new Date(item.escalated_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
