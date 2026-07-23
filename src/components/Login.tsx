import React from 'react';
import { loginWithGoogle } from '../lib/firebase';
import { LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-[#0a0f1c] text-slate-300 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0f172a] rounded-2xl border border-slate-800 p-8 shadow-xl text-center">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400">
          <LogIn className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Bienvenido</h1>
        <p className="text-slate-400 mb-8 text-sm">
          Inicia sesión para acceder al sistema de gestión de habitaciones.
        </p>
        <button
          onClick={loginWithGoogle}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          Continuar con Google
        </button>
      </div>
    </div>
  );
};
