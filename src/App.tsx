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
  Zap,
  Settings,
  Key,
  ExternalLink,
  X
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
import ScientificCalculator from './components/resources/ScientificCalculator';
import UnitConverter from './components/resources/UnitConverter';
import UnitsTable from './components/resources/UnitsTable';
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
  const [topicChatHistories, setTopicChatHistories] = useState<Record<string, { role: string, text: string }[]>>({});
  const chatMessages = topicChatHistories[selectedTopic.id] || [];

  const [topicAiResponses, setTopicAiResponses] = useState<Record<string, string>>({});
  const aiResponse = topicAiResponses[selectedTopic.id] || '';

  const [correctionImage, setCorrectionImage] = useState<string | null>(null);
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [testPhase, setTestPhase] = useState<'idle' | 'testing' | 'delivering' | 'finished'>('idle');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Gemini API Key State
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(localStorage.getItem('user_gemini_api_key'));
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  const [schematicText, setSchematicText] = useState('');
  const [schematicImg, setSchematicImg] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
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
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(userRef, newUser);
              setUser(newUser);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${authUser.uid}`);
            }
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

  // Check for API key after user is authenticated
  useEffect(() => {
    if (user && !geminiApiKey) {
      setShowSettings(true);
    }
  }, [user, geminiApiKey]);

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('user_gemini_api_key', tempApiKey.trim());
      setGeminiApiKey(tempApiKey.trim());
      setShowSettings(false);
      setTempApiKey('');
    }
  };

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
    if (!geminiApiKey) {
      setShowSettings(true);
      return;
    }
    const userMessage = question || inputText || 'No entiendo nada. ¿Me explicás!';
    if (!userMessage.trim()) return;

    setIsProcessing(true);
    setActiveView('tutor');
    setInputText('');
    
    const currentHistory = topicChatHistories[selectedTopic.id] || [];
    const newMessages = [...currentHistory, { role: 'user', text: userMessage }];
    
    setTopicChatHistories(prev => ({
      ...prev,
      [selectedTopic.id]: newMessages
    }));

    try {
      const res = await generateExplanation(
        geminiApiKey,
        selectedTopic.title, 
        selectedTopic.theory, 
        'intermedio', 
        newMessages
      );
      
      if (res) {
        setTopicChatHistories(prev => ({
          ...prev,
          [selectedTopic.id]: [...newMessages, { role: 'model', text: res }]
        }));
        setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: res }));
      } else {
        setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'No pude generar una respuesta.' }));
      }
    } catch (error) {
      console.error(error);
      setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'Hubo un error al procesar tu solicitud. Revisa tu API Key.' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCorrection = async (file: File) => {
    if (!geminiApiKey) {
      setShowSettings(true);
      return;
    }
    setIsProcessing(true);
    setCorrectionFeedback(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setCorrectionImage(base64);
        const res = await correctExercise(geminiApiKey, base64, selectedTopic.exercises[0].question);
        setCorrectionFeedback(res || 'Error al corregir.');
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setCorrectionFeedback('Error subiendo la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiagram = async (prompt: string) => {
    if (!geminiApiKey) {
      setShowSettings(true);
      return;
    }
    if (!prompt) return;
    setIsProcessing(true);
    try {
      const res = await generateSchematic(geminiApiKey, prompt);
      if (res) {
        setSchematicImg(res);
      } else {
        setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'Huy, no pude dibujar el esquema. Probá con otra descripción.' }));
      }
    } catch (e) {
      console.error(e);
      setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'Error al generar el esquema.' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMockExam = async () => {
    if (!geminiApiKey) {
      setShowSettings(true);
      return;
    }
    setIsProcessing(true);
    setTimerSeconds(70 * 60);
    setTimerActive(true);
    setTestPhase('testing');
    setActiveView('prueba');
    try {
      // Tomamos el primer ejercicio (si existe) como "base" o enviamos un prompt genérico basado en la teoría
      const baseRef = selectedTopic.exercises[0]?.question || "Tres ejercicios de nivel parcial.";
      const res = await generateMockExam(geminiApiKey, baseRef, selectedTopic.title, selectedTopic.theory);
      setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: res || 'Error al generar examen.' }));
    } catch (e) {
      setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'Huy, se rompió algo generando el parcial. Probá de nuevo.' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestDelivery = async (file: File) => {
    if (!geminiApiKey) {
      setShowSettings(true);
      return;
    }
    setIsProcessing(true);
    setTimerActive(false);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const res = await correctExercise(geminiApiKey, base64, aiResponse); // Comparamos la foto con el enunciado generado
        setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: res || 'No pude corregirlo, maestro.' }));
        setTestPhase('finished');
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'Hubo un error subiendo la entrega.' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProposeChallenge = async () => {
    if (!geminiApiKey) {
      setShowSettings(true);
      return;
    }
    setIsProcessing(true);
    setActiveView('tutor');
    // Para un nuevo desafío, podríamos limpiar el historial o simplemente preguntar
    // El usuario pidió que no se reinicie con cada mensaje, pero Proponer Desafío suele ser un punto de partida.
    // Lo mantendremos acumulativo por ahora o resetearemos si es un tema nuevo.
    try {
      const res = await proposeExercise(geminiApiKey, selectedTopic.title, selectedTopic.theory, selectedTopic.exercises);
      if (res) {
        const newMessage = { role: 'model', text: res };
        setTopicChatHistories(prev => ({
          ...prev,
          [selectedTopic.id]: [...(prev[selectedTopic.id] || []), newMessage]
        }));
        setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: res }));
      } else {
        setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'El profe se quedó sin ideas. Probá en un ratito.' }));
      }
    } catch (e) {
      console.error(e);
      setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: 'Hubo un error al pedirle el desafío al profe.' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const logout = () => signOut(auth);

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
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-16 h-16 bg-slate-900 text-brand-accent rounded-3xl flex items-center justify-center mb-6">
                    <Key size={32} />
                  </div>
                  {geminiApiKey && (
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                <h2 className="text-4xl font-black uppercase tracking-tight text-slate-900 mb-4 line-clamp-2">Traé tu propia llave_</h2>
                <p className="text-slate-500 font-medium leading-relaxed mb-10 text-sm">
                  Para que los chats funcionen y no se nos agote la cuota, por favor cargá tu <span className="font-bold text-slate-900">Gemini API Key</span>. Se guardará localmente en tu navegador.
                </p>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tu Gemini API Key</label>
                    <div className="relative group">
                      <input 
                        type="password" 
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="Pegá tu API Key acá..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:ring-4 ring-brand-blue/10 transition-all font-mono text-sm placeholder:text-slate-300 shadow-inner"
                      />
                    </div>
                  </div>

                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline group"
                  >
                    Obtén tu API Key gratis aquí
                    <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>

                  <button 
                    onClick={handleSaveApiKey}
                    disabled={!tempApiKey.trim()}
                    className="w-full bg-slate-900 text-brand-accent font-black py-6 rounded-2xl hover:bg-brand-blue hover:text-white transition-all active:scale-95 disabled:opacity-30 uppercase tracking-widest flex items-center justify-center gap-3 mt-4"
                  >
                    Guardar Configuración_
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-8 leading-loose">
                  Tu clave está segura: nunca se envía a nuestro servidor ni se comparte con nadie.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Modal Overlay */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-md"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full h-full flex items-center justify-center p-12"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowImageModal(false)}
                className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-black font-black z-50 shadow-2xl hover:scale-110 active:scale-90 transition-all"
              >
                ✕
              </button>
              <img 
                src={schematicImg} 
                alt="Esquema Ampliado" 
                className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border-4 border-white/10" 
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar 
        user={user} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={logout} 
        onOpenSettings={() => setShowSettings(true)}
      />

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
                  className="text-[7rem] font-black tracking-tight uppercase text-slate-900 leading-[0.8] mb-2"
                >
                  {activeView === 'dashboard' ? 'TUTOR.AI' : 
                   activeView === 'tutor' ? 'Tutor IA' :
                   activeView === 'prueba' ? 'Prueba' : 
                   activeView === 'profe' ? 'Feedback' :
                   activeView === 'recursos' ? 'Recursos' : 'Ayuda'}
                  <span className="text-brand-blue">.</span>
                </motion.h1>
                <div className="h-1.5 w-24 bg-brand-accent mb-12"></div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Plataforma de Aprendizaje Adaptativo</div>
              </div>
            </div>

            <div className="bg-white border-b border-slate-200 py-4 px-6 flex flex-col items-end min-w-[280px] rounded-2xl shadow-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tópico_Seleccionado</div>
              <div className="flex items-center gap-3">
                <select 
                  value={selectedTopic.id}
                  onChange={(e) => setSelectedTopic(INITIAL_TOPICS.find(t => t.id === e.target.value)!)}
                  className="bg-transparent font-black text-xl uppercase tracking-tight outline-none cursor-pointer text-right appearance-none text-slate-900"
                >
                  {INITIAL_TOPICS.map(t => <option key={t.id} value={t.id} className="text-slate-900 bg-white">{t.title}</option>)}
                </select>
                <div className="w-6 h-6 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
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

                <div className="p-12 bg-white border border-slate-200 shadow-xl rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50/50 rounded-bl-[6rem] flex items-center justify-center text-slate-200">
                    <BookOpen size={96} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="px-3 py-1 bg-brand-blue text-white text-[9px] font-black uppercase tracking-widest rounded-md">CONOCIMIENTO_BASE</div>
                      <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TEORÍA_ACTIVA</div>
                    </div>

                    <h2 className="text-6xl font-black uppercase tracking-tight text-slate-900 mb-6">{selectedTopic.title}</h2>
                    
                    <div className="pt-8 border-t border-slate-100">
                      <div className="prose prose-slate max-w-none prose-sm font-medium leading-relaxed text-slate-600 mb-8">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{selectedTopic.theory}</ReactMarkdown>
                      </div>
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
                  <div className="p-12 flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
                    <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
                      <div>
                        <h2 className="text-4xl font-black uppercase tracking-tight text-slate-900">Lula <span className="text-brand-blue">GPT</span></h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">SISTEMA DE ANDAMIAJE ACTIVO</p>
                      </div>
                      <div className="px-5 py-2 bg-slate-900 text-brand-accent font-black rounded-full uppercase tracking-widest text-[9px] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></div>
                        AI_CORE_ONLINE
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {chatMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "flex flex-col",
                            msg.role === 'user' ? "items-end" : "items-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[85%] px-7 py-5 rounded-3xl text-sm leading-relaxed",
                            msg.role === 'user' 
                              ? "bg-brand-blue text-white rounded-tr-none shadow-lg shadow-indigo-200 font-medium" 
                              : "bg-white border border-slate-100 shadow-sm rounded-tl-none prose prose-indigo prose-sm"
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}

                      {isProcessing && (
                        <div className="flex flex-col items-start">
                          <div className="bg-white border border-gray-100 shadow-sm p-6 rounded-3xl rounded-tl-none flex gap-2">
                            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce [animation-delay:-.3s]"></div>
                            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce [animation-delay:-.5s]"></div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>

                    {!isProcessing && chatMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center opacity-30 py-20 grayscale">
                        <Sparkles size={64} className="mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Sin mensajes aún_</p>
                      </div>
                    )}
                  </div>
                
                <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Escribe tu consulta aquí..."
                      className="w-full bg-white border border-slate-200 rounded-2xl px-10 py-6 outline-none focus:ring-4 ring-indigo-500/5 transition-all font-bold tracking-tight text-lg shadow-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTutorHelp();
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => handleTutorHelp()}
                    disabled={isProcessing}
                    className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-brand-blue hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Send size={24} className="text-brand-accent transition-colors" />
                  </button>
                </div>
              </motion.div>
            )}

            {activeView === 'profe' && (
              <motion.div key="profe" className="space-y-12">
                <AnimatePresence mode="wait">
                  {correctionImage || correctionFeedback || isProcessing ? (
                    <motion.div 
                      key="correction-result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden"
                    >
                      <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-blue text-white rounded-2xl flex items-center justify-center">
                            <GraduationCap size={24} />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Feedback del Profe</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análisis Didáctico Finalizado</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setCorrectionImage(null);
                            setCorrectionFeedback(null);
                          }}
                          className="px-6 py-3 bg-slate-900 text-brand-accent font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-brand-blue hover:text-white transition-all active:scale-95"
                        >
                          Nueva Consulta
                        </button>
                      </div>

                      <div className="p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Captura_Procesada</div>
                            {correctionImage ? (
                              <div 
                                className="relative aspect-[4/3] rounded-3xl overflow-hidden border-4 border-slate-100 shadow-inner group cursor-zoom-in"
                                onClick={() => {
                                  setSchematicImg(correctionImage);
                                  setShowImageModal(true);
                                }}
                              >
                                <img src={correctionImage} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white text-[10px] font-black uppercase tracking-widest">
                                    Click para ampliar
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-[4/3] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-blue rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digitalizando Hoja...</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Devolución_LulaAI</div>
                            <div className="flex-1 bg-slate-50 rounded-3xl p-8 border border-slate-100 overflow-y-auto max-h-[500px]">
                              {correctionFeedback ? (
                                <div className="prose prose-indigo prose-sm font-medium leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {correctionFeedback}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-4">
                                  <div className="h-4 bg-slate-200 rounded-full w-3/4 animate-pulse"></div>
                                  <div className="h-4 bg-slate-200 rounded-full w-full animate-pulse delay-75"></div>
                                  <div className="h-4 bg-slate-200 rounded-full w-5/6 animate-pulse delay-150"></div>
                                  <div className="h-4 bg-slate-200 rounded-full w-2/3 animate-pulse delay-300"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="options"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
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
                            onClick={() => setShowImageModal(true)}
                            className="mt-6 text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline"
                          >
                            Ver Imagen Completa
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                                onClick={() => { 
                                  setTestPhase('idle'); 
                                  setTopicAiResponses(prev => ({ ...prev, [selectedTopic.id]: '' })); 
                                }}
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <ScientificCalculator />
                  <UnitConverter />
                </div>
                <UnitsTable />
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
    black: "bg-slate-900 text-white shadow-xl shadow-slate-900/10 border-slate-900 hover:bg-slate-800",
    blue: "bg-brand-blue text-white shadow-xl shadow-indigo-600/10 border-brand-blue hover:bg-indigo-700",
    red: "bg-brand-red text-white shadow-xl shadow-rose-900/10 border-brand-red hover:bg-rose-600",
    white: "bg-white text-slate-900 border-slate-200 shadow-xl shadow-slate-200/20 hover:border-slate-300",
  };

  return (
    <motion.button 
      whileHover={{ y: -8, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-10 rounded-[2.5rem] border flex flex-col items-start justify-between transition-all text-left group overflow-hidden relative",
        themes[color]
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center mb-10 transition-all",
        color === 'black' || color === 'red' || color === 'blue' 
          ? "bg-white/10 text-brand-accent group-hover:bg-white/20" 
          : "bg-slate-50 text-slate-400 group-hover:text-brand-blue"
      )}>
        <Icon size={22} />
      </div>

      <div>
        <h3 className="text-2xl font-black uppercase tracking-tight mb-2 leading-none">{title}</h3>
        <p className={cn(
          "text-[10px] font-bold uppercase tracking-[0.15em]",
          color === 'white' ? "text-slate-400" : "text-white/60"
        )}>
          {desc}
        </p>
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full group-hover:bg-white/10 transition-all"></div>
    </motion.button>
  );
}
