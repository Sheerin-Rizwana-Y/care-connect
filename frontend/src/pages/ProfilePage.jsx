import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { User, Award, Shield, Edit2, Save, X, Camera, Activity, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ACTIVITY_ICONS = {
  listing_created: '🛒',
  listing_approved: '✅',
  listing_rejected: '❌',
  lost_item_reported: '🔍',
  found_item_reported: '📦',
  user_suspended: '⚠️',
  default: '📋',
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', department: user?.department || '' });
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '' });
  const [uploadingPic, setUploadingPic] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const picInputRef = useRef();

  useEffect(() => {
    if (activeTab === 'activity' && activity.length === 0) fetchActivity();
  }, [activeTab]);

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await authAPI.getActivity();
      setActivity(res.data);
    } catch {
      toast.error('Failed to load activity');
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      updateUser(res.data);
      toast.success('Profile updated!');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    try {
      await authAPI.changePassword(pwdForm);
      toast.success('Password changed!');
      setPwdForm({ current_password: '', new_password: '' });
      setChangingPwd(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const formData = new FormData();
    formData.append('picture', file);
    setUploadingPic(true);
    try {
      const res = await authAPI.uploadProfilePicture(formData);
      updateUser(res.data);
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Failed to upload picture');
    } finally {
      setUploadingPic(false);
    }
  };

  const roleInfo = {
    student: { label: 'Student', color: 'bg-blue-100 text-blue-700', icon: '🎓' },
    staff:   { label: 'Staff',   color: 'bg-amber-100 text-amber-700', icon: '👨‍🏫' },
    admin:   { label: 'Admin',   color: 'bg-red-100 text-red-700',     icon: '🛡️' },
  };

  const tabs = [
    { id: 'profile',  label: 'Profile',  Icon: User     },
    { id: 'activity', label: 'Activity', Icon: Activity  },
    { id: 'security', label: 'Security', Icon: Shield    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="page-title">My Profile</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all
              ${activeTab === id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar with camera overlay */}
              <div className="relative group cursor-pointer" onClick={() => picInputRef.current?.click()}>
                {user?.profile_picture
                  ? <img src={user.profile_picture} alt="Profile" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
                  : <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-violet-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                }
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingPic
                    ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Camera size={20} className="text-white" />}
                </div>
                <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-gray-500">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge ${roleInfo[user?.role]?.color}`}>
                    {roleInfo[user?.role]?.icon} {roleInfo[user?.role]?.label}
                  </span>
                  <span className="badge-gray badge">{user?.account_status}</span>
                </div>
              </div>
            </div>

            <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center gap-2 text-sm">
              {editing ? <X size={16} /> : <Edit2 size={16} />}
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Points bar */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
            <div className="flex items-center gap-3">
              <Award size={24} className="text-amber-500" />
              <div>
                <p className="font-bold text-amber-800 text-lg">{user?.points || 0} Points</p>
                <p className="text-amber-600 text-xs">Earn points by returning found items to their owners</p>
              </div>
            </div>
          </div>

          {/* Edit form / detail grid */}
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input-field" />
              </div>
              <div>
                <label className="label">Department</label>
                <input value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} className="input-field" />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Name',               value: user?.name },
                { label: 'Email',              value: user?.email },
                { label: 'Department',         value: user?.department },
                { label: 'Year / Designation', value: user?.year_of_study || user?.staff_designation || '—' },
                { label: 'Account Created',    value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
                { label: 'Role',               value: user?.role },
              ].map(field => (
                <div key={field.label} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-0.5">{field.label}</p>
                  <p className="font-medium text-gray-900 text-sm">{field.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {activeTab === 'activity' && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary-500" />Recent Account Activity
          </h3>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3 py-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Activity size={36} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activity.map((item, i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                    {ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.default}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === 'security' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={18} className="text-primary-500" />Change Password
            </h3>
            <button onClick={() => setChangingPwd(!changingPwd)} className="text-primary-600 text-sm font-medium">
              {changingPwd ? 'Cancel' : 'Change Password'}
            </button>
          </div>
          {changingPwd ? (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="label">Current Password</label>
                <input type="password" value={pwdForm.current_password}
                  onChange={e => setPwdForm(f => ({...f, current_password: e.target.value}))}
                  className="input-field" required />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" value={pwdForm.new_password}
                  onChange={e => setPwdForm(f => ({...f, new_password: e.target.value}))}
                  className="input-field" placeholder="Min. 8 characters" required />
              </div>
              <button type="submit" className="btn-primary">Update Password</button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">Keep your account secure with a strong password.</p>
          )}
        </div>
      )}
    </div>
  );
}
