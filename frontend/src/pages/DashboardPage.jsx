import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { marketplaceAPI, lostItemsAPI, foundItemsAPI, matchingAPI, notificationsAPI, getImageUrl } from '../services/api';
import { ShoppingBag, Search, MapPin, Sparkles, Bell, Plus, ArrowRight, Package, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className={`card p-5 hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 group`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ listings: 0, lostItems: 0, matches: 0, foundItems: 0 });
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentListings, setRecentListings] = useState([]);
  const [urgentLost, setUrgentLost] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, lostRes, foundRes, matchesRes, notifRes, urgentRes] = await Promise.allSettled([
          marketplaceAPI.getListings({ limit: 4, sort_by: 'created_at' }),
          lostItemsAPI.getMy(),
          foundItemsAPI.getMy(),
          matchingAPI.getMyMatches(),
          notificationsAPI.getAll(),
          lostItemsAPI.getAll({ is_urgent: true, limit: 3 }),
        ]);

        setStats({
          listings: listingsRes.status === 'fulfilled' ? listingsRes.value.data.total : 0,
          lostItems: lostRes.status === 'fulfilled' ? lostRes.value.data.length : 0,
          foundItems: foundRes.status === 'fulfilled' ? foundRes.value.data.length : 0,
          matches: matchesRes.status === 'fulfilled' ? matchesRes.value.data.length : 0,
        });

        if (notifRes.status === 'fulfilled') {
          setRecentNotifications(notifRes.value.data.slice(0, 5));
        }

        if (listingsRes.status === 'fulfilled') {
          setRecentListings(listingsRes.value.data.listings.slice(0, 4));
        }

        if (urgentRes.status === 'fulfilled') {
          setUrgentLost(urgentRes.value.data.items?.slice(0, 3) || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const notifIcons = { match: '🎉', message: '💬', listing: '🛍️', claim: '🙌', expiry: '⏰', default: '🔔' };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-500 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Good day, {user?.name?.split(' ')[0]}! 👋</h2>
            <p className="text-white/70 text-sm">{user?.department} • {user?.year_of_study || user?.staff_designation}</p>
          </div>
          <div className="hidden sm:flex gap-3">
            <Link to="/marketplace/create" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
              <Plus size={16} />
              Sell Item
            </Link>
            <Link to="/lost-found/report-lost" className="flex items-center gap-2 bg-white text-primary-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-50 transition-all">
              <Search size={16} />
              Report Lost
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Marketplace Items" value={stats.listings} color="bg-blue-500" to="/marketplace" />
        <StatCard icon={Search} label="My Lost Reports" value={stats.lostItems} color="bg-red-500" to="/lost-found" />
        <StatCard icon={Package} label="My Found Reports" value={stats.foundItems} color="bg-green-500" to="/lost-found" />
        <StatCard icon={Sparkles} label="AI Matches" value={stats.matches} color="bg-violet-500" to="/matches" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Listings */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Marketplace</h3>
            <Link to="/marketplace" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentListings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No listings yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recentListings.map(listing => (
                <Link key={listing.id} to={`/marketplace/${listing.id}`} className="p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all">
                  {listing.images?.[0] && (
                    <img src={getImageUrl(listing.images[0])} alt={listing.title} className="w-full h-24 object-cover rounded-lg mb-2" />
                  )}
                  <p className="font-medium text-sm text-gray-900 truncate">{listing.title}</p>
                  <p className="text-xs text-gray-500">{listing.condition}</p>
                  <p className="font-semibold text-primary-600 text-sm mt-1">
                    {listing.is_free ? 'Free' : `₹${listing.price}`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications & Urgent */}
        <div className="space-y-4">
          {/* Urgent Lost Items */}
          {urgentLost.length > 0 && (
            <div className="card p-5 border border-red-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Urgent Lost Items
              </h3>
              <div className="space-y-2">
                {urgentLost.map(item => (
                  <Link key={item.id} to={`/lost-found/lost/${item.id}`} className="block p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                    <p className="font-medium text-sm text-red-800">{item.item_name}</p>
                    <p className="text-xs text-red-600">{item.last_seen_location}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <Link to="/notifications" className="text-xs text-primary-600 font-medium">See all</Link>
            </div>
            {recentNotifications.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotifications.map(notif => (
                  <div key={notif.id} className={`p-3 rounded-xl transition-colors ${notif.is_read ? 'bg-gray-50' : 'bg-primary-50 border border-primary-100'}`}>
                    <div className="flex gap-2">
                      <span className="text-base">{notifIcons[notif.type] || notifIcons.default}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/marketplace/create', icon: Plus, label: 'Sell an Item', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            { to: '/lost-found/report-lost', icon: Search, label: 'Report Lost', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
            { to: '/lost-found/report-found', icon: MapPin, label: 'Report Found', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
            { to: '/qr-codes', icon: Package, label: 'My QR Codes', color: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
          ].map(action => (
            <Link key={action.to} to={action.to} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${action.color}`}>
              <action.icon size={22} />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
