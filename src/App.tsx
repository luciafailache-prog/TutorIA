import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Send, 
  ChevronDown, 
  Sparkles, 
  Wrench, 
  Clipboard, 
  Timer, 
  Info,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  CircleHelp,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { db, auth } from './lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { 
  generateExplanation, 
  correctExercise, 
  generateMockExam, 
  generateSchematic,
  proposeExercise 
} from './lib/gemini';
import { INITIAL_TOPICS, BADGES } from './constants';
import { cn, formatTime } from './lib/utils';

// Components
import Sidebar from './components/Sidebar';
import Calculator from './components/Calculator';
import UnitConverter from './components/UnitConverter';
import Login from './components/Login';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedTopic, setSelectedTopic] = useState(INITIAL_TOPICS[0]);
  const [aiResponse, setAiResponse] = useState('');
  const [testPhase, setTestPhase] = useState<'idle' | 'testing' | 'delivering' | 'finished'>('idle');
  const [schematicText, setSchematicText] = useState('');
  const [schematicImg, setSchematicImg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(70 * 60); // 70 minutes
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        // Fetch or create user doc
        const userRef = doc(db, 'users', authUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setUser(userSnap.data());
          } else {
            const newUser = {
              userId: authUser.uid,
              name: authUser.isAnonymous ? 'Alumno Invitado' : authUser.displayName || 'Alumno',
              email: authUser.email || 'guest@example.com',
              avatar: authUser.photoURL,
              badges: [],
              xp: 0,
              progress: 0,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Timer Logic
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, timerSeconds]);

  const handleTutorHelp = async (question?: string) => {
    setIsProcessing(true);
    setActiveView('tutor');
    try {
      const res = await generateExplanation(
        selectedTopic.title, 
        selectedTopic.theory, 
        'intermedio', 
        question || 'No entiendo nada'
      );
      setAiResponse(res || 'No pude generar una respuesta.');
      if (res) {
        updateUserProgress(10, 2);
      }
    } catch (error) {
      console.error(error);
      setAiResponse('Hubo un error al procesar tu solicitud.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCorrection = async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await correctExercise(base64, selectedTopic.exercises[0].question);
        setAiResponse(res || 'Error al corregir.');
        setActiveView('tutor');
        if (res) {
          updateUserProgress(50, 5);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiagram = async (prompt: string) => {
    if (!prompt) return;
    setIsProcessing(true);
    try {
      const res = await generateSchematic(prompt);
      if (res) {
        setSchematicImg(res);
        updateUserProgress(30, 3);
      } else {
        setAiResponse('Huy, no pude dibujar el esquema. Probá con otra descripción.');
      }
    } catch (e) {
      console.error(e);
      setAiResponse('Error al generar el esquema.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMockExam = async () => {
    setIsProcessing(true);
    setTimerSeconds(70 * 60);
    setTimerActive(true);
    setTestPhase('testing');
    setActiveView('prueba');
    try {
      // Tomamos el primer ejercicio (si existe) como "base" o enviamos un prompt genérico basado en la teoría
      const baseRef = selectedTopic.exercises[0]?.question || "Tres ejercicios de nivel parcial.";
      const res = await generateMockExam(baseRef, selectedTopic.title, selectedTopic.theory);
      setAiResponse(res || 'Error al generar examen.');
    } catch (e) {
      setAiResponse('Huy, se rompió algo generando el parcial. Probá de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestDelivery = async (file: File) => {
    setIsProcessing(true);
    setTimerActive(false);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const res = await correctExercise(base64, aiResponse); // Comparamos la foto con el enunciado generado
        setAiResponse(res || 'No pude corregirlo, maestro.');
        setTestPhase('finished');
        updateUserProgress(150, 10);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setAiResponse('Hubo un error subiendo la entrega.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProposeChallenge = async () => {
    setIsProcessing(true);
    setActiveView('tutor');
    try {
      const res = await proposeExercise(selectedTopic.title, selectedTopic.theory, selectedTopic.exercises);
      setAiResponse(res || 'El profe se quedó sin ideas. Probá en un ratito.');
      updateUserProgress(15, 1);
    } catch (e) {
      console.error(e);
      setAiResponse('Hubo un error al pedirle el desafío al profe.');
    } finally {
      setIsProcessing(false);
    }
  };

  const logout = () => signOut(auth);

  const updateUserProgress = async (newXp: number, newProgress: number) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.userId);
    const updatedUser = { 
      ...user, 
      xp: (user.xp || 0) + newXp,
      progress: Math.min((user.progress || 0) + newProgress, 100)
    };
    try {
      await setDoc(userRef, updatedUser);
      setUser(updatedUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.userId}`);
    }
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-8 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin"></div>
        <div className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Cargando Aula_</div>
      </div>
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="flex h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-indigo-100">
      <Sidebar user={user} activeView={activeView} setActiveView={setActiveView} onLogout={logout} />

      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-5xl mx-auto p-12">
          
          {/* Header & Topic Selector */}
          <div className="flex justify-between items-center mb-16 px-4">
            <div className="flex items-center gap-6">
               <div className="h-16 w-1 bg-brand-blue rounded-full"></div>
               <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-6xl font-black tracking-tighter uppercase italic text-blue-900 leading-none"
                >
                  {activeView === 'dashboard' ? 'Overview_' : 
                   activeView === 'tutor' ? 'Tutor IA_' :
                   activeView === 'prueba' ? 'Prueba_' : 
                   activeView === 'profe' ? 'Corrección_' :
                   activeView === 'recursos' ? 'Tools_' : 'Ayuda_'}
                </motion.h1>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Plataforma de Aprendizaje Adaptativo</div>
              </div>
            </div>

            <div className="bg-white border-b-2 border-gray-100 p-4 flex flex-col items-end min-w-[240px]">
              <div className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">Materia Seleccionada</div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedTopic.id}
                  onChange={(e) => setSelectedTopic(INITIAL_TOPICS.find(t => t.id === e.target.value)!)}
                  className="bg-transparent font-black text-xl uppercase tracking-tighter outline-none cursor-pointer text-right appearance-none"
                >
                  {INITIAL_TOPICS.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <ChevronDown size={14} className="text-brand-blue" />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Big Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MenuButton 
                    title="No entiendo nada" 
                    desc="Explicación básica y adaptativa" 
                    icon={Sparkles} 
                    color="black" 
                    onClick={() => handleTutorHelp()}
                  />
                  <MenuButton 
                    title="Modo Profe" 
                    desc="Corrección y guía didáctica" 
                    icon={GraduationCap} 
                    color="blue" 
                    onClick={() => setActiveView('profe')}
                  />
                  <MenuButton 
                    title="Modo Prueba" 
                    desc="Examen con cronómetro" 
                    icon={ClipboardCheck} 
                    color="red" 
                    onClick={() => handleMockExam()}
                  />
                  <MenuButton 
                    title="Recursos Útiles" 
                    desc="Cálculo y conversiones" 
                    icon={Wrench} 
                    color="white" 
                    onClick={() => setActiveView('recursos')}
                  />
                </div>

                <div className="p-12 bg-white border border-gray-100 rounded-[3rem] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[4rem] flex items-center justify-center text-brand-blue/20">
                    <BookOpen size={64} />
                  </div>
                  <div className="relative">
                    <div className="text-xs font-black text-brand-blue uppercase tracking-widest mb-4">Base de Conocimiento</div>
                    <h3 className="text-4xl font-black uppercase italic mb-8 tracking-tighter">{selectedTopic.title}</h3>
                    <div className="prose prose-slate max-w-none prose-sm font-medium leading-relaxed opacity-70">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{selectedTopic.theory}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'tutor' && (
              <motion.div 
                key="tutor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col min-h-[60vh] shadow-blue-900/5"
              >
                <div className="p-12 flex-1">
                  <div className="flex justify-between items-center mb-10 border-b border-gray-50 pb-8">
                    <div>
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter">Pregunta a la IA_</h2>
                      <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">Andamiaje Activo</p>
                    </div>
                    <div className="px-6 py-3 bg-brand-blue text-white font-black rounded-full uppercase tracking-widest text-[10px]">
                      AI Online
                    </div>
                  </div>
                  
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 gap-6">
                      <div className="w-16 h-16 border-8 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin"></div>
                      <div className="text-brand-blue font-black tracking-widest uppercase italic text-sm animate-pulse">Analizando conceptos...</div>
                    </div>
                  ) : (
                    <div className="prose prose-indigo max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiResponse || "Haz una pregunta para activar al tutor."}</ReactMarkdown>
                    </div>
                  )}
                </div>
                
                <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="PREGÚNTAME ALGO..."
                      className="w-full bg-white border border-gray-200 rounded-2xl px-8 py-5 outline-none focus:ring-4 ring-brand-blue/5 transition-all font-black uppercase tracking-tighter italic text-lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTutorHelp(e.currentTarget.value);
                      }}
                    />
                  </div>
                  <button className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">
                    <Send size={24} />
                  </button>
                </div>
              </motion.div>
            )}

            {activeView === 'profe' && (
              <motion.div key="profe" className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
                    <div className="w-24 h-24 bg-blue-50 text-brand-blue rounded-[2rem] flex items-center justify-center mb-8 border-2 border-transparent group-hover:border-brand-blue transition-all">
                      <Camera size={40} />
                    </div>
                    <h3 className="text-3xl font-black uppercase italic mb-4 tracking-tighter">Corregir_</h3>
                    <p className="text-gray-400 text-sm font-bold mb-10 leading-relaxed uppercase tracking-wide">Sube una foto de tu ejercicio para feedback pedagógico.</p>
                    <label className="w-full mt-auto bg-brand-blue text-white font-black py-5 rounded-2xl cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 uppercase tracking-widest italic active:scale-95">
                      <Plus size={24} />
                      Subir_Hoja
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleCorrection(e.target.files[0])} />
                    </label>
                  </div>

                  <div className="bg-black text-white p-10 rounded-[3.5rem] border border-black shadow-xl flex flex-col items-center text-center group hover:scale-[1.02] transition-all relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 text-white/5 rotate-12">
                      <Zap size={120} />
                    </div>
                    <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center mb-8 border border-white/20">
                      <BookOpen size={40} />
                    </div>
                    <h3 className="text-3xl font-black uppercase italic mb-4 tracking-tighter">Reto Lula_</h3>
                    <p className="text-white/60 text-sm font-bold mb-10 leading-relaxed uppercase tracking-wide">El profe te propone un ejercicio basado en las guías del curso.</p>
                    <button 
                      onClick={handleProposeChallenge}
                      className="w-full mt-auto bg-white text-black font-black py-5 rounded-2xl hover:bg-gray-100 transition-colors uppercase tracking-widest italic active:scale-95"
                    >
                      DAME_UNO
                    </button>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
                    <div className="w-24 h-24 bg-black text-white rounded-[2rem] flex items-center justify-center mb-8 overflow-hidden">
                      {isProcessing && !aiResponse ? (
                        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : schematicImg ? (
                        <img src={schematicImg} alt="Esquema" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={40} />
                      )}
                    </div>
                    <h3 className="text-3xl font-black uppercase italic mb-4 tracking-tighter">Armar Esquema_</h3>
                    <p className="text-gray-400 text-sm font-bold mb-8 leading-relaxed uppercase tracking-wide">Introduce la consigna del ejercicio para que la IA genere el modelo visual.</p>
                    
                    <div className="w-full space-y-4">
                      <textarea 
                        value={schematicText}
                        onChange={(e) => setSchematicText(e.target.value)}
                        placeholder="Escribe el enunciado aquí..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 ring-brand-blue/10 min-h-[100px] resize-none"
                      />
                      <button 
                        onClick={() => handleDiagram(schematicText)}
                        disabled={isProcessing || !schematicText}
                        className="w-full bg-black text-white font-black py-6 rounded-2xl hover:bg-gray-800 transition-colors uppercase tracking-widest italic active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing ? 'GENERANDO...' : 'GENERAR_DIBUJO'}
                      </button>
                    </div>

                    {schematicImg && (
                      <motion.button 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => window.open(schematicImg)}
                        className="mt-6 text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline"
                      >
                        Ver Imagen Completa
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="bg-brand-blue p-12 rounded-[3.5rem] text-white flex gap-10 items-center overflow-hidden relative">
                   <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                     <GraduationCap size={240} />
                   </div>
                   <div className="relative">
                    <div className="flex gap-4 items-center mb-6">
                      <AlertCircle className="text-white" />
                      <h4 className="text-2xl font-black uppercase italic italic tracking-tighter">Visión Didáctica</h4>
                    </div>
                    <p className="text-blue-100 font-bold uppercase tracking-wider text-sm leading-loose max-w-2xl">
                      El modo profe aplica el andamiaje progresivo. No entrega soluciones vacías, sino que modela la argumentación necesaria para que descubras la lógica del problema.
                    </p>
                   </div>
                </div>
              </motion.div>
            )}

            {activeView === 'prueba' && (
              <motion.div key="prueba" className="space-y-8">
                {testPhase === 'idle' ? (
                  <div className="bg-white p-20 rounded-[4rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-32 h-32 bg-red-50 text-brand-red rounded-[3rem] flex items-center justify-center mb-10 rotate-3">
                      <ClipboardCheck size={64} />
                    </div>
                    <h3 className="text-5xl font-black uppercase italic mb-6 tracking-tighter">Simulacro Real_</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm max-w-md mb-12 leading-loose">
                      Tenés 70 minutos para resolver un modelo de parcial generado por la IA basado en la base de datos de tu curso.
                    </p>
                    <button 
                      onClick={handleMockExam}
                      className="px-12 py-6 bg-brand-red text-white font-black rounded-3xl uppercase tracking-[0.2em] italic shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl"
                    >
                      COMENZAR_AHORA
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center bg-brand-red p-8 rounded-[2.5rem] text-white shadow-xl shadow-red-200">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20">
                          <Timer size={32} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-red-100 mb-1 opacity-80">
                            {testPhase === 'testing' ? 'Tiempo de Resolución' : 'Evaluación Finalizada'}
                          </div>
                          <div className="text-4xl font-mono font-black italic tracking-tighter">
                            {testPhase === 'testing' ? formatTime(timerSeconds) : '00:00:00'}
                          </div>
                        </div>
                      </div>
                      {testPhase === 'testing' && (
                        <button 
                          onClick={() => setTimerActive(!timerActive)}
                          className="px-8 py-3 bg-white text-brand-red font-black rounded-xl uppercase tracking-widest italic hover:scale-105 transition-all text-sm"
                        >
                          {timerActive ? 'PAUSAR' : 'REANUDAR'}
                        </button>
                      )}
                    </div>

                    <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm min-h-[50vh] flex flex-col relative">
                      {isProcessing ? (
                         <div className="flex flex-col items-center justify-center h-full py-20 gap-6">
                            <div className="w-16 h-16 border-8 border-brand-red/10 border-t-brand-red rounded-full animate-spin"></div>
                            <div className="text-brand-red font-black italic uppercase tracking-widest">
                               {testPhase === 'testing' ? 'Generando Modelo_' : 'Corrigiendo Entrega_'}
                            </div>
                         </div>
                      ) : (
                        <div className="flex-1">
                          <div className="prose prose-slate max-w-none font-medium mb-12">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiResponse}</ReactMarkdown>
                          </div>
                          
                          {testPhase === 'testing' && !isProcessing && (
                            <div className="border-t border-gray-100 pt-10 flex flex-col items-center">
                               <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6">FINALIZASTE EL EXAMEN?_</div>
                               <label className="bg-black text-white px-12 py-6 rounded-2xl font-black uppercase italic tracking-widest cursor-pointer hover:bg-gray-800 transition-all active:scale-95 shadow-xl">
                                  SUBIR_ENTREGA (FOTO)
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleTestDelivery(e.target.files[0])} />
                               </label>
                            </div>
                          )}

                          {testPhase === 'finished' && (
                            <div className="mt-8 p-10 bg-blue-50 border-2 border-brand-blue rounded-[2.5rem] flex items-center justify-between">
                               <div>
                                  <h4 className="text-2xl font-black uppercase italic text-brand-blue tracking-tighter mb-2">Simulacro Completado!</h4>
                                  <p className="text-sm font-bold text-blue-900/60 uppercase tracking-widest">Revisá el feedback del maestro abajo.</p>
                               </div>
                               <button 
                                onClick={() => { setTestPhase('idle'); setAiResponse(''); }}
                                className="px-8 py-4 bg-brand-blue text-white font-black rounded-2xl uppercase tracking-widest italic"
                               >
                                VOLVER_INICIO
                               </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeView === 'recursos' && (
              <motion.div key="recursos" className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Calculator />
                  <UnitConverter />
                </div>
                
                <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-3xl font-black uppercase italic mb-10 border-b border-gray-50 pb-6 tracking-tighter">Conversión de Unidades</h3>
                  <div className="overflow-x-auto rounded-3xl border border-gray-50">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 px-8">
                          <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">Magnitud</th>
                          <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">Unidad (SI)</th>
                          <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">Símbolo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <tr><td className="py-6 px-8 font-black uppercase italic tracking-tighter text-lg">Longitud</td><td className="px-8 font-bold">metro</td><td className="px-8 font-mono font-bold text-brand-blue">m</td></tr>
                        <tr><td className="py-6 px-8 font-black uppercase italic tracking-tighter text-lg">Masa</td><td className="px-8 font-bold">kilogramo</td><td className="px-8 font-mono font-bold text-brand-blue">kg</td></tr>
                        <tr><td className="py-6 px-8 font-black uppercase italic tracking-tighter text-lg">Tiempo</td><td className="px-8 font-bold">segundo</td><td className="px-8 font-mono font-bold text-brand-blue">s</td></tr>
                        <tr><td className="py-6 px-8 font-black uppercase italic tracking-tighter text-lg">Fuerza</td><td className="px-8 font-bold">newton</td><td className="px-8 font-mono font-bold text-brand-blue">N</td></tr>
                        <tr><td className="py-6 px-8 font-black uppercase italic tracking-tighter text-lg">Energía</td><td className="px-8 font-bold">joule</td><td className="px-8 font-mono font-bold text-brand-blue">J</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'ayuda' && (
              <motion.div key="ayuda" className="space-y-12">
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto py-12">
                   <div className="w-24 h-24 bg-gray-900 text-white rounded-[2.5rem] flex items-center justify-center mb-8 rotate-3 shadow-xl">
                     <CircleHelp size={48} />
                   </div>
                   <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">Manual de Usuario_</h2>
                   <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Exprime al máximo tu tutor inteligente</p>
                </div>

                <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                   <section className="space-y-4">
                     <h4 className="text-2xl font-black text-brand-blue tracking-tighter">01_ Perfil</h4>
                     <p className="text-sm font-medium text-gray-500 leading-relaxed uppercase">Tu progreso se bloquea por tema. Gana insignias resolviendo retos únicos en modo prueba.</p>
                   </section>
                   <section className="space-y-4">
                     <h4 className="text-2xl font-black text-brand-blue tracking-tighter">02_ Scaffolding</h4>
                     <p className="text-sm font-medium text-gray-500 leading-relaxed uppercase">Usa el sistema adaptativo si estás bloqueado. La IA generará explicaciones de nivel básico.</p>
                   </section>
                   <section className="space-y-4">
                     <h4 className="text-2xl font-black text-brand-blue tracking-tighter">03_ Modo Profe</h4>
                     <p className="text-sm font-medium text-gray-500 leading-relaxed uppercase">Sube fotos de tus hojas. Analizamos el proceso, no solo la respuesta final.</p>
                   </section>
                   <section className="space-y-4">
                     <h4 className="text-2xl font-black text-brand-blue tracking-tighter">04_ Evaluación</h4>
                     <p className="text-sm font-medium text-gray-500 leading-relaxed uppercase">Simulacros de 70 min basados en el histórico real de tu curso cargado por el docente.</p>
                   </section>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function MenuButton({ title, desc, icon: Icon, color, onClick }: any) {
  const themes: any = {
    black: "bg-black text-white shadow-black/10 border-black",
    blue: "bg-blue-50 text-brand-blue border-blue-200 shadow-blue-900/5",
    red: "bg-brand-red text-white shadow-red-900/10 border-brand-red",
    white: "bg-white text-gray-900 border-gray-100 shadow-gray-200",
  };

  return (
    <motion.button 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-10 rounded-[3rem] border flex items-center justify-between transition-all text-left",
        themes[color]
      )}
    >
      <div className="max-w-[200px]">
        <h3 className="text-3xl font-black uppercase italic mb-2 tracking-tighter italic leading-none">{title}</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{desc}</p>
      </div>
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center border-2",
        color === 'black' || color === 'red' ? "border-white/20 text-white" : "border-brand-blue/20 text-brand-blue"
      )}>
        <Icon size={24} />
      </div>
    </motion.button>
  );
}
