import { useEffect, useState, useRef } from 'react';
import { modelsApi, chatApi } from '../services/api';
import type { LLMModel, ChatMessage, ChatResponse } from '../types';
import {
  Send,
  Trash2,
  Settings,
  Bot,
  User,
  Sparkles,
  Zap,
  Clock,
  Coins,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  HelpCircle,
  Copy,
  Check,
  Cpu
} from 'lucide-react';

const STARTER_PROMPTS = [
  {
    title: 'Explain SOLID Principles',
    prompt: 'Explain the SOLID principles in software engineering with a short and clear example for each.',
    icon: HelpCircle,
  },
  {
    title: 'Python Helper Function',
    prompt: 'Write a Python function to find the second largest unique value in a list of integers.',
    icon: Bot,
  },
  {
    title: 'Giải thích câu tục ngữ',
    prompt: 'Giải thích ý nghĩa câu tục ngữ: "Có công mài sắt, có ngày nên kim" và rút ra bài học thực tiễn.',
    icon: Sparkles,
  }
];

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-surface-600 bg-surface-900 font-mono text-xs">
      <div className="flex justify-between items-center px-4 py-2 bg-surface-800 border-b border-surface-700 text-surface-400">
        <span className="uppercase text-[10px] font-bold tracking-wider text-slate-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default function Chat() {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);

  // Settings State
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Stats State of the current/last request
  const [currentStats, setCurrentStats] = useState<ChatResponse | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch models on component mount
  useEffect(() => {
    modelsApi.list()
      .then(data => {
        const activeOnes = data.filter(m => m.is_active);
        setModels(activeOnes);
        if (activeOnes.length > 0) {
          setActiveModelId(activeOnes[0].id);
        }
      })
      .catch(err => console.error('Error fetching models:', err))
      .finally(() => setPageLoading(false));
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !activeModelId || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setLoading(true);
    setCurrentStats(null);

    // Prepare message payload including system prompt if set
    const payload: ChatMessage[] = [];
    if (systemPrompt.trim()) {
      payload.push({ role: 'system', content: systemPrompt });
    }
    payload.push(...updatedMessages);

    try {
      const response = await chatApi.sendMessage(
        activeModelId,
        payload,
        temperature,
        maxTokens
      );

      const assistantMsg: ChatMessage = { role: 'assistant', content: response.text };
      setMessages(prev => [...prev, assistantMsg]);
      setCurrentStats(response);
    } catch (err: any) {
      console.error('Failed to chat:', err);
      const errMsg = err.response?.data?.detail || 'An error occurred while calling the LLM API.';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `ERROR: ${errMsg}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStarterPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const handleClearChat = () => {
    if (window.confirm('Clear all conversation history?')) {
      setMessages([]);
      setCurrentStats(null);
    }
  };

  const activeModel = models.find(m => m.id === activeModelId);

  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : '';
        const code = match ? match[2] : part.slice(3, -3);
        return <CodeBlock key={index} code={code.trim()} language={language} />;
      }

      // Process inline code and newlines
      const subParts = part.split(/(`[^`]+`)/g);
      return (
        <div key={index} className="whitespace-pre-wrap wrap-break-word leading-relaxed">
          {subParts.map((subPart, subIndex) => {
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return (
                <code
                  key={subIndex}
                  className="px-1.5 py-0.5 rounded bg-surface-900 border border-surface-600 text-accent-400 font-mono text-[0.8125rem]"
                >
                  {subPart.slice(1, -1)}
                </code>
              );
            }
            return subPart;
          })}
        </div>
      );
    });
  };

  if (pageLoading) {
    return (
      <div className="empty-state flex flex-col justify-center items-center min-h-[50vh]">
        <div className="text-lg text-slate-400">Loading chat workspace...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center mb-4">
        <div>
          <h1>Chat Workspace</h1>
          <p>Interact and experiment with your configured models in real-time</p>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center p-8 flex-1">
          <Bot size={48} className="text-surface-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No active models</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            You need at least one active model configuration to use the chat workspace.
            Please configure and activate models in the Models tab.
          </p>
          <a href="/models" className="btn btn-primary">
            Go to Models Configuration
          </a>
        </div>
      ) : (
        <div className="flex flex-col flex-1 bg-linear-to-b from-surface-800 to-surface-700 border border-surface-600 rounded-2xl shadow-card overflow-hidden">
          {/* Chat Controller Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-surface-600 bg-surface-800">
            {/* Left: Model Selector */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Cpu size={16} className="text-primary-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Model:</span>
              <select
                className="input py-1.5 px-3 max-w-[280px]"
                style={{ height: '36px', minWidth: '180px' }}
                value={activeModelId}
                onChange={e => {
                  setActiveModelId(e.target.value);
                  setCurrentStats(null);
                }}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Right: Action Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`btn btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs ${showSettings ? 'border-primary-500 bg-surface-600 text-white' : ''}`}
                style={{ height: '36px' }}
                title="Advanced Parameters"
              >
                <Settings size={14} className={showSettings ? 'text-primary-400 animate-spin-slow' : ''} />
                <span>Parameters</span>
                {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="btn btn-danger py-1.5 px-3 flex items-center gap-1.5 text-xs"
                  style={{ height: '36px' }}
                  title="Clear conversation"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Settings Drawer */}
          {showSettings && (
            <div className="p-4 bg-surface-800/80 border-b border-surface-600 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              {/* Temperature Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                  <span>Temperature</span>
                  <span className="font-mono text-primary-400 font-bold">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.2"
                  step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-primary-500 bg-surface-600 h-1 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Lower value is more deterministic; higher is more creative.
                </span>
              </div>

              {/* Max Tokens Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                  <span>Max Outputs</span>
                  <span className="font-mono text-primary-400 font-bold">{maxTokens} tokens</span>
                </div>
                <input
                  type="range"
                  min="128"
                  max="4096"
                  step="128"
                  value={maxTokens}
                  onChange={e => setMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-primary-500 bg-surface-600 h-1 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Maximum length of the generated response text.
                </span>
              </div>

              {/* System Instructions */}
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <span className="text-xs font-medium text-slate-400">System Instructions</span>
                <textarea
                  className="input text-xs py-1.5 min-h-[44px]"
                  placeholder="e.g. You are a precise coding expert. Speak concisely..."
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Quick Info Bar for last response stats */}
          {currentStats && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 bg-surface-900 border-b border-surface-600/50 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Zap size={11} className="text-accent-400" />
                Provider: <span className="font-semibold text-slate-300 capitalize">{currentStats.provider}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-amber-400" />
                Latency: <span className="font-mono font-semibold text-slate-300">{currentStats.latency_ms}ms</span>
              </span>
              <span className="flex items-center gap-1">
                <Coins size={11} className="text-emerald-400" />
                Tokens: <span className="font-mono text-slate-300">
                  {currentStats.input_tokens} In / {currentStats.output_tokens} Out (Total: {currentStats.input_tokens + currentStats.output_tokens})
                </span>
              </span>
              {activeModel && (activeModel.input_price_per_1m_tokens != null || activeModel.output_price_per_1m_tokens != null) && (
                <span className="text-slate-500 font-mono">
                  Est. Cost: $
                  {((
                    (currentStats.input_tokens * (activeModel.input_price_per_1m_tokens ?? 0)) +
                    (currentStats.output_tokens * (activeModel.output_price_per_1m_tokens ?? 0))
                  ) / 1000000).toFixed(6)}
                </span>
              )}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-surface-900/30">
            {messages.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full text-center max-w-lg mx-auto py-12">
                <Bot size={48} className="text-primary-500/40 mb-4 animate-bounce" />
                <h2 className="text-lg font-bold text-slate-200 mb-1">
                  Start Chatting with {activeModel?.display_name || 'Model'}
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  Select a model, adjust options, and type a query. The model will run directly using local providers or fall back to mock templates.
                </p>

                {/* Starter Prompts Grid */}
                <div className="grid grid-cols-1 gap-3 w-full">
                  {STARTER_PROMPTS.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleStarterPrompt(starter.prompt)}
                      className="card p-3 flex items-start gap-3 text-left hover:scale-[1.01] transition-transform text-xs"
                      style={{ background: 'var(--color-surface-800)' }}
                    >
                      <div className="p-1.5 rounded-lg bg-primary-900/40 text-primary-400">
                        <starter.icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-200 mb-0.5">{starter.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{starter.prompt}</div>
                      </div>
                      <ChevronRight size={12} className="text-slate-500 self-center" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-sm ${
                          isUser
                            ? 'bg-linear-to-br from-primary-600 to-primary-500'
                            : 'bg-surface-600 border border-surface-500'
                        }`}
                      >
                        {isUser ? <User size={14} /> : <Bot size={14} className="text-accent-400" />}
                      </div>

                      {/* Content bubble */}
                      <div className="flex flex-col gap-1">
                        <div
                          className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                            isUser
                              ? 'bg-linear-to-br from-primary-600 to-primary-500 text-white rounded-tr-none'
                              : 'bg-surface-700 text-slate-150 border border-surface-600 rounded-tl-none'
                          }`}
                        >
                          {renderMessageContent(msg.content)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading state indicator */}
                {loading && (
                  <div className="flex gap-3 max-w-[85%] mr-auto">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-surface-600 border border-surface-500">
                      <Bot size={14} className="text-accent-400 animate-pulse" />
                    </div>
                    <div className="bg-surface-700 text-slate-100 border border-surface-600 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input Bar */}
          <div className="p-4 bg-surface-800 border-t border-surface-600">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex gap-2"
            >
              <input
                className="input flex-1"
                placeholder={
                  activeModel
                    ? `Message ${activeModel.display_name}...`
                    : 'Select a model and type a message...'
                }
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                disabled={loading || !activeModelId}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !inputText.trim() || !activeModelId}
                style={{ padding: '0 1.25rem', height: '42px' }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
