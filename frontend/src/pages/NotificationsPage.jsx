import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Bell, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeIcons = { match: '🎉', message: '💬', listing: '🛍️', claim: '🙌', expiry: '⏰', default: '🔔' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({...n, is_read: true})));
      toast.success('All marked as read');
    } catch {}
  };

  const deleteNotif = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) await markRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-2">
            <Check size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 card">
          <Bell size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-gray-400 font-medium">No notifications</h3>
          <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div key={notif.id}
              className={`card p-4 flex gap-3 transition-all ${notif.link ? 'cursor-pointer hover:shadow-card-hover' : ''}
                ${!notif.is_read ? 'border-l-4 border-l-primary-500' : ''}`}
              onClick={() => handleNotifClick(notif)}>
              <span className="text-2xl flex-shrink-0">{typeIcons[notif.type] || typeIcons.default}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</p>
                  <button onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                  {notif.link && (
                    <span className="text-xs text-primary-500 font-medium">Tap to view →</span>
                  )}
                </div>
              </div>
              {!notif.is_read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
