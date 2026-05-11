import { 
  Home, 
  BookOpen, 
  CircleHelp, 
  Award, 
  GraduationCap, 
  ClipboardCheck,
  User as UserIcon,
  LogOut,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';
import { BADGES } from '../constants';
import { cn } from '../lib/utils';

interface SidebarProps {
  user: any;
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ user, activeView, setActiveView, onLogout, onOpenSettings }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'tutor', label: 'Tutor IA', icon: CircleHelp },
    { id: 'recursos', label: 'Recursos', icon: BookOpen },
    { id: 'profe', label: 'Modo Profe', icon: GraduationCap },
    { id: 'prueba', label: 'Modo Prueba', icon: ClipboardCheck },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-4 mb-10">
          <h1 className="text-3xl font-black tracking-tight uppercase text-brand-blue">Tutor<span className="text-slate-300">.</span>AI</h1>
        </div>

        {/* User Card & Progress */}
        <div className="bg-slate-900 p-6 rounded-3xl mb-6 shadow-xl shadow-indigo-900/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center font-black text-white shadow-sm overflow-hidden text-xs">
              {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user?.name?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-base leading-none truncate mb-1">{user?.name}</div>
              <button 
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 text-[9px] font-black uppercase text-brand-accent hover:text-white transition-colors"
              >
                <Settings size={10} />
                Configurar API
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {user?.badges?.length > 0 ? user.badges.map((bId: string) => {
              const badge = BADGES.find(b => b.id === bId);
              return (
                <div key={bId} className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm shadow-sm" title={badge?.name}>
                  {badge?.icon}
                </div>
              );
            }) : (
              <div className="text-[10px] uppercase font-bold text-slate-500">Aprende para ganar insignias</div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all active:scale-95 text-left group",
                activeView === item.id 
                  ? "bg-brand-blue text-white shadow-lg shadow-indigo-500/20" 
                  : "bg-white border border-slate-200/50 hover:bg-slate-50 text-slate-600"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-colors",
                activeView === item.id ? "text-brand-accent" : "text-slate-400 group-hover:text-slate-900"
              )} />
              <span className="text-sm font-bold uppercase tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 pt-4">
        <button 
          onClick={() => setActiveView('ayuda')}
          className="w-full text-center py-4 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 border-t border-gray-100 hover:text-black transition-colors"
        >
          AYUDA / TUTORIAL
        </button>
        <button 
          onClick={onLogout}
          className="w-full mt-2 text-center text-[10px] font-black uppercase tracking-[0.4em] text-red-400 hover:text-red-600 transition-colors"
        >
          CERRAR SESIÓN
        </button>
      </div>
    </div>
  );
}
