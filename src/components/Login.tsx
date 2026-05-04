import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Sparkles, LogIn, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const handleGoogleLogin = () => signInWithPopup(auth, googleProvider);
  const handleGuestLogin = () => signInAnonymously(auth);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFDFD] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl flex flex-col items-center text-center"
      >
        <div className="w-24 h-24 bg-brand-blue text-white rounded-[2.5rem] flex items-center justify-center mb-8 rotate-3 shadow-xl">
          <Sparkles size={48} />
        </div>
        
        <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4 leading-none">Tutor.AI_</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-12 italic">
          "La física es difícil, pero no imposible."
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-black text-white font-black py-6 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all text-xl uppercase tracking-tighter italic"
          >
            <LogIn size={24} />
            Ingresar con Google
          </button>

          <button 
            onClick={handleGuestLogin}
            className="w-full bg-white text-gray-400 border border-gray-100 font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:text-black hover:border-gray-300 transition-all text-sm uppercase tracking-widest"
          >
            <UserCircle size={18} />
            Entrar como Invitado
          </button>
        </div>

        <p className="mt-12 text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em] leading-relaxed">
          Inicia sesión para guardar tus logros,<br />
          insignias y progreso adaptativo.
        </p>
      </motion.div>
    </div>
  );
}
