import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Minus,
} from 'lucide-react';
import { askAssistant } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sourceTag?: string;
}

const QUICK_QUESTIONS = [
  'Why is an area classified as Orange (High Risk)?',
  'What does GloFAS river discharge (m³/s) mean?',
  'How is safe route exposure calculated?',
  'What should I do if a road underpass is flooded?',
];

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'assistant',
    text:
      'Welcome to the JalDrishti India AI Assistant. ' +
      'I can help explain flood risks, safe routes, river conditions, shelter locations, and emergency procedures. ' +
      'How can I help you today?',
    sourceTag: 'JalDrishti AI Assistant',
  },
];

function getRuleBasedReply(query: string): { reply: string; sourceTag: string } {
  const lower = query.toLowerCase();

  if (lower.includes('why') && (lower.includes('orange') || lower.includes('high') || lower.includes('risk'))) {
    return {
      reply:
        'An area is categorized as ORANGE (High Risk, 50–74/100) when one or more of these conditions are met:\n' +
        '1. Recent intense rainfall exceeding 35 mm/h or forecast 24h rain exceeding 65 mm.\n' +
        '2. Monitored river levels approaching or exceeding official local warning marks.\n' +
        '3. Multiple credible citizen reports of waterlogged streets and impassable underpasses.\n' +
        '4. An official government warning from IMD or NDMA SACHET. Official warnings always take precedence.',
      sourceTag: 'Explainable Scoring Model (v1)',
    };
  } else if (lower.includes('river') || lower.includes('glofas') || lower.includes('discharge')) {
    return {
      reply:
        'River discharge is the volume of water moving through a river channel per second, measured in cubic meters per second (m³/s).\n' +
        'On JalDrishti India, river flow is obtained from the Open-Meteo Flood API, which runs the Global Flood Awareness System (GloFAS) hydrodynamic model.\n' +
        'CAVEAT: This is a continental model simulation, NOT an official on-site river gauge reading from the Central Water Commission (CWC). Use it as a regional trend indicator.',
      sourceTag: 'Open-Meteo GloFAS Documentation',
    };
  } else if (lower.includes('route') || lower.includes('safe') || lower.includes('exposure')) {
    return {
      reply:
        'Safe route evaluation works in two steps:\n' +
        '1. Candidate driving paths are retrieved from the Open Source Routing Machine (OSRM).\n' +
        '2. Each route is assessed against active road closures, citizen waterlogging reports, and rainfall risk buffers.\n' +
        "Routes with confirmed blockages are penalized or eliminated. The 'Lower Risk' option prioritizes elevated corridors over vulnerable depressions.",
      sourceTag: 'Routing Engine Spec',
    };
  } else if (lower.includes('underpass') || lower.includes('basement')) {
    return {
      reply:
        'SAFETY ADVISORY: Road underpasses, basements, and underground spaces are the most dangerous flood zones during cloudbursts.\n' +
        '• Never drive into an underpass if standing water is visible — water depth is deceptively deep.\n' +
        '• As observed in the July 2024 Delhi coaching basement tragedy, low-lying underground spaces can fill within minutes.\n' +
        '• If trapped in rising water, seek immediate upper-floor shelter and call 112.',
      sourceTag: 'NDMA Urban Flood Safety Protocol',
    };
  } else {
    return {
      reply:
        'JalDrishti India aggregates Open-Meteo rainfall forecasts, GloFAS river discharge, and citizen incident reports. ' +
        "To check a specific location, use the 'Check My Area' feature or click on any district on the Live Flood Map. " +
        'For immediate emergency rescue, always contact the National Emergency Helpline at 112.',
      sourceTag: 'Platform Overview',
    };
  }
}

export const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setHasSpeechSupport(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query) return;

    const userMsg: Message = { role: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      const { reply, source_tag } = await askAssistant(query);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply, sourceTag: source_tag }]);
    } catch {
      const { reply, sourceTag } = getRuleBasedReply(query);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: reply, sourceTag: `${sourceTag} (Gemini unavailable)` },
        ]);
      }, 350);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'auto';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  return (
    <>
      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-4 sm:right-6 z-[9999] w-[360px] sm:w-[400px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-200 ${
            isMinimized ? 'h-[52px]' : 'h-[560px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="bg-[#101820] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#263746] flex items-center justify-center text-[#B79A62]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">AI Flood Intelligence Assistant</div>
                <div className="text-[9px] text-gray-400">JalDrishti India • Gemini-Powered</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized((v) => !v)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message History */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-gray-50">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[88%] p-2.5 rounded-lg leading-relaxed whitespace-pre-line ${
                        m.role === 'user'
                          ? 'bg-[#101820] text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 shadow-xs rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.sourceTag && (
                      <span className="text-[9px] text-gray-500 mt-0.5 px-1">
                        Source: {m.sourceTag}
                      </span>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start">
                    <div className="bg-white border border-gray-200 shadow-xs rounded-lg rounded-bl-none px-3 py-2 text-xs text-gray-500 italic flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Pills */}
              <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[10px] shrink-0">
                <span className="text-gray-600 font-semibold shrink-0">Quick:</span>
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0 transition-colors border border-gray-200 whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Recording indicator */}
              {isRecording && (
                <div className="px-3 py-1 bg-red-50 border-t border-red-100 flex items-center gap-2 text-[10px] text-red-700 font-semibold shrink-0">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Recording… speak now
                </div>
              )}

              {/* Input bar */}
              <div className="p-2.5 bg-white border-t border-gray-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Ask about flood risk, routes, shelters..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#B79A62]"
                  />
                  {hasSpeechSupport && (
                    <button
                      type="button"
                      onClick={handleMic}
                      title={isRecording ? 'Stop recording' : 'Voice input'}
                      className={`p-2 rounded-md transition-all ${
                        isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isTyping}
                    className="p-2 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => { setIsOpen((v) => !v); setIsMinimized(false); }}
        className="fixed bottom-4 right-4 sm:right-6 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#101820] hover:bg-[#263746] text-white shadow-xl border border-[#B79A62]/40 transition-all hover:scale-105 active:scale-95"
        title="AI Assistant"
      >
        <Bot className="w-4 h-4 text-[#B79A62]" />
        <span className="text-xs font-bold tracking-wide">AI Assistant</span>
      </button>
    </>
  );
};
