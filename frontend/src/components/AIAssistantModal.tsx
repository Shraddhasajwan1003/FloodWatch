import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  X,
  Send,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Compass,
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sourceTag?: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: (
        "Welcome to the FloodWatch India Decision-Support Assistant. " +
        "I can help explain why an area has an elevated risk score, what river discharge readings mean, " +
        "how route flood exposure is evaluated, and which official sources provide alerts. " +
        "How can I help you today?"
      ),
      sourceTag: 'Rule-based Platform Guide',
    },
  ]);

  if (!isOpen) return null;

  const quickQuestions = [
    'Why is an area classified as Orange (High Risk)?',
    'What does GloFAS river discharge (m³/s) mean?',
    'How is safe route exposure calculated?',
    'What should I do if a road underpass is flooded?',
  ];

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = { role: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Rule-based deterministic explainability engine (no fabricated hallucinated answers)
    let reply = '';
    let sourceTag = 'Decision-Support Rules';
    const lower = query.toLowerCase();

    if (lower.includes('why') && (lower.includes('orange') || lower.includes('high') || lower.includes('risk'))) {
      reply = (
        "An area is categorized as ORANGE (High Risk, 50–74/100) when one or more of these conditions are met:\n" +
        "1. Recent intense rainfall exceeding 35 mm/h or forecast 24h rain exceeding 65 mm.\n" +
        "2. Monitored river levels approaching or exceeding official local warning marks.\n" +
        "3. Multiple credible citizen reports of waterlogged streets and impassable underpasses.\n" +
        "4. An official government warning from IMD or NDMA SACHET. Official warnings always take precedence and cannot be lowered by internal scores."
      );
      sourceTag = 'Explainable Scoring Model (v1)';
    } else if (lower.includes('river') || lower.includes('glofas') || lower.includes('discharge')) {
      reply = (
        "River discharge is the volume of water moving through a river channel per second, measured in cubic meters per second (m³/s).\n" +
        "On FloodWatch India, river flow is obtained from the Open-Meteo Flood API, which runs the Global Flood Awareness System (GloFAS) hydrodynamic model.\n" +
        "CAVEAT: This is a continental model simulation, NOT an official on-site river gauge reading from the Central Water Commission (CWC). Use it as a regional trend indicator."
      );
      sourceTag = 'Open-Meteo GloFAS Documentation';
    } else if (lower.includes('route') || lower.includes('safe') || lower.includes('exposure')) {
      reply = (
        "Safe route evaluation works in two steps:\n" +
        "1. Candidate driving paths are retrieved from the Open Source Routing Machine (OSRM).\n" +
        "2. Each route is assessed against active road closures, citizen waterlogging reports, and rainfall risk buffers.\n" +
        "Routes with confirmed blockages are penalized or eliminated. The 'Lower Risk' option prioritizes elevated corridors over vulnerable depressions."
      );
      sourceTag = 'Routing Engine Spec';
    } else if (lower.includes('underpass') || lower.includes('basement')) {
      reply = (
        "SAFETY ADVISORY: Road underpasses, basements, and underground spaces are the most dangerous flood zones during cloudbursts.\n" +
        "• Never drive into an underpass if standing water is visible — water depth is deceptively deep.\n" +
        "• As observed in the July 2024 Delhi coaching basement tragedy, low-lying underground spaces can fill within minutes.\n" +
        "• If trapped in rising water, seek immediate upper-floor shelter and call 112."
      );
      sourceTag = 'NDMA Urban Flood Safety Protocol';
    } else {
      reply = (
        "FloodWatch India aggregates Open-Meteo rainfall forecasts, GloFAS river discharge, and citizen incident reports. " +
        "To check a specific location, use the 'Check My Area' feature or click on any district on the Live Flood Map. " +
        "For immediate emergency rescue, always contact the National Emergency Helpline at 112."
      );
      sourceTag = 'Platform Overview';
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
          sourceTag,
        },
      ]);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl h-[560px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#101820] text-white p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#263746] flex items-center justify-center text-[#B79A62]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">AI Flood Intelligence Assistant</div>
              <div className="text-[10px] text-gray-400">Explainable Decision Support • Data-Grounded</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-gray-50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-[#101820] text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-xs rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
              {m.sourceTag && (
                <span className="text-[10px] text-gray-700 mt-1 px-1">
                  Provenance: {m.sourceTag}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-gray-700 font-semibold shrink-0">Common queries:</span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0 transition-colors border border-gray-200"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="p-3 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask why risk is high, how routes work, or what river data means..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-md border border-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#B79A62]"
            />
            <button
              type="submit"
              className="p-2.5 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] font-bold transition-all shadow-xs"
            >
              <Send className="w-4 h-4 text-[#101820]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
