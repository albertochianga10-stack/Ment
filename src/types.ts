export type StudyView = 'dashboard' | 'chat' | 'favorites' | 'history' | 'flashcards' | 'quiz';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isFavorite: boolean;
  mode?: 'aprendizagem' | 'mentor' | 'estrategico';
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: string; // ISO String
  messages: Message[];
  category?: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizItem {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StudyGoal {
  id: string;
  title: string;
  targetMinutes: number;
  completedMinutes: number;
}

export interface StudyProgress {
  totalSessions: number;
  streakDays: number;
  lastStudiedDate: string; // YYYY-MM-DD
  categoryStats: { [key: string]: number }; // category -> sessionCount
  recentTopics: string[];
}

export interface AppState {
  view: StudyView;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  favorites: Message[];
  theme: 'light' | 'dark';
  fontSize: 'sm' | 'md' | 'lg';
  activeCategory: string | null;
  activeSubcategory: string | null;
  studyGoals: StudyGoal[];
  progress: StudyProgress;
  flashcards: Flashcard[];
  quizItems: QuizItem[];
  conversations: Conversation[];
  activeConversationId: string | null;
}

export type AppAction =
  | { type: 'SET_VIEW'; payload: StudyView }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_FONT_SIZE'; payload: 'sm' | 'md' | 'lg' }
  | { type: 'SET_CATEGORY'; payload: { category: string | null; subcategory: string | null } }
  | { type: 'ADD_GOAL'; payload: StudyGoal }
  | { type: 'UPDATE_GOAL'; payload: { id: string; minutes: number } }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'RECORD_SESSION'; payload: { category: string; topic: string } }
  | { type: 'SET_FLASHCARDS'; payload: Flashcard[] }
  | { type: 'SET_QUIZ_ITEMS'; payload: QuizItem[] }
  | { type: 'LOAD_CONVERSATION'; payload: Conversation }
  | { type: 'CREATE_CONVERSATION'; payload: Conversation }
  | { type: 'DELETE_CONVERSATION'; payload: string }
  | { type: 'CLEAR_MESSAGES' };
