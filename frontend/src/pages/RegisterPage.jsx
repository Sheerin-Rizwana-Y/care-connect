import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Biotechnology',
  'Chemical Engineering',
  'MBA',
  'MCA',
  'Faculty/Staff',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG 1st Year', 'PG 2nd Year'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const isStaff = watch('department') === 'Faculty/Staff';

  const onRegister = async (data) => {
    setLoading(true);
    try {
      // ✅ Build JSON payload exactly as backend expects
      const payload = {
        email: data.email,
        name: data.name,
        password: data.password, // must be present
        department: data.department,
        year_of_study: isStaff ? null : data.year_of_study,
        staff_designation: isStaff ? data.staff_designation : null,
        register_number: data.register_number || null,
      };

      // ✅ Send JSON, not FormData
      const res = await authAPI.register(payload);

      // Direct login after register
      login(res.data);
      toast.success('Account created successfully! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-violet-50">
      <div className="w-full max-w-md card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Create Account</h2>
        <p className="text-gray-500 text-sm mb-6">Join CARE Connect+ with your college email</p>

        <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Name */}
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('name', { required: 'Name is required' })} className="input-field" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="col-span-2">
              <label className="label">College Email *</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                className="input-field"
                placeholder="yourname@care.ac.in"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Department */}
            <div className="col-span-2">
              <label className="label">Department *</label>
              <select {...register('department', { required: 'Department is required' })} className="input-field">
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
            </div>

            {/* Year or Staff designation */}
            {isStaff ? (
              <div className="col-span-2">
                <label className="label">Designation</label>
                <input {...register('staff_designation')} className="input-field" placeholder="e.g. Assistant Professor" />
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Year of Study</label>
                  <select {...register('year_of_study')} className="input-field">
                    <option value="">Select year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Register No.</label>
                  <input {...register('register_number')} className="input-field" placeholder="Optional" />
                </div>
              </>
            )}

            {/* Password */}
            <div className="col-span-2">
              <label className="label">Password *</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}