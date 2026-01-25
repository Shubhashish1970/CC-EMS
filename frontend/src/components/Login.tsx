import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff, Phone, Users, BarChart3, Leaf } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
          }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/40" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-lime-400 rounded-xl flex items-center justify-center">
              <Leaf size={28} className="text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Kweka Reach</h1>
              <p className="text-xs text-slate-400 font-medium">Farmer Engagement Platform</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-lg">
            <p className="text-lime-400 text-sm font-bold uppercase tracking-widest mb-4">
              Call Centre Management
            </p>
            <h2 className="text-5xl font-black text-white leading-tight mb-6">
              Connecting Farmers,<br />
              <span className="text-lime-400">Empowering Growth</span>
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              Streamline your farmer outreach with intelligent call management, 
              real-time analytics, and seamless activity tracking.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-10 h-10 bg-lime-400/20 rounded-xl flex items-center justify-center">
                  <Phone size={20} className="text-lime-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Smart Calling</p>
                  <p className="text-slate-400 text-xs">Efficient outreach</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-10 h-10 bg-lime-400/20 rounded-xl flex items-center justify-center">
                  <Users size={20} className="text-lime-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Farmer Connect</p>
                  <p className="text-slate-400 text-xs">Build relationships</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-10 h-10 bg-lime-400/20 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} className="text-lime-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Live Analytics</p>
                  <p className="text-slate-400 text-xs">Real-time insights</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-10 h-10 bg-lime-400/20 rounded-xl flex items-center justify-center">
                  <Leaf size={20} className="text-lime-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Agri Focus</p>
                  <p className="text-slate-400 text-xs">Crop & product tracking</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-black text-white">10K+</p>
              <p className="text-slate-400 text-sm">Farmers Reached</p>
            </div>
            <div className="w-px h-12 bg-slate-700" />
            <div>
              <p className="text-3xl font-black text-white">95%</p>
              <p className="text-slate-400 text-sm">Satisfaction Rate</p>
            </div>
            <div className="w-px h-12 bg-slate-700" />
            <div>
              <p className="text-3xl font-black text-white">50+</p>
              <p className="text-slate-400 text-sm">Active Territories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[40%] flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-2xl mb-4 shadow-lg">
              <Leaf size={32} className="text-slate-900" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kweka Reach</h1>
            <p className="text-sm text-slate-500 mt-1">Farmer Engagement Platform</p>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500">Sign in to continue to your dashboard</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-lime-100 focus:border-lime-500 outline-none transition-all text-sm font-medium"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-lime-100 focus:border-lime-500 outline-none transition-all text-sm font-medium"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-slate-600 hover:text-lime-600 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} Kweka Reach. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
