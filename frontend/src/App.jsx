import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MarketplacePage from './pages/MarketplacePage';
import ListingDetailPage from './pages/ListingDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import LostFoundPage from './pages/LostFoundPage';
import ReportLostPage from './pages/ReportLostPage';
import ReportFoundPage from './pages/ReportFoundPage';
import ItemDetailPage from './pages/ItemDetailPage';
import MessagesPage from './pages/MessagesPage';
import MatchesPage from './pages/MatchesPage';
import QRCodePage from './pages/QRCodePage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminListings from './pages/admin/AdminListings';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminLogs from './pages/admin/AdminLogs';
import ImageSearchPage from './pages/ImageSearchPage';
import QRScanPage from './pages/QRScanPage';
import ClaimsPage from './pages/ClaimsPage';
import Layout from './components/common/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-violet-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white text-2xl font-bold">C</span>
        </div>
        <p className="text-primary-600 font-medium">Loading CARE Connect+...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } }
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/qr/scan/:code" element={<QRScanPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/create" element={<CreateListingPage />} />
            <Route path="marketplace/:id" element={<ListingDetailPage />} />
            <Route path="lost-found" element={<LostFoundPage />} />
            <Route path="lost-found/report-lost" element={<ReportLostPage />} />
            <Route path="lost-found/report-found" element={<ReportFoundPage />} />
            <Route path="lost-found/lost/:id" element={<ItemDetailPage type="lost" />} />
            <Route path="lost-found/found/:id" element={<ItemDetailPage type="found" />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="claims" element={<ClaimsPage />} />
            <Route path="qr-codes" element={<QRCodePage />} />
            <Route path="image-search" element={<ImageSearchPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            
            {/* Admin routes */}
            <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="admin/listings" element={<AdminRoute><AdminListings /></AdminRoute>} />
            <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
