import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI, messagingAPI } from '../../services/api';
import {
  LayoutDashboard, ShoppingBag, Search, MapPin, Bell, MessageSquare,
  QrCode, User, LogOut, Menu, X, Shield, ChevronDown, Award,
  Zap, Heart, Sparkles
} from 'lucide-react';

function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [notif, msg] = await Promise.all([
          notificationsAPI.getUnreadCount(),
          messagingAPI.getUnreadCount()
        ]);
        setUnreadNotif(notif.data.count);
        setUnreadMsg(msg.data.count);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { to: '/lost-found', icon: Search, label: 'Lost & Found' },
    { to: '/matches', icon: Sparkles, label: 'AI Matches' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', badge: unreadMsg },
    { to: '/claims', icon: Heart, label: 'Claims' },
    { to: '/qr-codes', icon: QrCode, label: 'QR Codes' },
    { to: '/image-search', icon: Zap, label: 'Image Search' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotif },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin Panel' });
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-30 transition-transform duration-300 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Logo */}
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">CARE Connect+</h1>
              <p className="text-xs text-gray-400">Campus Smart Platform</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-violet-400 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.department}</p>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium
              ${user?.role === 'admin' ? 'bg-red-100 text-red-600' : 
                user?.role === 'staff' ? 'bg-amber-100 text-amber-600' : 
                'bg-primary-100 text-primary-600'}`}>
              {user?.role}
            </span>
          </div>
          {user?.points > 0 && (
            <div className="flex items-center gap-1 mt-2 px-2">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">{user.points} points</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-1">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive 
                  ? 'bg-primary-50 text-primary-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
              onClick={() => setIsOpen(false)}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ setIsOpen }) {
  const location = useLocation();
  
  const titles = {
    '/dashboard': 'Dashboard',
    '/marketplace': 'Campus Marketplace',
    '/marketplace/create': 'Create Listing',
    '/lost-found': 'Lost & Found',
    '/matches': 'AI Matches',
    '/messages': 'Messages',
    '/claims': 'Claims',
    '/qr-codes': 'QR Codes',
    '/image-search': 'Image Search',
    '/notifications': 'Notifications',
    '/profile': 'My Profile',
    '/admin': 'Admin Dashboard',
  };

  const title = Object.entries(titles).find(([path]) => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] || 'CARE Connect+';

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-10">
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <Menu size={20} />
      </button>
      <h2 className="font-semibold text-gray-900">{title}</h2>
    </header>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="lg:pl-64 min-h-screen flex flex-col">
        <TopBar setIsOpen={setSidebarOpen} />
        <main className="flex-1 p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
