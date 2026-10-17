import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Headphones,
  Settings,
  ChevronLeft,
  Flame,
  Info,
  Lightbulb,
  MessageSquare,
  HelpCircle,
  Play,
  Square,
  Languages
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SCENARIOS } from './scenariosData';
import { Scenario, ChatMessage, CorrectionItem, VoiceEngine, VoiceState, FluencyStats } from './types';

// SpeechRecognition type declaration
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function App() {
  // Navigation & Active Scenario
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  // Messages & Conversation State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Voice Interaction State
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('gemini-tts');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const [ttsAutoPlay, setTtsAutoPlay] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [speechUnsupported, setSpeechUnsupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentlySpeakingMsgId, setCurrentlySpeakingMsgId] = useState<string | null>(null);

  // Mistakes & Coaching Drawer
  const [showVocabDrawer, setShowVocabDrawer] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeCorrectionFilter, setActiveCorrectionFilter] = useState<'all' | 'grammar' | 'vocabulary' | 'phrasing'>('all');

  // Fluency & Progress Tracking
  const [stats, setStats] = useState<FluencyStats>(() => {
    const saved = localStorage.getItem('bani_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      totalMessages: 0,
      correctionsCount: 0,
      accuracyRate: 92,
      vocabLearned: ['Spearheaded', 'Actionable takeaways'],
      activeStreak: 3,
      minutesPracticed: 18,
    };
  });

  // Audio References
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const isCallingRef = useRef(false);

  // Sync ref with live call state
  useEffect(() => {
    isCallingRef.current = isLiveCallActive;
  }, [isLiveCallActive]);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('bani_stats', JSON.stringify(stats));
  }, [stats]);

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Stop currently playing audio / synthesis
  const stopAllAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlySpeakingMsgId(null);
    if (voiceState === 'speaking') {
      setVoiceState('idle');
    }
  }, [voiceState]);

  // Play Speech (Gemini TTS with Web Speech API fallback)
  const playSpeech = useCallback(
    async (text: string, messageId?: string) => {
      stopAllAudio();
      setVoiceState('speaking');
      if (messageId) setCurrentlySpeakingMsgId(messageId);

      const onPlaybackDone = () => {
        setVoiceState('idle');
        setCurrentlySpeakingMsgId(null);

        // If in live call mode, automatically listen after BANI finishes speaking!
        if (isCallingRef.current) {
          setTimeout(() => {
            if (isCallingRef.current) {
              startListening();
            }
          }, 400);
        }
      };

      // Strip emojis and formatting for smooth audio pronunciation
      const cleanText = text
        .replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[*_#`~]/g, '')
        .trim();

      if (voiceEngine === 'gemini-tts') {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, voice: 'Kore' }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.audio) {
              const audioBlob = await fetch(`data:audio/wav;base64,${data.audio}`).then((r) => r.blob());
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              audioPlayerRef.current = audio;

              audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                onPlaybackDone();
              };
              audio.onerror = () => {
                // Fallback to browser synthesis if audio element fails
                playWithBrowserSynthesis(cleanText, onPlaybackDone);
              };

              await audio.play();
              return;
            }
          }
        } catch (err) {
          console.warn('Gemini TTS request error, falling back to Web Speech API:', err);
        }
      }

      // Fallback: Web Speech API SpeechSynthesis
      playWithBrowserSynthesis(cleanText, onPlaybackDone);
    },
    [voiceEngine, stopAllAudio]
  );

  // Browser speech synthesis helper
  const playWithBrowserSynthesis = (text: string, onDone: () => void) => {
    if (!('speechSynthesis' in window)) {
      onDone();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower, clear coach cadence
    utterance.pitch = 1.05;

    // Pick best English voice available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes('en-IN') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Natural'))) ||
      voices.find((v) => v.lang.includes('en-GB') || v.lang.includes('en-US')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => onDone();
    utterance.onerror = () => onDone();

    window.speechSynthesis.speak(utterance);
  };

  // Start Speech Recognition (Microphone)
  const startListening = useCallback(() => {
    stopAllAudio();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechUnsupported(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setVoiceState('listening');
        setMicPermissionDenied(false);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(currentInterim);

        if (finalTrans.trim()) {
          setInterimTranscript('');
          handleSendMessage(finalTrans.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setMicPermissionDenied(true);
        }
        setVoiceState('idle');
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setInterimTranscript('');
        if (voiceState === 'listening') {
          setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setVoiceState('idle');
    }
  }, [stopAllAudio, voiceState]);

  // Stop Speech Recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState('idle');
    setInterimTranscript('');
  }, []);

  // Toggle Microphone
  const toggleListening = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  // Toggle Live Call Mode
  const toggleLiveCall = () => {
    if (isLiveCallActive) {
      setIsLiveCallActive(false);
      stopListening();
      stopAllAudio();
    } else {
      setIsLiveCallActive(true);
      startListening();
    }
  };

  // Select a Scenario
  const handleSelectScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    stopAllAudio();
    stopListening();
    setIsLiveCallActive(false);

    // Initial greeting from Coach BANI
    const initialBaniMsg: ChatMessage = {
      id: 'init-' + Date.now(),
      sender: 'bani',
      text: scenario.starterPrompt,
      timestamp: Date.now(),
      suggestions: [
        `Hi BANI! Yes, I would love to practice.`,
        `Hello! Let's get started.`,
        `Could you guide me through this scenario?`
      ],
    };

    setMessages([initialBaniMsg]);
    setSuggestions(initialBaniMsg.suggestions || []);
    scrollToBottom();

    if (ttsAutoPlay) {
      setTimeout(() => {
        playSpeech(scenario.starterPrompt, initialBaniMsg.id);
      }, 500);
    }
  };

  // Send Message & Get Mistake Rectification from Gemini
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending || !activeScenario) return;

    setInputText('');
    setInterimTranscript('');
    setIsSending(true);
    setVoiceState('thinking');

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    scrollToBottom();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          scenario: activeScenario,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.replyText || "Thank you for sharing! Let's continue.";
      const corrections: CorrectionItem[] = (data.corrections || []).map((c: any, idx: number) => ({
        id: `corr-${Date.now()}-${idx}`,
        original: c.original,
        corrected: c.corrected,
        explanation: c.explanation,
        type: c.type || 'grammar',
        confidenceTip: c.confidenceTip,
      }));

      const baniMsg: ChatMessage = {
        id: 'bani-' + Date.now(),
        sender: 'bani',
        text: replyText,
        timestamp: Date.now(),
        corrections,
        suggestions: data.suggestions || [],
      };

      setMessages((prev) => [...prev, baniMsg]);
      setSuggestions(data.suggestions || []);

      // Update fluency statistics
      setStats((prev) => {
        const newTotal = prev.totalMessages + 1;
        const newCorrections = prev.correctionsCount + corrections.length;
        const rawAccuracy = Math.max(50, Math.min(100, Math.round(100 - (newCorrections / (newTotal * 2)) * 100)));
        return {
          ...prev,
          totalMessages: newTotal,
          correctionsCount: newCorrections,
          accuracyRate: rawAccuracy,
          minutesPracticed: prev.minutesPracticed + 1,
        };
      });

      // Celebrate if user spoke error-free!
      if (corrections.length === 0 && text.length > 25) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#10b981', '#f59e0b'],
        });
      }

      scrollToBottom();

      // Play BANI's spoken reply
      if (ttsAutoPlay || isLiveCallActive) {
        playSpeech(replyText, baniMsg.id);
      } else {
        setVoiceState('idle');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: 'error-' + Date.now(),
        sender: 'bani',
        text: "I'm having a brief connection hiccup, but please don't let that stop you! Say that once more and let's keep going.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setVoiceState('idle');
    } finally {
      setIsSending(false);
    }
  };

  // Practice saying a corrected sentence
  const handlePracticeSentence = (correctedText: string) => {
    setInputText(correctedText);
  };

  // Filtered scenarios
  const filteredScenarios = SCENARIOS.filter((s) => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (difficultyFilter !== 'all' && s.level.toLowerCase() !== difficultyFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeScenario && (
              <button
                onClick={() => {
                  stopAllAudio();
                  stopListening();
                  setActiveScenario(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition flex items-center gap-1 text-sm font-medium"
                title="Back to Scenarios"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>All Scenarios</span>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-xl font-bold">
                🗣️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg text-white tracking-tight">Coach BANI</h1>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Live Mentor
                  </span>
                </div>
                <p className="text-xs text-slate-400">Human-like English Speaking & Instant Rectification</p>
              </div>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Practice Streak Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{stats.activeStreak} Day Streak</span>
            </div>

            {/* Accuracy Rate Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>{stats.accuracyRate}% Accuracy</span>
            </div>

            {/* Voice Engine Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setVoiceEngine('gemini-tts')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  voiceEngine === 'gemini-tts'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Google Neural Voice TTS"
              >
                Gemini Voice
              </button>
              <button
                onClick={() => setVoiceEngine('browser-speech')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  voiceEngine === 'browser-speech'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Device Speech Synthesis"
              >
                Device Voice
              </button>
            </div>

            {/* Auto Play Audio Toggle */}
            <button
              onClick={() => {
                setTtsAutoPlay(!ttsAutoPlay);
                if (ttsAutoPlay) stopAllAudio();
              }}
              className={`p-2 rounded-lg border transition ${
                ttsAutoPlay
                  ? 'bg-slate-800 text-indigo-400 border-indigo-500/40'
                  : 'bg-slate-800/50 text-slate-500 border-slate-700'
              }`}
              title={ttsAutoPlay ? 'Auto-play Audio On' : 'Audio Muted'}
            >
              {ttsAutoPlay ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Stats / Goals button */}
            <button
              onClick={() => setShowStatsModal(true)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Progress & Learning Stats"
            >
              <Award className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      {speechUnsupported && (
        <div className="bg-amber-950/70 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between z-40 backdrop-blur">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Speech Recognition is not natively supported by this browser. You can still type messages and hear Coach BANI speak, or switch to Chrome/Edge for voice input.</span>
          </div>
          <button
            onClick={() => setSpeechUnsupported(false)}
            className="text-amber-300 hover:text-white ml-4 font-bold px-2 py-0.5 rounded hover:bg-amber-800/40"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {!activeScenario ? (
          /* ============================================================ */
          /* SCENARIO CATALOG & SELECTION SCREEN                         */
          /* ============================================================ */
          <div className="flex-1 flex flex-col space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/20 p-6 sm:p-8">
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Real-Time Voice & Mistake Rectification</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                  Talk with Coach BANI like a human friend.
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  Pick any real-life scenario below. BANI roleplays with you naturally using realistic voice. Whenever you make grammatical, tense, or phrasing slip-ups, BANI kindly rectifies them on the spot so you gain authentic speaking confidence!
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleSelectScenario(SCENARIOS[0])}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center gap-2 text-sm"
                  >
                    <span>Start Quick Scenario (Interview)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSelectScenario(SCENARIOS.find((s) => s.id === 'free-talk') || SCENARIOS[0])}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 transition flex items-center gap-2 text-sm"
                  >
                    <span>Free Talk (Anything)</span>
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
              </div>

              {/* Decorative Background Blob */}
              <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-20 top-0 w-60 h-60 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Scenarios' },
                  { id: 'career', label: '💼 Career & Office' },
                  { id: 'daily', label: '☕ Daily Life' },
                  { id: 'travel', label: '✈️ Travel & Hotels' },
                  { id: 'social', label: '🍕 Social & Friends' },
                  { id: 'emergency', label: '🩺 Medical' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                      categoryFilter === cat.id
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Level:</span>
                {['all', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficultyFilter(lvl)}
                    className={`px-2.5 py-1 rounded-md transition ${
                      difficultyFilter.toLowerCase() === lvl.toLowerCase()
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Scenarios Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => handleSelectScenario(scenario)}
                  className="group relative cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  {/* Top Header Card */}
                  <div className={`p-5 bg-gradient-to-br ${scenario.coverGradient} border-b border-slate-800/60`}>
                    <div className="flex items-start justify-between">
                      <span className="text-3xl p-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-inner">
                        {scenario.emoji}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          scenario.level === 'Beginner'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : scenario.level === 'Intermediate'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                        }`}
                      >
                        {scenario.level}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mt-3 group-hover:text-indigo-300 transition">
                      {scenario.title}
                    </h3>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {scenario.scenarioContext}
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                        <span>Your Role:</span>
                        <span className="text-slate-200 font-medium">{scenario.roleUser}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>BANI Role:</span>
                        <span className="text-indigo-400 font-medium">{scenario.roleBani}</span>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-300 transition flex items-center gap-1">
                        <span>Start Speaking</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                      </span>
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition flex items-center justify-center">
                        <Mic className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* ACTIVE SCENARIO & CONVERSATION ROOM SCREEN                  */
          /* ============================================================ */
          <div className="flex-1 flex flex-col lg:flex-row gap-5 max-h-[calc(100vh-6rem)]">
            {/* Left/Middle Column: Interactive Chat & Live Call Interface */}
            <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
              {/* Scenario Stage Header Bar */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700">
                    {activeScenario.emoji}
                  </span>
                  <div>
                    <h2 className="font-bold text-white text-sm sm:text-base">{activeScenario.title}</h2>
                    <p className="text-xs text-slate-400">
                      Talking to: <span className="text-indigo-400 font-medium">{activeScenario.roleBani}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Live Call Toggle Button */}
                  <button
                    onClick={toggleLiveCall}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-lg ${
                      isLiveCallActive
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                    }`}
                  >
                    {isLiveCallActive ? (
                      <>
                        <PhoneOff className="w-4 h-4" />
                        <span>End Voice Call</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        <span>Live Voice Call</span>
                      </>
                    )}
                  </button>

                  {/* Reset Conversation */}
                  <button
                    onClick={() => handleSelectScenario(activeScenario)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                    title="Restart Scenario"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Toggle Vocab / Goals Drawer on Mobile */}
                  <button
                    onClick={() => setShowVocabDrawer(!showVocabDrawer)}
                    className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="Scenario Goals & Vocab"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Voice Call Status Ribbon (when active) */}
              {isLiveCallActive && (
                <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-semibold text-emerald-300">
                      Live Voice Call Active • Speak naturally, BANI listens & responds!
                    </span>
                  </div>

                  {voiceState === 'speaking' && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                      <span className="wave-bar w-1 bg-indigo-400 rounded-full" />
                      <span className="wave-bar w-1 bg-indigo-400 rounded-full" style={{ animationDelay: '0.2s' }} />
                      <span className="wave-bar w-1 bg-indigo-400 rounded-full" style={{ animationDelay: '0.4s' }} />
                      <span className="font-medium ml-1">BANI speaking...</span>
                    </div>
                  )}

                  {voiceState === 'listening' && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-medium">Listening to you...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Messages Chat Scroll Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const isBaniSpeaking = currentlySpeakingMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
                    >
                      <div className="flex items-start gap-2 max-w-[90%] sm:max-w-[80%]">
                        {!isUser && (
                          <div className="relative shrink-0 mt-1">
                            <div
                              className={`w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-sm shadow font-bold ${
                                isBaniSpeaking ? 'ring-2 ring-indigo-400 animate-pulse' : ''
                              }`}
                            >
                              🗣️
                            </div>
                            {isBaniSpeaking && (
                              <div className="absolute -inset-1 rounded-xl bg-indigo-500/30 animate-pulse-ring -z-10" />
                            )}
                          </div>
                        )}

                        <div className="flex flex-col">
                          {/* Bubble Container */}
                          <div
                            className={`p-4 rounded-2xl text-sm sm:text-base leading-relaxed ${
                              isUser
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                                : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/80 shadow'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>

                          {/* Message Actions (Listen button for BANI) */}
                          {!isUser && (
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                              <button
                                onClick={() => {
                                  if (isBaniSpeaking) {
                                    stopAllAudio();
                                  } else {
                                    playSpeech(msg.text, msg.id);
                                  }
                                }}
                                className="flex items-center gap-1 hover:text-indigo-300 transition py-0.5 px-2 rounded-md hover:bg-slate-800"
                              >
                                {isBaniSpeaking ? (
                                  <>
                                    <Square className="w-3 h-3 text-rose-400 fill-rose-400" />
                                    <span className="text-rose-400">Stop Voice</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Listen</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Mistake Rectification Cards (if any) */}
                          {msg.corrections && msg.corrections.length > 0 && (
                            <div className="mt-3 space-y-2.5 max-w-xl">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Coach BANI's Instant Mistake Rectification</span>
                              </div>

                              {msg.corrections.map((corr) => (
                                <div
                                  key={corr.id}
                                  className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/30 shadow-inner flex flex-col space-y-2"
                                >
                                  {/* Original vs Corrected side-by-side */}
                                  <div className="space-y-1.5 text-xs sm:text-sm">
                                    <div className="flex items-start gap-2">
                                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        You said:
                                      </span>
                                      <span className="line-through text-rose-300 font-mono text-xs">
                                        "{corr.original}"
                                      </span>
                                    </div>

                                    <div className="flex items-start gap-2">
                                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Better way:
                                      </span>
                                      <span className="text-emerald-300 font-semibold font-mono text-xs">
                                        "{corr.corrected}"
                                      </span>
                                    </div>
                                  </div>

                                  {/* Explanation rule */}
                                  <div className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-2">
                                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="font-medium text-slate-200">{corr.explanation}</p>
                                      {corr.confidenceTip && (
                                        <p className="text-slate-400 text-[11px] mt-1">
                                          💡 Tip: {corr.confidenceTip}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action: Practice repeating the corrected sentence */}
                                  <div className="flex items-center justify-between pt-1">
                                    <button
                                      onClick={() => playSpeech(corr.corrected)}
                                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                                    >
                                      <Play className="w-3 h-3 fill-indigo-400" />
                                      <span>Hear pronunciation</span>
                                    </button>

                                    <button
                                      onClick={() => handlePracticeSentence(corr.corrected)}
                                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 font-medium transition"
                                    >
                                      Practice saying this
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {isUser && (
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold text-slate-300 shrink-0 mt-1">
                            You
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Live Speech Recognition Interim Transcript Display */}
                {interimTranscript && (
                  <div className="flex items-start gap-2 max-w-[80%] self-end">
                    <div className="p-3.5 rounded-2xl rounded-tr-none bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-sm italic">
                      <div className="flex items-center gap-2 mb-1 text-xs text-indigo-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        <span>Transcribing speech in real-time...</span>
                      </div>
                      "{interimTranscript}"
                    </div>
                  </div>
                )}

                {/* BANI Thinking indicator */}
                {isSending && (
                  <div className="flex items-center gap-3 text-slate-400 text-xs py-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-bold">
                      🗣️
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                      <span className="text-xs text-slate-300 ml-1">BANI is analyzing & formulating coaching response...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Response Suggestions Bar */}
              {suggestions.length > 0 && !isSending && (
                <div className="px-4 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-xs text-slate-500 shrink-0 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Suggestions:</span>
                  </span>
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(sug)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    >
                      "{sug}"
                    </button>
                  ))}
                </div>
              )}

              {/* Mic Permission Denied Banner */}
              {micPermissionDenied && (
                <div className="p-3 bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Microphone access was blocked. Please grant mic permissions in your browser address bar to speak, or type below!</span>
                  </div>
                  <button
                    onClick={() => setMicPermissionDenied(false)}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Bottom Input & Voice Control Bar */}
              <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Microphone Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`relative p-3 rounded-xl transition flex items-center justify-center shrink-0 ${
                      voiceState === 'listening'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                    }`}
                    title={voiceState === 'listening' ? 'Click to stop listening' : 'Click to speak with microphone'}
                  >
                    {voiceState === 'listening' ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                    {voiceState === 'listening' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-400 rounded-full animate-ping" />
                    )}
                  </button>

                  {/* Text Input Field */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        voiceState === 'listening'
                          ? 'Listening to your voice... Speak now!'
                          : 'Talk with Coach BANI or type your sentence here...'
                      }
                      disabled={isSending}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-3 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-800 rounded-xl transition shrink-0"
                    title="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Scenario Goals, Learning Panel & Key Vocabulary */}
            <div
              className={`lg:w-80 shrink-0 bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col space-y-6 ${
                showVocabDrawer ? 'block' : 'hidden lg:flex'
              }`}
            >
              {/* Header Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Scenario Guide & Vocab</h3>
                </div>
                <button
                  onClick={() => setShowVocabDrawer(false)}
                  className="lg:hidden p-1 text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Scenario Goals Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target Objectives
                </h4>
                <div className="space-y-2">
                  {activeScenario.goals.map((goal, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{goal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Vocabulary Shelf */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Power Vocabulary to Use
                </h4>
                <div className="space-y-3">
                  {activeScenario.keyVocabulary.map((vocab, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300 text-xs sm:text-sm">{vocab.word}</span>
                        <button
                          onClick={() => playSpeech(vocab.word)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                          title="Listen to pronunciation"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">{vocab.meaning}</p>
                      <p className="text-[11px] text-slate-300 italic bg-slate-900 p-1.5 rounded border border-slate-800/60">
                        "{vocab.example}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Fluency Snapshot */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mistakes Rectified:</span>
                  <span className="font-bold text-rose-400">{stats.correctionsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Statements:</span>
                  <span className="font-bold text-slate-200">{stats.totalMessages}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Stats & Progress Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-white">Your Speaking Progress</h3>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-3xl font-extrabold text-indigo-400">{stats.accuracyRate}%</div>
                <div className="text-xs text-slate-400 mt-1">Accuracy Score</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-3xl font-extrabold text-amber-400">{stats.activeStreak}</div>
                <div className="text-xs text-slate-400 mt-1">Day Streak 🔥</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-3xl font-extrabold text-emerald-400">{stats.totalMessages}</div>
                <div className="text-xs text-slate-400 mt-1">Sentences Spoken</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-3xl font-extrabold text-rose-400">{stats.correctionsCount}</div>
                <div className="text-xs text-slate-400 mt-1">Errors Rectified</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-slate-200">Coach BANI's Advice:</p>
              <p className="text-slate-400 leading-relaxed">
                "Keep practicing out loud! Speaking every day for just 10 minutes creates muscle memory and eliminates hesitation. Every rectified mistake is a permanent step forward."
              </p>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition text-sm"
            >
              Continue Practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
