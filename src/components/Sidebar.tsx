import { 
  Home, 
  BookOpen, 
  CircleHelp, 
  Award, 
  GraduationCap, 
  ClipboardCheck,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { BADGES } from '../constants';
import { cn } from '../lib/utils';

interface SidebarProps {
  user: any;
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, activeView, setActiveView, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'tutor', label: 'Tutor IA', icon: CircleHelp },
    { id: 'profe', label: 'Modo Profe', icon: GraduationCap },
    { id: 'prueba', label: 'Modo Prueba', icon: ClipboardCheck },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-4 mb-10">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-brand-blue">Tutor.AI</h1>
        </div>

        {/* User Card & Progress */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl border-2 border-brand-blue flex items-center justify-center font-black text-brand-blue shadow-sm overflow-hidden text-xs">
              {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user?.name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-base leading-none mb-1">{user?.name}</div>
              <div className="text-[10px] text-brand-blue font-black uppercase tracking-wider">Estudiante • {user?.xp || 0} XP</div>
            </div>
          </div>

          <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 text-gray-400">Tu Progreso</h3>
          <div className="relative pt-1 mb-4">
            <div className="flex mb-2 items-center justify-between">
              <span className="text-2xl font-black italic">{user?.progress || 0}%</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Módulo</span>
            </div>
            <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-100 border border-gray-50">
              <div style={{ width: `${user?.progress || 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-brand-blue transition-all duration-1000"></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {user?.badges?.length > 0 ? user.badges.map((bId: string) => {
              const badge = BADGES.find(b => b.id === bId);
              return (
                <div key={bId} className="w-8 h-8 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-sm shadow-sm" title={badge?.name}>
                  {badge?.icon}
                </div>
              );
            }) : (
              <div className="text-[10px] uppercase font-bold text-gray-300">Empieza a aprender para ganar insignias</div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-3">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all active:scale-95 text-left group",
                activeView === item.id 
                  ? "bg-black text-white shadow-[0_10px_20px_rgba(0,0,0,0.2)]" 
                  : "bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md text-gray-900"
              )}
            >
              <span className="text-xl font-black uppercase italic tracking-tighter">{item.label}</span>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                activeView === item.id ? "bg-white text-black" : "bg-gray-100 text-gray-400 group-hover:text-black group-hover:bg-white border border-transparent group-hover:border-gray-200"
              )}>
                <item.icon size={16} />
              </div>
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
