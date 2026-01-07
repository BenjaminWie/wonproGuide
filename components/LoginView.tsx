
import React, { useState } from 'react';
import { User } from '../types';

interface LoginViewProps {
  onLogin: (email: string) => void;
  error?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, error: externalError }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(externalError || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Bitte gib deine E-Mail Adresse ein.');
      return;
    }
    onLogin(email);
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-sm text-center">
        <div className="mb-12">
          <div className="w-16 h-16 bg-black rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-black/10">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">WohnprojektGuide</h1>
          <p className="mt-3 text-gray-500">Willkommen zu Hause.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="E-Mail Adresse"
              className={`w-full bg-gray-50 border ${error ? 'border-red-200' : 'border-gray-100'} rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-lg placeholder:text-gray-300`}
            />
            {error && <p className="mt-2 text-sm text-red-500 text-left px-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white rounded-2xl py-4 font-semibold text-lg hover:bg-gray-900 active:scale-[0.98] transition-all shadow-lg shadow-black/5"
          >
            Anmelden
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-50">
          <p className="text-sm text-gray-400">
            Noch keinen Zugang? Frag deine Hausverwaltung nach einer Einladung.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
