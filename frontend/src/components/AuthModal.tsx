import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { register as apiRegister } from '@/lib/api';
import { Shield, User, Lock, Mail, Phone, MapPin, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'citizen' | 'admin'>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await apiRegister({
          email,
          password,
          full_name: fullName,
          phone,
          role,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAdmin = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await login('admin@jaldrishti.gov.in', 'Admin@123');
      onClose();
    } catch (err: any) {
      setErrorMsg('Demo login failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoCitizen = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await login('citizen@jaldrishti.gov.in', 'Citizen@123');
      onClose();
    } catch (err: any) {
      setErrorMsg('Demo login failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#B79A62]">
              JalDrishti Secure Access
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#B79A62]" />
              <span>{mode === 'login' ? 'Portal Sign In' : 'Create Citizen Account'}</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Demo Login One-Click Buttons */}
        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-2">
          <div className="font-bold text-amber-900 flex items-center justify-between">
            <span>Instant Demo Logins:</span>
            <span className="text-[10px] text-amber-700">Pre-Configured</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDemoAdmin}
              className="py-1.5 px-2 bg-[#101820] hover:bg-gray-800 text-white rounded text-[11px] font-bold transition-all"
            >
              🛡️ NDRF Admin
            </button>
            <button
              type="button"
              onClick={handleDemoCitizen}
              className="py-1.5 px-2 bg-[#B79A62] hover:bg-[#a68953] text-[#101820] rounded text-[11px] font-bold transition-all"
            >
              👤 Coastal Citizen
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Mobile Phone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full py-2 px-3 border rounded-lg border-gray-300"
                >
                  <option value="citizen">Citizen / Commuter</option>
                  <option value="volunteer">Disaster Volunteer</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="font-bold text-gray-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-[#101820] hover:bg-gray-800 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In to Portal' : 'Create Account'}</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t text-xs text-gray-600">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[#B79A62] font-bold hover:underline"
              >
                Register as Citizen
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#B79A62] font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
