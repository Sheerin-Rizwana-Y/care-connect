import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, ShoppingBag, Search, Package, TrendingUp, AlertCircle, FileText, Activity } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await adminAPI.getAnalytics();
        setAnalytics(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(8)].map((_, i) => <div key={i} className="card p-5 h-24 bg-gray-100" />)}
    </div>
  );

  const stats = [
    { label: 'Total Users', value: analytics?.total_users, icon: Users, color: 'bg-blue-500' },
    { label: 'Lost Reports', value: analytics?.total_lost_items, icon: Search, color: 'bg-red-500' },
    { label: 'Found Reports', value: analytics?.total_found_items, icon: Package, color: 'bg-green-500' },
    { label: 'Marketplace Items', value: analytics?.total_marketplace_listings, icon: ShoppingBag, color: 'bg-violet-500' },
    { label: 'Successful Recoveries', value: analytics?.successful_recoveries, icon: TrendingUp, color: 'bg-emerald-500' },
    { label: 'Recovery Rate', value: `${analytics?.recovery_rate}%`, icon: Activity, color: 'bg-cyan-500' },
    { label: 'Pending Listings', value: analytics?.pending_listings, icon: AlertCircle, color: 'bg-amber-500', urgent: true },
    { label: 'Pending Reports', value: analytics?.pending_reports, icon: FileText, color: 'bg-orange-500', urgent: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and moderation tools</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/listings" className="btn-primary text-sm">Review Listings</Link>
          <Link to="/admin/reports" className="btn-secondary text-sm">View Reports</Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className={`card p-5 ${stat.urgent && stat.value > 0 ? 'border-amber-200 bg-amber-50' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon size={20} className="text-white" />
            </div>
            <p className={`text-2xl font-bold ${stat.urgent && stat.value > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Lost & Found Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.monthly_stats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="found" name="Found" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top categories */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Lost Item Categories</h3>
          {analytics?.top_categories?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.top_categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent*100).toFixed(0)}%`}>
                  {analytics.top_categories.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Hotspot Locations */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">📍 Loss Hotspot Locations</h3>
          {analytics?.hotspot_locations?.length > 0 ? (
            <div className="space-y-3">
              {analytics.hotspot_locations.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">{idx+1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{loc.location || 'Unknown'}</span>
                      <span className="text-gray-500">{loc.count} reports</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(loc.count / analytics.hotspot_locations[0]?.count) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-8">No data yet</p>}
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {analytics?.recent_activity?.map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <span className="text-lg">{activity.type === 'lost_reported' ? '🔍' : '📦'}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{activity.type.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
            {!analytics?.recent_activity?.length && <p className="text-gray-400 text-center py-8">No recent activity</p>}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Admin Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/admin/listings', label: 'Review Listings', icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', badge: analytics?.pending_listings },
            { to: '/admin/users', label: 'Manage Users', icon: Users, color: 'bg-violet-50 text-violet-600' },
            { to: '/admin/reports', label: 'View Reports', icon: AlertCircle, color: 'bg-red-50 text-red-600', badge: analytics?.pending_reports },
            { to: '/admin/logs', label: 'Audit Logs', icon: FileText, color: 'bg-gray-50 text-gray-600' },
          ].map(link => (
            <Link key={link.to} to={link.to} className={`flex flex-col items-center gap-2 p-4 rounded-xl relative transition-all hover:shadow-sm ${link.color}`}>
              {link.badge > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
              <link.icon size={22} />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
