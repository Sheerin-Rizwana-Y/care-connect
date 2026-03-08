import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
export default api;

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  uploadProfilePicture: (formData) => api.post('/auth/me/picture', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getActivity: () => api.get('/auth/me/activity'),
};

// Marketplace
export const marketplaceAPI = {
  createListing: (formData) =>
    api.post('/marketplace/listings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getListings: (params) => api.get('/marketplace/listings', { params }),
  getMyListings: () => api.get('/marketplace/listings/my'),
  getListing: (id) => api.get(`/marketplace/listings/${id}`),
  updateListing: (id, data) => api.put(`/marketplace/listings/${id}`, data),
  deleteListing: (id) => api.delete(`/marketplace/listings/${id}`),
  reserveListing: (id) => api.patch(`/marketplace/listings/${id}/reserve`),
  markSold: (id) => api.patch(`/marketplace/listings/${id}/mark-sold`),
  reportListing: (id, reason) =>
    api.post(`/marketplace/listings/${id}/report?reason=${reason}`),
  getCategories: () => api.get('/marketplace/categories'),
  toggleInterest: (id) => api.post(`/marketplace/listings/${id}/interest`),
  getInterestStatus: (id) => api.get(`/marketplace/listings/${id}/interest`),
};

// Lost Items
export const lostItemsAPI = {
  report: (formData) => api.post('/lost-items', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/lost-items', { params }),
  getMy: () => api.get('/lost-items/my'),
  getById: (id) => api.get(`/lost-items/${id}`),
  update: (id, data) => api.put(`/lost-items/${id}`, data),
  delete: (id) => api.delete(`/lost-items/${id}`),
  close: (id) => api.patch(`/lost-items/${id}/close`),
};

// Found Items
export const foundItemsAPI = {
  report: (formData) => api.post('/found-items', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/found-items', { params }),
  getMy: () => api.get('/found-items/my'),
  getById: (id) => api.get(`/found-items/${id}`),
  escalate: (id) => api.patch(`/found-items/${id}/escalate`),
};

// Matching
export const matchingAPI = {
  getMyMatches: () => api.get('/matching/my-matches'),
  triggerMatching: (lostItemId) => api.post(`/matching/trigger/${lostItemId}`),
  confirmMatch: (matchId) => api.patch(`/matching/${matchId}/confirm`),
  rejectMatch: (matchId) => api.patch(`/matching/${matchId}/reject`),
};

// Messaging
export const messagingAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId) => api.get(`/messages/conversation/${userId}`),
  sendMessage: (data) => api.post('/messages/send', data),
  sendImage: (receiverId, formData) =>
    api.post(`/messages/send-image?receiver_id=${receiverId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getUnreadCount: () => api.get('/messages/unread-count'),

  // report a message
  reportMessage: (messageId, reason) =>
    api.post(`/messages/messages/${messageId}/report`, null, {
      params: { reason },
    }),
};

// Claims
export const claimsAPI = {
  submit: (data) => api.post('/claims/submit', null, { params: data }),
  getMyClaims: () => api.get('/claims/my-claims'),
  getReceivedClaims: () => api.get('/claims/received-claims'),
  approve: (claimId) => api.patch(`/claims/${claimId}/approve`),
  reject: (claimId, reason) => api.patch(`/claims/${claimId}/reject?reason=${reason}`),
};

// QR Codes
export const qrAPI = {
  registerItem: (data) => api.post('/qr/register-item', null, { params: data }),
  getMyItems: () => api.get('/qr/my-items'),
  scanCode: (encryptedData) => api.get(`/qr/scan/${encryptedData}`),
  deactivate: (itemId) => api.delete(`/qr/${itemId}`),
};

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Admin
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getPendingListings: () => api.get('/admin/pending-listings'),
  approveListing: (id) => api.patch(`/admin/listings/${id}/approve`),
  rejectListing: (id, reason) => api.patch(`/admin/listings/${id}/reject?reason=${reason}`),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id, reason) => api.patch(`/admin/users/${id}/suspend?reason=${reason}`),
  blockUser: (id, reason) => api.patch(`/admin/users/${id}/block?reason=${reason}`),
  activateUser: (id) => api.patch(`/admin/users/${id}/activate`),
  makeAdmin: (id) => api.patch(`/admin/users/${id}/make-admin`),
  getReports: () => api.get('/admin/reports'),
  resolveReport: (id, resolution) => api.patch(`/admin/reports/${id}/resolve?resolution=${resolution}`),
  getEscalations: () => api.get('/admin/escalations'),
  getLogs: (params) => api.get('/admin/logs', { params }),
  getLostItems: (params) => api.get('/admin/lost-items', { params }),
  removeLostItem: (id, reason) => api.delete(`/admin/lost-items/${id}?reason=${reason}`),
  getFoundItems: (params) => api.get('/admin/found-items', { params }),
  removeFoundItem: (id, reason) => api.delete(`/admin/found-items/${id}?reason=${reason}`),
};

// Image Search
export const imageSearchAPI = {
  search: (formData) => api.post('/image-search/search', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Image URL helper — converts relative /uploads/... paths to full backend URLs.
// Works both in dev (direct to localhost:8000) and when using Vite proxy.
const BACKEND_ORIGIN = 'http://localhost:8000';

export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;           // already absolute
  if (path.startsWith('/uploads/')) return `${BACKEND_ORIGIN}${path}`;
  return path;
}
