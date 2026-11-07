import React, { useState } from 'react';
import { User } from '../types/book';
import { X, User as UserIcon, Lock, Mail, ArrowRight, ShieldCheck, BookOpen, PenTool } from 'lucide-react';
import { loginOrRegisterUser } from '../services/storage';

interface AuthModalProps {
  onClose: () => void;
  onUserLoggedIn: (user: User) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onUserLoggedIn,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'reader' | 'author'>('reader');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please provide your full name or pen name.');
      return;
    }

    const user = loginOrRegisterUser({
      email: cleanEmail,
      name: name.trim(),
      role,
    });

    onUserLoggedIn(user);
    onClose();
  };

  const handleQuickOwnerFill = () => {
    setEmail('itljies@gmail.com');
    setName('Store Administrator');
    setRole('author');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                {mode === 'signin' ? 'Sign In to Open Shelf' : 'Create an Account'}
              </h2>
              <p className="text-xs text-stone-500">
                {mode === 'signin'
                  ? 'Access your purchased ebooks & seller dashboard'
                  : 'Join our community of readers & independent authors'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 border-b border-stone-200 text-xs font-semibold text-center">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`py-3 transition-colors ${
              mode === 'signin'
                ? 'text-stone-900 border-b-2 border-stone-900 bg-white font-bold'
                : 'text-stone-500 hover:text-stone-800 bg-stone-50/50'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-3 transition-colors ${
              mode === 'signup'
                ? 'text-stone-900 border-b-2 border-stone-900 bg-white font-bold'
                : 'text-stone-500 hover:text-stone-800 bg-stone-50/50'
            }`}
          >
            Create Free Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Full Name / Author Pen Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chinua Okafor"
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">Email Address *</label>
              <button
                type="button"
                onClick={handleQuickOwnerFill}
                className="text-[11px] text-stone-500 hover:text-stone-800 underline"
                title="Fill admin email"
              >
                Owner Login (itljies@gmail.com)
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                <Mail className="w-3.5 h-3.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-8 pr-3.5 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-8 pr-3.5 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-stone-700 block">I am joining as:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRole('reader')}
                  className={`p-2.5 rounded-md border text-left flex items-center gap-2 ${
                    role === 'reader'
                      ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 font-semibold'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-stone-700 shrink-0" />
                  <span>Reader</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('author')}
                  className={`p-2.5 rounded-md border text-left flex items-center gap-2 ${
                    role === 'author'
                      ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 font-semibold'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  <PenTool className="w-4 h-4 text-stone-700 shrink-0" />
                  <span>Author / Seller</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <p className="text-[11px] text-center text-stone-500 leading-tight pt-2">
            By continuing, you agree to Open Shelf&apos;s{' '}
            <span className="text-stone-800 font-medium underline cursor-pointer">
              Terms &amp; Conditions
            </span>{' '}
            and{' '}
            <span className="text-stone-800 font-medium underline cursor-pointer">
              Privacy Policy
            </span>
            .
          </p>
        </form>
      </div>
    </div>
  );
};
