export interface CorrectionItem {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'phrasing' | 'tense' | 'preposition';
  category?: string;
  confidenceTip?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bani';
  text: string;
  timestamp: number;
  corrections?: CorrectionItem[];
  suggestions?: string[];
  audioUrl?: string;
  isAudioPlaying?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  category: 'career' | 'daily' | 'travel' | 'social' | 'emergency';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  roleUser: string;
  roleBani: string;
  scenarioContext: string;
  starterPrompt: string;
  goals: string[];
  keyVocabulary: { word: string; meaning: string; example: string }[];
  accentHints?: string;
  coverGradient: string;
}

export type VoiceEngine = 'gemini-tts' | 'browser-speech';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface FluencyStats {
  totalMessages: number;
  correctionsCount: number;
  accuracyRate: number;
  vocabLearned: string[];
  activeStreak: number;
  minutesPracticed: number;
}
