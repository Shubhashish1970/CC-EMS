import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Loader2, Database, ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);
      if (response.success) {
        setSuccess(true);
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
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

        {/* Forgot Password Form */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Link
              to="/login"
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Back to login"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <h2 className="text-lg font-black text-slate-800">Forgot Password</h2>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm">
                <div className="flex items-start gap-3">
                  <Mail size={20} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Check your email</p>
                    <p>
                      If an account with <strong>{email}</strong> exists, we've sent you a password reset link.
                    </p>
                    <p className="mt-2 text-xs text-green-600">
                      The link will expire in 1 hour. If you don't see the email, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
              <Link
                to="/login"
                className="block w-full text-center py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-medium text-sm transition-colors"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send Reset Link
                  </>
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-slate-600 hover:text-green-700 font-medium transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2024 NACL. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
