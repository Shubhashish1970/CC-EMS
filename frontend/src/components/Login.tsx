import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Database, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Navigation will be handled by ProtectedRoute/AuthContext
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f1] px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-700 rounded-2xl mb-4 shadow-lg">
            <Database size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">NACL EMS System</h1>
          <p className="text-sm text-slate-500 mt-2">Call Centre Management</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8">
          <h2 className="text-lg font-black text-slate-800 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all text-sm font-medium"
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
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all text-sm font-medium"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2024 NACL. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;

