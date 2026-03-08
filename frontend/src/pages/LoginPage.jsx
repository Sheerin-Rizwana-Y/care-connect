import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.login(data);
      login(res.data);
      toast.success(`Welcome back, ${res.data.user.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-violet-600 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">CARE Connect+</h1>
              <p className="text-white/60 text-sm">Smart Campus Platform</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your Campus,<br />Smarter Than Ever
          </h2>
          <p className="text-white/70 text-lg">
            Buy, sell, recover lost items — all powered by AI, all within your campus community.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '🛒', label: 'Campus Marketplace', desc: 'Trade with peers' },
            { icon: '🔍', label: 'AI Lost & Found', desc: 'Smart matching' },
            { icon: '💬', label: 'Secure Chat', desc: 'Private messaging' },
            { icon: '🔐', label: 'QR Protection', desc: 'Label your items' },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-white font-medium text-sm mt-1">{item.label}</p>
              <p className="text-white/60 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CARE Connect+</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in with your college credentials</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">College Email or Register Number</label>
              <input
                {...register('email', { required: 'Email or register number is required' })}
                type="text"
                placeholder="yourname@care.edu.in or 21CE001"
                className="input-field"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            New to CARE Connect+?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
              Create account
            </Link>
          </p>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-blue-700 text-xs font-medium flex items-center gap-2">
              <GraduationCap size={14} />
              Only CARE College members can access this platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
