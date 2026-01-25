import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle, Leaf } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerifying(false);
        setTokenValid(false);
        setError('Invalid reset link. Please request a new password reset.');
        return;
      }

      try {
        const response = await authAPI.verifyResetToken(token);
        if (response.success) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
      } catch (err) {
        setTokenValid(false);
        setError('Invalid or expired reset link. Please request a new password reset.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token, password);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError('Failed to reset password. Please try again or request a new reset link.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="animate-spin text-lime-600" size={24} />
              <p className="text-slate-600 font-medium">Verifying reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-2xl mb-4 shadow-lg">
              <Leaf size={32} className="text-slate-900" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kweka Reach</h1>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm mb-4">
              {error}
            </div>
            <Link
              to="/forgot-password"
              className="block w-full text-center py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-medium text-sm transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-2xl mb-4 shadow-lg">
              <Leaf size={32} className="text-slate-900" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kweka Reach</h1>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
            <div className="p-4 bg-lime-50 border border-lime-200 rounded-2xl text-lime-800 text-sm mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Password Reset Successful!</p>
                  <p>Your password has been reset successfully. You can now log in with your new password.</p>
                  <p className="mt-2 text-xs text-lime-600">Redirecting to login page...</p>
                </div>
              </div>
            </div>
            <Link
              to="/login"
              className="block w-full text-center py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-medium text-sm transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-2xl mb-4 shadow-lg">
            <Leaf size={32} className="text-slate-900" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kweka Reach</h1>
          <p className="text-sm text-slate-500 mt-2">Farmer Engagement Platform</p>
        </div>

        {/* Reset Password Form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Link
              to="/login"
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Back to login"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <h2 className="text-lg font-black text-slate-800">Reset Password</h2>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-sm text-slate-600 mb-4">
                Enter your new password. It must be at least 6 characters long and contain uppercase, lowercase, and a number.
              </p>
              <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-lime-100 focus:border-lime-500 outline-none transition-all text-sm font-medium"
                  placeholder="Enter new password"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-lime-100 focus:border-lime-500 outline-none transition-all text-sm font-medium"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-slate-600 hover:text-lime-600 font-medium transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Kweka Reach. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
