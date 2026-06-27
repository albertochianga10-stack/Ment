import React, { useReducer, useEffect, useMemo, useCallback, useRef, useState, memo } from "react";
import {
  BookOpen,
  TrendingUp,
  Coins,
  Briefcase,
  Megaphone,
  Users,
  Cpu,
  Atom,
  Brain,
  History,
  Star,
  Mic,
  MicOff,
  Copy,
  Check,
  Share2,
  Printer,
  Plus,
  Trash2,
  Play,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  FileText,
  Bookmark,
  Award,
  Search,
  Eye,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { fallbackTopics } from "./localContent";
import { StudyView, Message, Conversation, Flashcard, QuizItem, StudyGoal, StudyProgress, AppState, AppAction } from "./types";

// ============================================================
// UTILS & HELPERS
// ============================================================

// Unique ID Generator
const generateId = () => Math.random().toString(36).substr(2, 9);

// Markdown Parser
function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (key: number) => {
    if (!currentList) return null;
    const listElements = currentList.items.map((item, idx) => (
      <li key={`list-${idx}`} className="mb-1 text-sm md:text-base leading-relaxed text-text-primary">
        {parseInlineMarkdown(item)}
      </li>
    ));
    const list = currentList.type === 'ul' ? (
      <ul key={`ul-${key}`} className="list-disc pl-5 mb-4 space-y-1">
        {listElements}
      </ul>
    ) : (
      <ol key={`ol-${key}`} className="list-decimal pl-5 mb-4 space-y-1">
        {listElements}
      </ol>
    );
    currentList = null;
    return list;
  };

  const parseInlineMarkdown = (inlineText: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const pieces = inlineText.split(regex);
    return pieces.map((piece, i) => {
      if (piece.startsWith("**") && piece.endsWith("**")) {
        return <strong key={i} className="font-bold text-accent">{piece.slice(2, -2)}</strong>;
      }
      if (piece.startsWith("`") && piece.endsWith("`")) {
        return <code key={i} className="bg-bg-sidebar px-1.5 py-0.5 rounded font-mono text-xs text-accent border border-border-custom">{piece.slice(1, -1)}</code>;
      }
      return piece;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("## ")) {
      const list = flushList(i);
      if (list) elements.push(list);
      elements.push(
        <h2 key={i} className="text-xl md:text-2xl font-serif font-bold text-accent tracking-tight mt-6 mb-3 border-b border-border-custom pb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      const list = flushList(i);
      if (list) elements.push(list);
      elements.push(
        <h3 key={i} className="text-lg md:text-xl font-serif font-semibold text-text-primary mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line === "---") {
      const list = flushList(i);
      if (list) elements.push(list);
      elements.push(
        <hr key={i} className="my-6 border-t border-accent/20" />
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!currentList || currentList.type !== 'ul') {
        const list = flushList(i);
        if (list) elements.push(list);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        if (!currentList || currentList.type !== 'ol') {
          const list = flushList(i);
          if (list) elements.push(list);
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(match[2]);
      }
    } else if (line === "") {
      const list = flushList(i);
      if (list) elements.push(list);
    } else {
      const list = flushList(i);
      if (list) elements.push(list);
      elements.push(
        <p key={i} className="mb-4 text-sm md:text-base leading-relaxed text-text-primary">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  }

  const finalBreak = flushList(lines.length);
  if (finalBreak) elements.push(finalBreak);

  return elements;
}

// Local Fallback Matcher based on query keywords and active category
function findMatchingFallback(query: string, activeCategory?: string): string | null {
  const q = query.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove accents, e.g., "ações" -> "acoes", "gestão" -> "gestao"

  // 1. Direct explicit keyword matches
  const hasWord = (word: string) => {
    const regex = new RegExp(`(?:^|[^a-z0-9])${word}(?:$|[^a-z0-9])`, 'i');
    return regex.test(q);
  };

  if (
    hasWord("dropshipping") ||
    hasWord("dropship") ||
    hasWord("mineracao") ||
    hasWord("minerados") ||
    hasWord("loja") ||
    hasWord("lojas")
  ) {
    return "dropshipping";
  }

  if (
    hasWord("pessoas") || 
    hasWord("lideranca") || 
    hasWord("lider") || 
    hasWord("rh") || 
    hasWord("comunicacao") || 
    hasWord("oratoria") || 
    hasWord("feedback") || 
    hasWord("equipe")
  ) {
    return "pessoas";
  }

  if (
    hasWord("financa") || 
    hasWord("financas") || 
    hasWord("orcamento") || 
    hasWord("orcamentos") || 
    hasWord("poupar") || 
    hasWord("financeira") || 
    hasWord("financeiras")
  ) {
    return "financas";
  }

  if (
    hasWord("empresa") || 
    hasWord("empresas") || 
    q.includes("empreend") || 
    hasWord("startup") || 
    hasWord("startups") || 
    hasWord("negocio") || 
    hasWord("negocios")
  ) {
    return "empreendedorismo";
  }

  if (
    hasWord("marketing") || 
    hasWord("digital") || 
    hasWord("funil") || 
    hasWord("persona") || 
    hasWord("seo")
  ) {
    return "marketing";
  }

  if (
    hasWord("bolsa") || 
    hasWord("acoes") || 
    hasWord("investir") || 
    hasWord("investimento") || 
    hasWord("investimentos") || 
    hasWord("fii") || 
    hasWord("dividendo") || 
    hasWord("dividendos")
  ) {
    return "investimentos";
  }

  if (
    hasWord("habito") || 
    hasWord("habitos") || 
    hasWord("produtividade") || 
    hasWord("rotina") || 
    hasWord("rotinas") || 
    hasWord("performance") || 
    hasWord("pomodoro")
  ) {
    return "habitos";
  }

  // 2. Score-based matching on synonyms
  const synonymMap: { [key: string]: string[] } = {
    dropshipping: ["dropshipping", "dropship", "mineracao", "minerados", "loja", "lojas", "fornecedor", "fornecedores", "estoque", "e-commerce"],
    pessoas: ["pessoas", "lideranca", "lider", "rh", "comunicacao", "oratoria", "feedback", "equipe", "equipes", "trabalho", "lideres", "colegas", "colaboradores"],
    financas: ["financa", "financas", "orcamento", "orcamentos", "poupar", "financeira", "financeiras", "gasto", "gastos", "economizar", "poupanca", "divida", "dividas", "credito"],
    empreendedorismo: ["empresa", "empresas", "empreend", "empreendedorismo", "startup", "startups", "negocio", "negocios", "criar", "vender", "administracao", "gestao", "contabilidade"],
    marketing: ["marketing", "digital", "funil", "persona", "seo", "ads", "copi", "copywriting", "trafego", "vendas", "venda", "divulgacao", "anuncio", "anuncios"],
    investimentos: ["bolsa", "acoes", "investir", "investimento", "investimentos", "fii", "dividendo", "dividendos", "cripto", "renda", "variavel", "fixa", "mercado"],
    habitos: ["habito", "habitos", "produtividade", "rotina", "rotinas", "performance", "pomodoro", "foco", "inteligencia", "emocional", "mente", "disciplina"]
  };

  let bestKey: string | null = null;
  let maxScore = 0;

  for (const [key, synonyms] of Object.entries(synonymMap)) {
    let score = 0;
    for (const syn of synonyms) {
      if (q.includes(syn)) {
        score += 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestKey = key;
    }
  }

  if (maxScore > 0 && bestKey) {
    return bestKey;
  }

  // 3. Fallback to category mapping if active category is present
  if (activeCategory) {
    const cat = activeCategory.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (cat.includes("pessoas") || cat.includes("lideranca")) {
      return "pessoas";
    }
    if (cat.includes("empreendedorismo")) {
      return "empreendedorismo";
    }
    if (cat.includes("marketing") || cat.includes("vendas")) {
      return "marketing";
    }
    if (cat.includes("financas") || cat.includes("investimentos")) {
      return "financas";
    }
    if (cat.includes("pessoal") || cat.includes("habitos")) {
      return "habitos";
    }
  }

  return null;
}

// ============================================================
// ERROR BOUNDARY
// ============================================================
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-6 text-center">
          <div className="bg-bg-card border border-danger/20 p-8 rounded-xl shadow-lg max-w-md">
            <h1 className="text-2xl font-serif font-bold text-danger mb-4">Algo deu errado</h1>
            <p className="text-text-muted mb-6 text-sm">
              Ocorreu um erro inesperado no aplicativo. Mas fique tranquilo, seus dados locais foram preservados.
            </p>
            <pre className="text-xs bg-bg-sidebar p-3 rounded text-danger mb-6 overflow-x-auto text-left">
              {this.state.error?.message || "Erro desconhecido"}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-lg transition-all font-medium text-sm inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Recarregar Plataforma
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// REDUCER & INITIAL STATE
// ============================================================

const initialProgress: StudyProgress = {
  totalSessions: 4,
  streakDays: 3,
  lastStudiedDate: new Date().toISOString().split('T')[0],
  categoryStats: {
    "Finanças & Investimentos": 2,
    "Empreendedorismo": 1,
    "Marketing & Vendas": 1,
    "Tecnologia": 0,
    "Desenvolvimento Pessoal": 0
  },
  recentTopics: ["Educação Financeira Básica", "Startups Lean", "Funil de Vendas de Atração"]
};

const initialGoals: StudyGoal[] = [
  { id: "g1", title: "Estudar Finanças essa semana", targetMinutes: 120, completedMinutes: 80 },
  { id: "g2", title: "Aprender Métricas de Marketing", targetMinutes: 60, completedMinutes: 20 },
  { id: "g3", title: "Praticar técnica Pomodoro", targetMinutes: 90, completedMinutes: 90 }
];

const getLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn("Error reading localStorage key", key, error);
    return defaultValue;
  }
};

const setLocalStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Error writing localStorage key", key, error);
  }
};

const initialState: AppState = {
  view: 'dashboard',
  messages: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  favorites: getLocalStorage<Message[]>('vision_mastery_favorites', []),
  theme: getLocalStorage<'light' | 'dark'>('vision_mastery_theme', 'light'),
  fontSize: getLocalStorage<'sm' | 'md' | 'lg'>('vision_mastery_fontsize', 'md'),
  activeCategory: null,
  activeSubcategory: null,
  studyGoals: getLocalStorage<StudyGoal[]>('vision_mastery_goals', initialGoals),
  progress: getLocalStorage<StudyProgress>('vision_mastery_progress', initialProgress),
  flashcards: [],
  quizItems: [],
  conversations: getLocalStorage<Conversation[]>('vision_mastery_conversations', []),
  activeConversationId: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'ADD_MESSAGE': {
      const updatedMessages = [...state.messages, action.payload];
      // Sync to conversation
      let updatedConversations = [...state.conversations];
      if (state.activeConversationId) {
        updatedConversations = state.conversations.map(c => {
          if (c.id === state.activeConversationId) {
            return { ...c, messages: updatedMessages, timestamp: new Date().toISOString() };
          }
          return c;
        });
      }
      return { ...state, messages: updatedMessages, conversations: updatedConversations };
    }
    case 'TOGGLE_FAVORITE': {
      const messageId = action.payload;
      const targetMessage = state.messages.find(m => m.id === messageId);
      if (!targetMessage) return state;

      const updatedIsFavorite = !targetMessage.isFavorite;
      const updatedMessages = state.messages.map(m =>
        m.id === messageId ? { ...m, isFavorite: updatedIsFavorite } : m
      );

      let newFavorites = [...state.favorites];
      if (updatedIsFavorite) {
        const favoriteToAdd = { ...targetMessage, isFavorite: true };
        if (!newFavorites.some(f => f.id === favoriteToAdd.id)) {
          newFavorites.push(favoriteToAdd);
        }
      } else {
        newFavorites = newFavorites.filter(f => f.id !== messageId);
      }

      // Sync to current conversation
      let updatedConversations = [...state.conversations];
      if (state.activeConversationId) {
        updatedConversations = state.conversations.map(c => {
          if (c.id === state.activeConversationId) {
            return { ...c, messages: updatedMessages, timestamp: new Date().toISOString() };
          }
          return c;
        });
      }

      setLocalStorage('vision_mastery_favorites', newFavorites);
      return { ...state, messages: updatedMessages, favorites: newFavorites, conversations: updatedConversations };
    }
    case 'SET_THEME':
      setLocalStorage('vision_mastery_theme', action.payload);
      return { ...state, theme: action.payload };
    case 'SET_FONT_SIZE':
      setLocalStorage('vision_mastery_fontsize', action.payload);
      return { ...state, fontSize: action.payload };
    case 'SET_CATEGORY':
      return {
        ...state,
        activeCategory: action.payload.category,
        activeSubcategory: action.payload.subcategory
      };
    case 'ADD_GOAL': {
      const newGoals = [...state.studyGoals, action.payload];
      setLocalStorage('vision_mastery_goals', newGoals);
      return { ...state, studyGoals: newGoals };
    }
    case 'UPDATE_GOAL': {
      const newGoals = state.studyGoals.map(g => {
        if (g.id === action.payload.id) {
          const completed = Math.min(g.targetMinutes, g.completedMinutes + action.payload.minutes);
          return { ...g, completedMinutes: completed };
        }
        return g;
      });
      setLocalStorage('vision_mastery_goals', newGoals);
      return { ...state, studyGoals: newGoals };
    }
    case 'DELETE_GOAL': {
      const newGoals = state.studyGoals.filter(g => g.id !== action.payload);
      setLocalStorage('vision_mastery_goals', newGoals);
      return { ...state, studyGoals: newGoals };
    }
    case 'RECORD_SESSION': {
      const { category, topic } = action.payload;
      const todayStr = new Date().toISOString().split('T')[0];

      let streak = state.progress.streakDays;
      if (state.progress.lastStudiedDate) {
        const lastDate = new Date(state.progress.lastStudiedDate);
        const today = new Date(todayStr);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak += 1;
        } else if (diffDays > 1) {
          streak = 1; // broken streak, restart
        }
      } else {
        streak = 1;
      }

      const updatedCategoryStats = { ...state.progress.categoryStats };
      if (category) {
        updatedCategoryStats[category] = (updatedCategoryStats[category] || 0) + 1;
      }

      const uniqueTopics = Array.from(new Set([topic, ...state.progress.recentTopics])).slice(0, 5);

      const newProgress: StudyProgress = {
        totalSessions: state.progress.totalSessions + 1,
        streakDays: streak,
        lastStudiedDate: todayStr,
        categoryStats: updatedCategoryStats,
        recentTopics: uniqueTopics
      };

      setLocalStorage('vision_mastery_progress', newProgress);
      return { ...state, progress: newProgress };
    }
    case 'SET_FLASHCARDS':
      return { ...state, flashcards: action.payload };
    case 'SET_QUIZ_ITEMS':
      return { ...state, quizItems: action.payload };
    case 'CREATE_CONVERSATION': {
      const updatedConversations = [action.payload, ...state.conversations];
      setLocalStorage('vision_mastery_conversations', updatedConversations);
      return {
        ...state,
        conversations: updatedConversations,
        activeConversationId: action.payload.id,
        messages: action.payload.messages
      };
    }
    case 'LOAD_CONVERSATION':
      return {
        ...state,
        activeConversationId: action.payload.id,
        messages: action.payload.messages,
        view: 'chat'
      };
    case 'DELETE_CONVERSATION': {
      const updatedConversations = state.conversations.filter(c => c.id !== action.payload);
      setLocalStorage('vision_mastery_conversations', updatedConversations);
      if (state.activeConversationId === action.payload) {
        return {
          ...state,
          conversations: updatedConversations,
          activeConversationId: null,
          messages: []
        };
      }
      return { ...state, conversations: updatedConversations };
    }
    case 'CLEAR_MESSAGES': {
      let updatedConversations = [...state.conversations];
      if (state.activeConversationId) {
        updatedConversations = state.conversations.map(c => {
          if (c.id === state.activeConversationId) {
            return { ...c, messages: [] };
          }
          return c;
        });
      }
      return { ...state, messages: [], conversations: updatedConversations };
    }
    default:
      return state;
  }
}

// ============================================================
// MAIN APPLET COMPONENT
// ============================================================
export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalMinutes, setNewGoalMinutes] = useState("60");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Trigger Toast function
  const triggerToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  // Sync dark theme on root HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--bg-primary', '#0F0F11');
      root.style.setProperty('--bg-card', '#1C1C1E');
      root.style.setProperty('--bg-sidebar', '#151517');
      root.style.setProperty('--text-primary', '#FAF8F4');
      root.style.setProperty('--text-muted', '#A0A0A0');
      root.style.setProperty('--border-custom', '#2E2E30');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--bg-primary', '#FAF8F4');
      root.style.setProperty('--bg-card', '#FFFFFF');
      root.style.setProperty('--bg-sidebar', '#F2EFE9');
      root.style.setProperty('--text-primary', '#1C1C1E');
      root.style.setProperty('--text-muted', '#6B6B6B');
      root.style.setProperty('--border-custom', '#E5E0D8');
    }
  }, [state.theme]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (state.view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, state.view, state.isLoading]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Voice Search / Speech Recognition handler
  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerToast("Reconhecimento de voz não suportado neste navegador.", "error");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      triggerToast("Ouvindo... Fale agora.", "info");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev ? prev + " " + transcript : transcript);
      triggerToast("Texto capturado com sucesso!", "success");
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      triggerToast("Erro ao reconhecer voz. Tente novamente.", "error");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  }, [isRecording, triggerToast]);

  // Handle Send Message & Chat logic
  const handleSendMessage = useCallback(async (textToSend?: string, customMode?: 'aprendizagem' | 'mentor' | 'estrategico') => {
    const rawMessage = (textToSend || inputText).trim();
    if (!rawMessage) return;

    setInputText("");

    // Ensure we have an active conversation
    let currentConversationId = state.activeConversationId;
    if (!currentConversationId) {
      const newConv: Conversation = {
        id: generateId(),
        title: rawMessage.slice(0, 30) + (rawMessage.length > 30 ? "..." : ""),
        timestamp: new Date().toISOString(),
        messages: []
      };
      currentConversationId = newConv.id;
      dispatch({ type: 'CREATE_CONVERSATION', payload: newConv });
    }

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: rawMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFavorite: false,
      mode: customMode || 'aprendizagem'
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_VIEW', payload: 'chat' });

    // Identify category for stats
    const fallbackCategoryKey = findMatchingFallback(rawMessage, state.activeCategory || undefined);
    const categoryName = fallbackCategoryKey
      ? fallbackTopics[fallbackCategoryKey].category
      : (state.activeCategory || "Geral");

    // Try API fetch with timeout, fallback on fail
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      // Collect chat history formatted for backend API
      const chatHistory = state.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawMessage,
          mode: customMode || 'aprendizagem',
          history: chatHistory
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data?.text;

      if (!assistantText) {
        throw new Error("Formato de resposta da IA inválido");
      }

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFavorite: false,
        mode: customMode || 'aprendizagem'
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMsg });

      // Record successful study session stats
      dispatch({
        type: 'RECORD_SESSION',
        payload: {
          category: categoryName,
          topic: rawMessage.slice(0, 25)
        }
      });

      // Update study goals (completed 15 minutes per study interaction)
      const relatedGoal = state.studyGoals.find(g =>
        g.title.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(g.title.toLowerCase())
      );
      if (relatedGoal) {
        dispatch({ type: 'UPDATE_GOAL', payload: { id: relatedGoal.id, minutes: 15 } });
      }

      // Generate related Flashcards and Quiz dynamically from this text
      try {
        const fcRes = await fetch("/api/generate-flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: assistantText })
        });
        if (fcRes.ok) {
          const fcData = await fcRes.json();
          dispatch({ type: 'SET_FLASHCARDS', payload: fcData });
        }

        const quizRes = await fetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: assistantText })
        });
        if (quizRes.ok) {
          const quizData = await quizRes.json();
          dispatch({ type: 'SET_QUIZ_ITEMS', payload: quizData });
        }
      } catch (dynamicErr) {
        console.warn("Failed to generate dynamic flashcards/quiz", dynamicErr);
      }

    } catch (err: any) {
      console.warn("API Error, triggering fallback local content", err);
      triggerToast("Utilizando conteúdo educacional offline de alta retenção.", "info");

      // Auto selection by keywords of query input
      const matchedKey = findMatchingFallback(rawMessage, state.activeCategory || undefined) || "financas"; // Default to finance if nothing matches
      const fallbackData = fallbackTopics[matchedKey];

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: fallbackData.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFavorite: false,
        mode: customMode || 'aprendizagem'
      };

      // Add a slight delay to mimic thinking
      await new Promise(resolve => setTimeout(resolve, 1000));

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMsg });
      dispatch({ type: 'SET_FLASHCARDS', payload: fallbackData.flashcards });
      dispatch({ type: 'SET_QUIZ_ITEMS', payload: fallbackData.quiz });

      dispatch({
        type: 'RECORD_SESSION',
        payload: {
          category: fallbackData.category,
          topic: fallbackData.title
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [inputText, state.activeConversationId, state.activeCategory, state.messages, state.studyGoals, triggerToast]);

  // Quick select dynamic categories/subcategories from sidebar
  const handleSubcategoryClick = useCallback((categoryName: string, subName: string) => {
    dispatch({ type: 'SET_CATEGORY', payload: { category: categoryName, subcategory: subName } });
    const standardPrompt = `Quero aprender sobre ${subName} de forma aprofundada com foco em conceitos e aplicações reais.`;
    setInputText(standardPrompt);
    setIsSidebarOpen(false);
    triggerToast(`Prompt preenchido para: ${subName}`, "success");
    dispatch({ type: 'SET_VIEW', payload: 'chat' });
  }, [triggerToast]);

  // Copy Message to Clipboard
  const handleCopyMessage = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      triggerToast("Copiado para a área de transferência!", "success");
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error("Failed to copy", err);
      triggerToast("Erro ao copiar mensagem.", "error");
    });
  }, [triggerToast]);

  // Share Message
  const handleShareMessage = useCallback((text: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Vision Mastery AI - Compartilhamento de Conteúdo",
        text: text.slice(0, 200) + "...",
        url: window.location.href
      }).catch(err => console.warn(err));
    } else {
      navigator.clipboard.writeText(text);
      triggerToast("Link e resumo copiados! Compartilhe onde preferir.", "success");
    }
  }, [triggerToast]);

  // Print PDF
  const handlePrintMessage = useCallback(() => {
    window.print();
  }, []);

  // Filter starred messages for FavoritesView
  const filteredFavorites = useMemo(() => {
    return state.favorites.filter(fav => {
      const q = state.searchQuery.toLowerCase();
      return fav.content.toLowerCase().includes(q);
    });
  }, [state.favorites, state.searchQuery]);

  // Group Past Conversations for History Sidebar View
  const groupedHistory = useMemo(() => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    state.conversations.forEach(conv => {
      const date = new Date(conv.timestamp);
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < oneDay && now.getDate() === date.getDate()) {
        today.push(conv);
      } else if (diffMs < 2 * oneDay) {
        yesterday.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, older };
  }, [state.conversations]);

  // Dynamic category structure definition
  const categoriesList = useMemo(() => [
    {
      name: "💰 Finanças & Investimentos",
      subcategories: ["Bolsa", "Cripto", "Educação Financeira", "Economia"],
      icon: <Coins className="w-4 h-4 text-accent" />
    },
    {
      name: "🚀 Empreendedorismo",
      subcategories: ["Dropshipping", "Startups", "Gestão", "Administração", "Contabilidade"],
      icon: <Briefcase className="w-4 h-4 text-accent" />
    },
    {
      name: "📣 Marketing & Vendas",
      subcategories: ["Digital", "Branding", "Copywriting", "Negociação"],
      icon: <Megaphone className="w-4 h-4 text-accent" />
    },
    {
      name: "👥 Pessoas & Liderança",
      subcategories: ["RH", "Gestão de Pessoas", "Comunicação", "Oratória"],
      icon: <Users className="w-4 h-4 text-accent" />
    },
    {
      name: "💻 Tecnologia",
      subcategories: ["IA", "Programação", "Web", "Mobile", "Automação"],
      icon: <Cpu className="w-4 h-4 text-accent" />
    },
    {
      name: "🔬 Ciências",
      subcategories: ["Matemática", "Física", "Química", "Biologia", "Engenharia"],
      icon: <Atom className="w-4 h-4 text-accent" />
    },
    {
      name: "🧠 Desenvolvimento Pessoal",
      subcategories: ["Hábitos", "Produtividade", "Psicologia", "Inteligência Emocional"],
      icon: <Brain className="w-4 h-4 text-accent" />
    },
    {
      name: "📚 Humanidades",
      subcategories: ["História", "Geografia", "Filosofia", "Estudos Bíblicos"],
      icon: <BookOpen className="w-4 h-4 text-accent" />
    }
  ], []);

  // Format Recharts data based on real stats
  const chartData = useMemo(() => {
    return Object.entries(state.progress.categoryStats).map(([key, value]) => ({
      name: key.split(" ")[0] || key, // abbreviation for mobile fits
      "Sessões": value,
    }));
  }, [state.progress.categoryStats]);

  // Goal adding handler
  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const newGoal: StudyGoal = {
      id: generateId(),
      title: newGoalTitle,
      targetMinutes: parseInt(newGoalMinutes) || 60,
      completedMinutes: 0
    };

    dispatch({ type: 'ADD_GOAL', payload: newGoal });
    setNewGoalTitle("");
    setIsGoalModalOpen(false);
    triggerToast("Nova meta de estudos adicionada!", "success");
  };

  // Font size helper class
  const getFontSizeClass = () => {
    switch (state.fontSize) {
      case 'sm': return 'text-xs md:text-sm';
      case 'lg': return 'text-base md:text-lg';
      default: return 'text-sm md:text-base';
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row bg-bg-primary text-text-primary overflow-x-hidden">
        
        {/* TOAST SYSTEM */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 p-4 rounded-xl shadow-lg border border-border-custom bg-bg-card transition-all transform animate-fade-in no-print">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success" />}
            {toast.type === 'error' && <X className="w-5 h-5 text-danger" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-accent animate-pulse" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        )}

        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-bg-sidebar border-b border-border-custom no-print">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="font-serif font-bold text-lg tracking-tight text-text-primary uppercase">Vision Mastery</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-text-muted hover:text-text-primary"
            aria-label="Abrir Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* SIDEBAR */}
        <div className={`fixed inset-0 z-40 transform md:transform-none md:relative md:flex flex-col w-80 bg-bg-sidebar border-r border-border-custom transition-transform duration-300 no-print ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}>
          {/* Sidebar Top */}
          <div className="p-6 flex items-center justify-between border-b border-border-custom bg-bg-sidebar">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div>
                <h1 className="font-serif font-bold text-xl tracking-tight leading-none uppercase text-text-primary">Vision Mastery</h1>
                <p className="text-[10px] font-mono text-text-muted mt-1 uppercase tracking-wider">Universidade Pessoal</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-1.5">
            <button
              onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'dashboard' }); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                state.view === 'dashboard'
                  ? "bg-bg-card border-border-custom text-text-primary shadow-sm"
                  : "bg-transparent border-transparent text-text-muted hover:bg-border-custom/30 hover:text-text-primary"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-accent" /> Painel de Progresso
            </button>
            <button
              onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'chat' }); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                state.view === 'chat'
                  ? "bg-bg-card border-border-custom text-text-primary shadow-sm"
                  : "bg-transparent border-transparent text-text-muted hover:bg-border-custom/30 hover:text-text-primary"
              }`}
            >
              <Eye className="w-4 h-4 text-accent" /> Mentor IA Ativo
            </button>
            <button
              onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'favorites' }); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                state.view === 'favorites'
                  ? "bg-bg-card border-border-custom text-text-primary shadow-sm"
                  : "bg-transparent border-transparent text-text-muted hover:bg-border-custom/30 hover:text-text-primary"
              }`}
            >
              <Star className="w-4 h-4 text-accent" /> Resumos Favoritos
            </button>
            {state.flashcards.length > 0 && (
              <button
                onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'flashcards' }); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  state.view === 'flashcards'
                    ? "bg-bg-card border-border-custom text-text-primary shadow-sm"
                    : "bg-transparent border-transparent text-text-muted hover:bg-border-custom/30 hover:text-text-primary"
                }`}
              >
                <Bookmark className="w-4 h-4 text-accent" /> Flashcards Ativos
              </button>
            )}
            {state.quizItems.length > 0 && (
              <button
                onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'quiz' }); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  state.view === 'quiz'
                    ? "bg-bg-card border-border-custom text-text-primary shadow-sm"
                    : "bg-transparent border-transparent text-text-muted hover:bg-border-custom/30 hover:text-text-primary"
                }`}
              >
                <Award className="w-4 h-4 text-accent" /> Testar Conhecimento (Quiz)
              </button>
            )}
          </div>

          {/* Academic Categories (Expandable) */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
            <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2 font-semibold">Categorias de Estudo</h3>
            {categoriesList.map((category) => (
              <div key={category.name} className="border border-border-custom rounded-lg overflow-hidden bg-bg-card/50">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-left text-text-primary hover:bg-bg-primary/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span>{category.name}</span>
                  </div>
                  {expandedCategory === category.name ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                </button>
                {expandedCategory === category.name && (
                  <div className="bg-bg-sidebar border-t border-border-custom px-2 py-1.5 space-y-1 animate-slide-down">
                    {category.subcategories.map(sub => (
                      <button
                        key={sub}
                        onClick={() => handleSubcategoryClick(category.name, sub)}
                        className="w-full text-left text-xs text-text-muted hover:text-accent py-1 px-2.5 rounded hover:bg-bg-primary/60 transition-all truncate"
                      >
                        • {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Conversation History */}
            {state.conversations.length > 0 && (
              <div className="pt-4 space-y-2 border-t border-border-custom mt-4">
                <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                  <History className="w-3 h-3" /> Histórico de Aulas
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {state.conversations.map(conv => (
                    <div key={conv.id} className="group flex items-center justify-between rounded-lg hover:bg-bg-primary/60 p-1.5 transition-all">
                      <button
                        onClick={() => dispatch({ type: 'LOAD_CONVERSATION', payload: conv })}
                        className="flex-1 text-left text-xs text-text-primary truncate font-medium hover:text-accent mr-2"
                      >
                        {conv.title}
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'DELETE_CONVERSATION', payload: conv.id })}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-all"
                        title="Deletar Histórico"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border-custom bg-bg-card/40 flex items-center justify-between text-[11px] text-text-muted">
            <span className="font-mono">V1.0 - Active Intel</span>
            <span className="flex items-center gap-1 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping"></span>
              Gemini 3.5 Ready
            </span>
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          
          {/* TOP CONTROLLER HEADER */}
          <header className="px-6 py-4 bg-bg-card border-b border-border-custom flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-accent" />
              <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider">
                {state.view === 'dashboard' && "Painel Analítico"}
                {state.view === 'chat' && `Sessão Ativa: ${state.activeSubcategory || "Novo Estudo"}`}
                {state.view === 'favorites' && "Biblioteca de Favoritos"}
                {state.view === 'flashcards' && "Decks de Memorização"}
                {state.view === 'quiz' && "Teste de Avaliação"}
              </h2>
            </div>

            {/* Quick Controls */}
            <div className="flex items-center gap-4">
              
              {/* Font Adjustment */}
              <div className="flex items-center gap-1 border border-border-custom rounded-lg p-1 bg-bg-sidebar">
                <button
                  onClick={() => dispatch({ type: 'SET_FONT_SIZE', payload: 'sm' })}
                  className={`px-2 py-1 text-xs rounded transition-all font-mono ${state.fontSize === 'sm' ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"}`}
                  title="Fonte Pequena"
                >
                  A
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_FONT_SIZE', payload: 'md' })}
                  className={`px-2 py-1 text-xs rounded transition-all font-mono ${state.fontSize === 'md' ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"}`}
                  title="Fonte Média"
                >
                  A+
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_FONT_SIZE', payload: 'lg' })}
                  className={`px-2 py-1 text-xs rounded transition-all font-mono ${state.fontSize === 'lg' ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"}`}
                  title="Fonte Grande"
                >
                  A++
                </button>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' })}
                className="p-2 border border-border-custom rounded-lg hover:bg-bg-sidebar transition-all text-text-muted hover:text-text-primary"
                title="Alternar Tema"
              >
                <span className="text-sm font-mono uppercase">{state.theme === 'light' ? "🌙 Escuro" : "☀️ Claro"}</span>
              </button>
            </div>
          </header>

          {/* VIEW ROUTER CONTAINER */}
          <main className="flex-1 p-6 overflow-y-auto">
            
            {/* 1. DASHBOARD VIEW */}
            {state.view === 'dashboard' && (
              <div className="space-y-6 animate-fade-in no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Metric Card 1 */}
                  <div className="bg-bg-card p-5 rounded-2xl shadow-sm border border-border-custom transition-all">
                    <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Sessões de Estudo</p>
                    <p className="text-2xl font-serif font-bold text-text-primary">{state.progress.totalSessions}</p>
                    <p className="text-[11px] text-text-muted mt-1">Aulas assistidas com IA</p>
                  </div>

                  {/* Metric Card 2 */}
                  <div className="bg-bg-card p-5 rounded-2xl shadow-sm border border-border-custom transition-all">
                    <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Constância Ativa</p>
                    <p className="text-2xl font-serif font-bold text-accent">🔥 {state.progress.streakDays} Dias</p>
                    <p className="text-[11px] text-text-muted mt-1">Sua constância de aprendizado</p>
                  </div>

                  {/* Metric Card 3 */}
                  <div className="bg-bg-card p-5 rounded-2xl shadow-sm border border-border-custom transition-all">
                    <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Metas Acadêmicas</p>
                    <p className="text-2xl font-serif font-bold text-text-primary">
                      {state.studyGoals.filter(g => g.completedMinutes >= g.targetMinutes).length} / {state.studyGoals.length}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">Metas semanais completadas</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart of Category Stats */}
                  <div className="bg-bg-card p-6 rounded-xl border border-border-custom shadow-sm flex flex-col">
                    <h3 className="text-lg font-serif font-bold text-text-primary mb-4 border-b border-border-custom pb-2">Distribuição de Estudos</h3>
                    <div className="flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={state.theme === 'dark' ? "#2E2E30" : "#E5E0D8"} />
                          <XAxis dataKey="name" stroke={state.theme === 'dark' ? "#A0A0A0" : "#6B6B6B"} style={{ fontSize: 11 }} />
                          <YAxis stroke={state.theme === 'dark' ? "#A0A0A0" : "#6B6B6B"} style={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: state.theme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                              borderColor: '#C9A84C',
                              color: state.theme === 'dark' ? '#FAF8F4' : '#1C1C1E'
                            }}
                          />
                          <Bar dataKey="Sessões" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Study Goals and Goals Manager */}
                  <div className="bg-bg-card p-6 rounded-xl border border-border-custom shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-border-custom pb-2">
                      <h3 className="text-lg font-serif font-bold text-text-primary">Metas Acadêmicas</h3>
                      <button
                        onClick={() => setIsGoalModalOpen(true)}
                        className="bg-accent hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Meta
                      </button>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px]">
                      {state.studyGoals.map(goal => {
                        const progressPercent = Math.min(100, Math.round((goal.completedMinutes / goal.targetMinutes) * 100));
                        return (
                          <div key={goal.id} className="p-3 bg-bg-sidebar/50 rounded-lg border border-border-custom">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium truncate pr-4">{goal.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-accent font-semibold">{progressPercent}%</span>
                                <button
                                  onClick={() => dispatch({ type: 'DELETE_GOAL', payload: goal.id })}
                                  className="text-text-muted hover:text-danger p-1 rounded transition-all"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="w-full bg-border-custom h-2 rounded-full overflow-hidden">
                              <div className="bg-accent h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center mt-1.5 text-[10px] text-text-muted font-mono">
                              <span>Minutos: {goal.completedMinutes} / {goal.targetMinutes}</span>
                              {progressPercent >= 100 && <span className="text-success font-semibold flex items-center gap-0.5"><Check className="w-3 h-3" /> Concluída</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent Topics List */}
                <div className="bg-bg-card p-6 rounded-xl border border-border-custom shadow-sm">
                  <h3 className="text-lg font-serif font-bold text-text-primary mb-4 border-b border-border-custom pb-2">Tópicos Estudados Recentemente</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {state.progress.recentTopics.map((topic, i) => (
                      <span key={i} className="px-3 py-1.5 bg-bg-sidebar/80 border border-border-custom rounded-lg text-xs font-medium text-text-primary flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-accent" /> {topic}
                      </span>
                    ))}
                    {state.progress.recentTopics.length === 0 && (
                      <span className="text-sm text-text-muted">Nenhum tópico estudado ainda. Comece enviando uma pergunta para a IA!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. CHAT / ASSISTANT VIEW */}
            {state.view === 'chat' && (
              <div className="h-[calc(100vh-180px)] flex flex-col animate-fade-in bg-bg-card border border-border-custom rounded-xl shadow-sm overflow-hidden">
                
                {/* Mode Selector Header */}
                <div className="p-3 bg-bg-sidebar/60 border-b border-border-custom flex items-center justify-between no-print">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-muted">Modo de Aprendizagem:</span>
                    <div className="flex gap-1">
                      {['aprendizagem', 'mentor', 'estrategico'].map((m) => (
                        <button
                          key={m}
                          onClick={() => triggerToast(`Estudo alterado para modo: ${m.toUpperCase()}`, "info")}
                          className="px-2.5 py-1 text-xs rounded-full font-medium capitalize border border-accent/20 hover:border-accent bg-bg-card text-text-primary transition-all hover:bg-bg-primary"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  {state.messages.length > 0 && (
                    <button
                      onClick={() => dispatch({ type: 'CLEAR_MESSAGES' })}
                      className="text-xs text-text-muted hover:text-danger flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Limpar Aula
                    </button>
                  )}
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  {state.messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto p-4 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent animate-bounce">
                        <Eye className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-text-primary">Inicie sua Universidade Pessoal</h3>
                      <p className="text-sm text-text-muted leading-relaxed">
                        Selecione uma categoria ao lado para preencher um prompt acadêmico otimizado ou faça sua pergunta livremente no campo abaixo.
                      </p>
                    </div>
                  )}

                  {state.messages.slice(0, 15).map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === 'user' ? "items-end" : "items-start"}`}
                    >
                      {/* Signature layout containing card with golden line */}
                      <div className={`max-w-[85%] p-5 shadow-sm border border-border-custom transition-all relative ${
                        msg.role === 'user'
                          ? "bg-bg-sidebar rounded-2xl rounded-tr-none text-text-primary"
                          : "bg-bg-card rounded-2xl rounded-tl-none border-l-[3px] border-l-accent"
                      }`}>
                        
                        {/* Text Render area */}
                        <div className={`markdown-body leading-relaxed ${getFontSizeClass()} text-text-primary`}>
                          {msg.role === 'user' ? <p>{msg.content}</p> : parseMarkdown(msg.content)}
                        </div>

                        {/* Card metadata / action toolbar */}
                        <div className="mt-3 pt-3 border-t border-border-custom/30 flex items-center justify-between text-[11px] font-mono no-print">
                          <span className="text-text-muted">
                            {msg.timestamp} {msg.mode && `• Mode: ${msg.mode}`}
                          </span>
                          {msg.role === 'assistant' && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', payload: msg.id })}
                                className={`flex items-center gap-0.5 p-1 rounded transition-all ${
                                  msg.isFavorite ? "text-amber-500 hover:text-amber-600" : "text-text-muted hover:text-amber-500"
                                }`}
                                title="Favoritar Resumo"
                              >
                                <Star className={`w-3.5 h-3.5 ${msg.isFavorite ? "fill-amber-500" : ""}`} />
                                <span>{msg.isFavorite ? "Favorito" : "Salvar"}</span>
                              </button>
                              <button
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="flex items-center gap-0.5 p-1 text-text-muted hover:text-text-primary rounded transition-all"
                                title="Copiar Texto"
                              >
                                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Copiar</span>
                              </button>
                              <button
                                onClick={() => handleShareMessage(msg.content)}
                                className="flex items-center gap-0.5 p-1 text-text-muted hover:text-text-primary rounded transition-all"
                                title="Compartilhar"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Partilhar</span>
                              </button>
                              <button
                                onClick={handlePrintMessage}
                                className="flex items-center gap-0.5 p-1 text-text-muted hover:text-text-primary rounded transition-all"
                                title="Gerar PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* SKELETON LOADER ANIMATION */}
                  {state.isLoading && (
                    <div className="flex flex-col items-start space-y-2">
                      <div className="max-w-[80%] rounded-xl p-5 bg-bg-card border-l-[3px] border-l-accent space-y-4 w-full">
                        <div className="skeleton h-5 rounded w-1/4"></div>
                        <div className="skeleton h-4 rounded w-3/4"></div>
                        <div className="skeleton h-4 rounded w-5/6"></div>
                        <div className="skeleton h-4 rounded w-1/2"></div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Textarea Bar */}
                <div className="p-4 bg-bg-sidebar/40 border-t border-border-custom no-print">
                  <div className="flex items-end gap-3 max-w-4xl mx-auto bg-bg-card p-2 rounded-xl border border-border-custom shadow-sm">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Diga-me o que quer aprender hoje... (Ex: 'Quero aprender os conceitos de Educação Financeira')"
                      className="flex-1 bg-transparent border-0 outline-none p-2 resize-none h-12 max-h-36 text-sm overflow-y-auto placeholder:text-text-muted/60"
                      disabled={state.isLoading}
                    />

                    <div className="flex items-center gap-1">
                      {/* Voice Record Button */}
                      <button
                        onClick={handleVoiceInput}
                        className={`p-2.5 rounded-lg transition-all ${
                          isRecording ? "bg-danger text-white animate-pulse" : "text-text-muted hover:bg-bg-sidebar"
                        }`}
                        title="Pesquisa por Voz"
                      >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>

                      {/* Main Submit Button */}
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() || state.isLoading}
                        className="bg-accent hover:bg-accent-dark disabled:bg-border-custom disabled:text-text-muted text-white p-2.5 rounded-lg transition-all flex items-center justify-center shadow-md shadow-accent/10"
                        title="Enviar Prompt"
                      >
                        <Play className="w-5 h-5 fill-white text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted/70 px-4 mt-2 max-w-4xl mx-auto">
                    <span>Atalho: Pressione <b>Ctrl + Enter</b> para enviar</span>
                    <span>Modo Offline: Disponível com 5 super-módulos</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. FAVORITES VIEW */}
            {state.view === 'favorites' && (
              <div className="space-y-6 animate-fade-in no-print">
                {/* Search & Filter Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg-card p-4 rounded-xl border border-border-custom shadow-sm">
                  <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={state.searchQuery}
                      onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
                      placeholder="Buscar resumos salvos..."
                      className="w-full pl-9 pr-4 py-2.5 bg-bg-sidebar border border-border-custom rounded-lg outline-none text-sm transition-all focus:border-accent"
                    />
                  </div>
                  <span className="text-xs font-mono text-text-muted">
                    {filteredFavorites.length} resumo(s) encontrado(s)
                  </span>
                </div>

                {/* Favorites List */}
                <div className="space-y-6">
                  {filteredFavorites.map(fav => (
                    <div key={fav.id} className="bg-bg-card rounded-xl p-6 border border-border-custom shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-accent"></div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-mono text-text-muted">Salvo no seu acervo</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', payload: fav.id })}
                            className="text-amber-500 hover:text-text-muted p-1 rounded hover:bg-bg-sidebar transition-all"
                            title="Remover dos Favoritos"
                          >
                            <Star className="w-4 h-4 fill-amber-500" />
                          </button>
                        </div>
                      </div>

                      <div className={`markdown-body leading-relaxed ${getFontSizeClass()} text-text-primary`}>
                        {parseMarkdown(fav.content)}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border-custom/30 flex justify-end gap-2 text-xs font-mono">
                        <button
                          onClick={() => handleCopyMessage(fav.id, fav.content)}
                          className="px-3 py-1.5 border border-border-custom rounded hover:bg-bg-sidebar text-text-muted hover:text-text-primary transition-all flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </button>
                        <button
                          onClick={handlePrintMessage}
                          className="px-3 py-1.5 border border-border-custom rounded hover:bg-bg-sidebar text-text-muted hover:text-text-primary transition-all flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredFavorites.length === 0 && (
                    <div className="text-center py-12 bg-bg-card rounded-xl border border-border-custom">
                      <Bookmark className="w-12 h-12 text-text-muted/40 mx-auto mb-4" />
                      <p className="text-sm text-text-muted">Sua biblioteca está vazia. Estude um tema e clique na estrela para salvar os melhores resumos aqui!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. FLASHCARDS deck view */}
            {state.view === 'flashcards' && state.flashcards.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in no-print">
                <FlashcardDeck flashcards={state.flashcards} />
              </div>
            )}

            {/* 5. QUIZ view */}
            {state.view === 'quiz' && state.quizItems.length > 0 && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in no-print">
                <QuizManager
                  quizItems={state.quizItems}
                  onFinish={(score) => {
                    triggerToast(`Parabéns! Você concluiu o Quiz com pontuação ${score}/5`, "success");
                    dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
                  }}
                />
              </div>
            )}

          </main>
        </div>

        {/* STUDY GOAL MODAL DIALOG */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm no-print">
            <div className="bg-bg-card w-full max-w-md rounded-xl border border-border-custom shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-4">
                <h3 className="text-lg font-serif font-bold text-text-primary flex items-center gap-2">
                  <Award className="text-accent" /> Criar Meta de Estudos
                </h3>
                <button
                  onClick={() => setIsGoalModalOpen(false)}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-sidebar transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddGoalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">Título ou Disciplina</label>
                  <input
                    type="text"
                    required
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="Ex: Estudar Finanças essa semana"
                    className="w-full bg-bg-sidebar border border-border-custom p-3 rounded-lg text-sm outline-none focus:border-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">Minutos Alvo de Estudo</label>
                  <select
                    value={newGoalMinutes}
                    onChange={(e) => setNewGoalMinutes(e.target.value)}
                    className="w-full bg-bg-sidebar border border-border-custom p-3 rounded-lg text-sm outline-none focus:border-accent transition-all"
                  >
                    <option value="30">30 Minutos</option>
                    <option value="60">60 Minutos (1 Hora)</option>
                    <option value="120">120 Minutos (2 Horas)</option>
                    <option value="180">180 Minutos (3 Horas)</option>
                    <option value="300">300 Minutos (5 Horas)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGoalModalOpen(false)}
                    className="px-4 py-2 text-sm text-text-muted hover:text-text-primary rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-all shadow-md shadow-accent/10"
                  >
                    Salvar Meta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}

// ============================================================
// DYNAMIC FLASHCARD DECK SUB-COMPONENT
// ============================================================
const FlashcardDeck = memo(({ flashcards }: { flashcards: Flashcard[] }) => {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeCard = flashcards[index];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  if (!activeCard) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h3 className="text-xl font-serif font-bold text-text-primary">Foco em Fixação Inteligente</h3>
        <span className="text-xs font-mono text-text-muted bg-bg-sidebar px-2.5 py-1 rounded">
          Card {index + 1} de {flashcards.length}
        </span>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-80 perspective-1000 cursor-pointer group"
      >
        <div className={`w-full h-full duration-500 preserve-3d relative ${isFlipped ? "rotate-y-180" : ""}`}>
          
          {/* FRONT OF THE CARD */}
          <div className="absolute inset-0 w-full h-full rounded-xl bg-bg-card border-l-[4px] border-accent border border-border-custom shadow-md backface-hidden p-8 flex flex-col justify-between">
            <div className="text-xs font-mono text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Lightbulb className="w-4 h-4 text-accent animate-pulse" /> Memorização Ativa
            </div>
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-lg md:text-xl font-serif text-center font-bold text-text-primary px-4">
                {activeCard.front}
              </h2>
            </div>
            <div className="text-xs text-center text-text-muted font-mono uppercase">
              Clique para girar e revelar a resposta
            </div>
          </div>

          {/* BACK OF THE CARD */}
          <div className="absolute inset-0 w-full h-full rounded-xl bg-bg-sidebar border border-border-custom shadow-md backface-hidden rotate-y-180 p-8 flex flex-col justify-between">
            <div className="text-xs font-mono text-text-muted uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-accent" /> Conceito Consolidado
            </div>
            <div className="flex-1 flex items-center justify-center overflow-y-auto my-4 pr-1">
              <p className="text-sm md:text-base text-center leading-relaxed text-text-primary">
                {activeCard.back}
              </p>
            </div>
            <div className="text-xs text-center text-text-muted font-mono uppercase">
              Clique no card para voltar à pergunta
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Deck Control Bar */}
      <div className="flex items-center justify-between bg-bg-card p-3 rounded-xl border border-border-custom shadow-sm">
        <button
          onClick={handlePrev}
          className="p-2.5 rounded-lg border border-border-custom hover:bg-bg-sidebar text-text-muted hover:text-text-primary transition-all inline-flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Anterior
        </button>
        <span className="text-xs font-mono text-text-muted">
          Pressione o card para fixar
        </span>
        <button
          onClick={handleNext}
          className="p-2.5 rounded-lg border border-border-custom hover:bg-bg-sidebar text-text-muted hover:text-text-primary transition-all inline-flex items-center gap-1 text-sm font-medium"
        >
          Próximo <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// ============================================================
// QUIZ MANAGER SUB-COMPONENT
// ============================================================
const QuizManager = memo(({ quizItems, onFinish }: { quizItems: QuizItem[]; onFinish: (score: number) => void }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const activeQuestion = quizItems[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedAnswer === null || isAnswered) return;
    setIsAnswered(true);
    if (selectedAnswer === activeQuestion.correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    if (currentIdx < quizItems.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      onFinish(score + (selectedAnswer === activeQuestion.correctAnswerIndex ? 1 : 0));
    }
  };

  if (!activeQuestion) return null;

  return (
    <div className="bg-bg-card p-6 md:p-8 rounded-xl border border-border-custom shadow-md space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h3 className="text-xl font-serif font-bold text-text-primary">Avaliação de Retenção Acadêmica</h3>
        <span className="text-xs font-mono text-text-muted bg-bg-sidebar px-2.5 py-1 rounded">
          Questão {currentIdx + 1} de {quizItems.length}
        </span>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-serif font-semibold text-text-primary leading-relaxed">
          {activeQuestion.question}
        </h4>

        {/* Options List */}
        <div className="space-y-3 pt-2">
          {activeQuestion.options.map((option, idx) => {
            let btnClass = "border border-border-custom bg-bg-card hover:bg-bg-sidebar text-text-primary";
            if (selectedAnswer === idx) {
              btnClass = "border border-accent bg-accent/5 text-accent font-medium";
            }
            if (isAnswered) {
              if (idx === activeQuestion.correctAnswerIndex) {
                btnClass = "border border-success bg-success/10 text-success font-semibold";
              } else if (selectedAnswer === idx) {
                btnClass = "border border-danger bg-danger/10 text-danger font-medium";
              } else {
                btnClass = "border border-border-custom/50 bg-bg-card text-text-muted opacity-60";
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between text-sm leading-relaxed ${btnClass}`}
              >
                <span>{option}</span>
                {isAnswered && idx === activeQuestion.correctAnswerIndex && <Check className="w-5 h-5 text-success flex-shrink-0 ml-2" />}
                {isAnswered && selectedAnswer === idx && idx !== activeQuestion.correctAnswerIndex && <X className="w-5 h-5 text-danger flex-shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Explanation Block */}
      {isAnswered && (
        <div className="p-4 bg-bg-sidebar rounded-xl border border-border-custom text-sm space-y-2 animate-fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-accent">
            <Lightbulb className="w-4 h-4" /> Explicação Didática:
          </div>
          <p className="text-text-muted leading-relaxed">{activeQuestion.explanation}</p>
        </div>
      )}

      {/* Button Controls */}
      <div className="flex justify-end pt-4 border-t border-border-custom">
        {!isAnswered ? (
          <button
            onClick={handleConfirmAnswer}
            disabled={selectedAnswer === null}
            className="px-6 py-2.5 bg-accent hover:bg-accent-dark disabled:bg-border-custom disabled:text-text-muted text-white font-medium rounded-lg text-sm transition-all shadow-md shadow-accent/10"
          >
            Confirmar Resposta
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white font-medium rounded-lg text-sm transition-all flex items-center gap-1.5 shadow-md shadow-accent/10"
          >
            {currentIdx < quizItems.length - 1 ? "Próxima Pergunta" : "Finalizar Avaliação"} <ArrowRight className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </div>
  );
});
