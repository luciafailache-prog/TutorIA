import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Sparkles, LogIn, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        alert('Parece que cerraste la ventana de inicio de sesión. Por favor, intenta de nuevo.');
        return;
      }
      console.error('Error en el login con Google:', error);
    }
  };
  const handleGuestLogin = () => signInAnonymously(auth);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col items-center text-center shadow-indigo-900/5"
      >
        <div className="w-24 h-24 bg-slate-900 text-brand-accent rounded-3xl flex items-center justify-center mb-10 shadow-xl shadow-indigo-900/10">
          <Sparkles size={48} />
        </div>
        
        <h1 className="text-5xl font-black uppercase tracking-tight mb-4 leading-none text-slate-900">Tutor<span className="text-brand-blue">.</span>AI</h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-12">
          SISTEMA DE ASISTENCIA FÍSICA
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-brand-blue text-white font-black py-6 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] hover:bg-indigo-700 active:scale-95 transition-all text-xl uppercase tracking-tight shadow-lg shadow-indigo-500/20"
          >
            <LogIn size={24} />
            Ingresar con Google
          </button>

          <button 
            onClick={handleGuestLogin}
            className="w-full bg-slate-50 text-slate-400 border border-slate-200 font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:text-slate-900 hover:border-slate-300 transition-all text-sm uppercase tracking-widest"
          >
            <UserCircle size={18} />
            ENTRAR_COMO_INVITADO
          </button>
        </div>

        <p className="mt-12 text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em] leading-relaxed">
          SESIÓN_REQUERIDA: v2.4.0<br />
          CORE_ONLINE
        </p>
      </motion.div>
    </div>
  );
}
