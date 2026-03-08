import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Search, UserX, UserCheck, Shield, Users } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ search, role: roleFilter, status: statusFilter });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId, name) => {
    const reason = prompt(`Reason for suspending ${name}:`);
    if (!reason) return;
    try {
      await adminAPI.suspendUser(userId, reason);
      toast.success(`${name} suspended`);
      fetchUsers();
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleBlock = async (userId, name) => {
    const reason = prompt(`Reason for blocking ${name} (permanent ban):`);
    if (!reason) return;
    try {
      await adminAPI.blockUser(userId, reason);
      toast.success(`${name} blocked`);
      fetchUsers();
    } catch {
      toast.error('Failed to block user');
    }
  };

  const handleActivate = async (userId, name) => {
    try {
      await adminAPI.activateUser(userId);
      toast.success(`${name} reactivated`);
      fetchUsers();
    } catch {
      toast.error('Failed to activate user');
    }
  };

  const handleMakeAdmin = async (userId, name) => {
    if (!confirm(`Make ${name} an admin? This grants full platform access.`)) return;
    try {
      await adminAPI.makeAdmin(userId);
      toast.success(`${name} is now an admin`);
      fetchUsers();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const roleColors = { student: 'badge-primary', staff: 'badge-warning', admin: 'badge-danger' };
  const statusColors = { active: 'badge-success', suspended: 'badge-warning', blocked: 'badge-danger' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Manage Users</h1>
        <p className="page-subtitle">{total} registered users</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="input-field pl-9 text-sm" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field text-sm w-auto">
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm w-auto">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Points</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-violet-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{user.department}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${roleColors[user.role]} capitalize`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColors[user.account_status]} capitalize`}>{user.account_status}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-amber-600">{user.points || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {user.account_status === 'active' ? (
                          <>
                            <button onClick={() => handleSuspend(user.id, user.name)}
                              title="Suspend" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                              <UserX size={15} />
                            </button>
                            <button onClick={() => handleBlock(user.id, user.name)}
                              title="Block (permanent)" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              🚫
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleActivate(user.id, user.name)}
                            title="Activate" className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 transition-colors">
                            <UserCheck size={15} />
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button onClick={() => handleMakeAdmin(user.id, user.name)}
                            title="Make Admin" className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors">
                            <Shield size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
