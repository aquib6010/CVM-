/**
 * Login Page — Email/password auth + Google Sign-In.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';

// Google Client ID from env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  // Handle Google credential response
  const handleGoogleResponse = useCallback(async (response: any) => {
    if (!response.credential) {
      setError('Google sign-in failed — no credential received.');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      const res = await authAPI.google({ credential: response.credential });
      setAuth(res.data.user, res.data.token);
      navigate('/lab');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, setAuth]);

  // Load and initialize Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleInitialized.current) return;

    const initGoogle = () => {
      if (!(window as any).google?.accounts?.id) return;

      (window as any).google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 380,
          logo_alignment: 'left',
        });
      }

      googleInitialized.current = true;
    };

    // Check if script already loaded
    if ((window as any).google?.accounts?.id) {
      initGoogle();
      return;
    }

    // Load the GSI script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);

    return () => {
      // Cleanup: don't remove script as it may be needed
    };
  }, [handleGoogleResponse]);

  // Re-render Google button when switching between login/register
  useEffect(() => {
    if (googleInitialized.current && googleBtnRef.current && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 380,
        logo_alignment: 'left',
      });
    }
  }, [isRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await authAPI.register({ email, password, displayName });
        setAuth(res.data.user, res.data.token);
      } else {
        const res = await authAPI.login({ email, password });
        setAuth(res.data.user, res.data.token);
      }
      navigate('/lab');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lab-bg flex items-center justify-center px-4 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-lab-accent/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-lab-accent-light/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-lab-accent to-lab-accent-light flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
              <span className="text-white font-bold text-lg">VL</span>
            </div>
            <span className="text-xl font-bold text-lab-text tracking-tight">VIRTUAL-LAB</span>
          </Link>
        </div>

        {/* Form card */}
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-lab-text mb-1">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-lab-muted mb-6">
            {isRegister ? 'Sign up to start experimenting' : 'Sign in to your laboratory'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-2.5 bg-lab-danger/10 border border-lab-danger/20 rounded-lg text-sm text-lab-danger">
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          {GOOGLE_CLIENT_ID && (
            <div className="mb-5">
              <div
                ref={googleBtnRef}
                className="flex justify-center"
                style={{ minHeight: '44px' }}
              />
              {googleLoading && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-lab-muted">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in with Google...
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-px bg-lab-border" />
                <span className="text-xs text-lab-dim font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-lab-border" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-lab-muted mb-1.5 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field"
                  placeholder="Dr. Physics"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-lab-muted mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@university.edu"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lab-muted mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-2 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Processing...
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-sm text-lab-muted hover:text-lab-accent transition-colors"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Skip auth for quick access */}
        <div className="text-center mt-4">
          <Link to="/lab" className="text-xs text-lab-dim hover:text-lab-muted transition-colors">
            Skip sign-in and explore →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
