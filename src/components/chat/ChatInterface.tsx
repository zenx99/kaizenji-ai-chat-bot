
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Image, 
  User, 
  Bot, 
  LogOut, 
  Clock,
  AlertCircle,
  Menu,
  Paperclip,
  Mic,
  Plus,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatSidebar } from "./ChatSidebar";
import { 
  saveMessage, 
  createChatSession, 
  subscribeToMessages,
  ChatMessage 
} from "@/services/firebaseService";
import {
  saveMessageLocally,
  createLocalChatSession,
  getLocalMessages,
  ChatMessage as LocalChatMessage
} from "@/services/localStorageService";

interface User {
  name: string;
  email: string;
  uid: string;
}

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

const RATE_LIMIT = 14;
const API_KEY = "e62d60dd-8853-4233-bbcb-9466b4cbc265";

export function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load usage from localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const savedUsage = localStorage.getItem(`usage_${today}`);
    if (savedUsage) {
      setQuestionsUsed(parseInt(savedUsage));
    }
  }, []);

  // Create initial chat session
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Try Firebase first
        const sessionId = await createChatSession(user.uid, 'การสนทนาใหม่');
        setCurrentSessionId(sessionId);
        setUseLocalStorage(false);
        
        // Add welcome message
        const welcomeMessage = {
          type: 'ai' as const,
          content: `สวัสดี ${user.name}! ฉันคือ AI Assistant ฉันพร้อมที่จะช่วยเหลือคุณ คุณสามารถถามคำถามหรือส่งรูปภาพมาให้ฉันวิเคราะห์ได้เลย`,
          timestamp: Date.now(),
          userId: user.uid
        };
        
        await saveMessage(user.uid, sessionId, welcomeMessage);
      } catch (error) {
        console.error('Firebase failed, using local storage:', error);
        // Fallback to local storage
        try {
          const sessionId = createLocalChatSession(user.uid, 'การสนทนาใหม่');
          setCurrentSessionId(sessionId);
          setUseLocalStorage(true);
          
          // Add welcome message to local storage
          const welcomeMessage = {
            type: 'ai' as const,
            content: `สวัสดี ${user.name}! ฉันคือ AI Assistant ฉันพร้อมที่จะช่วยเหลือคุณ คุณสามารถถามคำถามหรือส่งรูปภาพมาให้ฉันวิเคราะห์ได้เลย`,
            timestamp: Date.now(),
            userId: user.uid
          };
          
          saveMessageLocally(user.uid, sessionId, welcomeMessage);
          
          // Load messages from local storage
          const localMessages = getLocalMessages(user.uid, sessionId);
          setMessages(localMessages);
        } catch (localError) {
          console.error('Local storage also failed:', localError);
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถเริ่มต้นแชทได้",
            variant: "destructive"
          });
        }
      }
    };

    initializeChat();
  }, [user.uid, user.name, toast]);

  // Subscribe to messages for current session (only for Firebase)
  useEffect(() => {
    if (!currentSessionId || useLocalStorage) return;

    const unsubscribe = subscribeToMessages(user.uid, currentSessionId, (newMessages) => {
      setMessages(newMessages);
    });

    return unsubscribe;
  }, [currentSessionId, user.uid, useLocalStorage]);

  // Load local messages when using local storage
  useEffect(() => {
    if (useLocalStorage && currentSessionId) {
      const localMessages = getLocalMessages(user.uid, currentSessionId);
      setMessages(localMessages);
    }
  }, [useLocalStorage, currentSessionId, user.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input on desktop
  useEffect(() => {
    if (window.innerWidth > 768) {
      inputRef.current?.focus();
    }
  }, []);

  const updateUsageCount = () => {
    const today = new Date().toDateString();
    const newCount = questionsUsed + 1;
    setQuestionsUsed(newCount);
    localStorage.setItem(`usage_${today}`, newCount.toString());
  };

  const uploadImageToImgur = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: 'Client-ID 546c25a59c58ad7'
        },
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        return result.data.link;
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      return URL.createObjectURL(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "ไฟล์ใหญ่เกินไป",
          description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;
    if (!currentSessionId) return;
    
    if (questionsUsed >= RATE_LIMIT) {
      toast({
        title: "เกินขีดจำกัด",
        description: `คุณใช้งานครบ ${RATE_LIMIT} ครั้งแล้วในวันนี้ กรุณารอ 1 วันแล้วลองใหม่`,
        variant: "destructive"
      });
      return;
    }

    let imageUrl = "";

    try {
      setIsLoading(true);

      if (selectedImage) {
        imageUrl = await uploadImageToImgur(selectedImage);
      }

      // Save user message
      const userMessage = {
        type: 'user' as const,
        content: inputMessage || "รูปภาพที่ส่งมา",
        timestamp: Date.now(),
        imageUrl: imagePreview || undefined,
        userId: user.uid
      };

      if (useLocalStorage) {
        saveMessageLocally(user.uid, currentSessionId, userMessage);
        const updatedMessages = getLocalMessages(user.uid, currentSessionId);
        setMessages(updatedMessages);
      } else {
        await saveMessage(user.uid, currentSessionId, userMessage);
      }

      // Clear input immediately for better UX
      setInputMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Call API
      const apiUrl = `https://kaiz-apis.gleeze.com/api/gemini-vision?q=${encodeURIComponent(inputMessage || "อธิบายรูปนี้")}&uid=${user.uid}&imageUrl=${encodeURIComponent(imageUrl)}&apikey=${API_KEY}`;
      
      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.response) {
        const aiMessage = {
          type: 'ai' as const,
          content: result.response,
          timestamp: Date.now(),
          userId: user.uid
        };
        
        if (useLocalStorage) {
          saveMessageLocally(user.uid, currentSessionId, aiMessage);
          const updatedMessages = getLocalMessages(user.uid, currentSessionId);
          setMessages(updatedMessages);
        } else {
          await saveMessage(user.uid, currentSessionId, aiMessage);
        }
        
        updateUsageCount();
      } else {
        throw new Error('No response from AI');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = async () => {
    try {
      let sessionId;
      if (useLocalStorage) {
        sessionId = createLocalChatSession(user.uid, 'การสนทนาใหม่');
      } else {
        sessionId = await createChatSession(user.uid, 'การสนทนาใหม่');
      }
      setCurrentSessionId(sessionId);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างแชทใหม่ได้",
        variant: "destructive"
      });
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSidebarOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "คัดลอกแล้ว",
      description: "ข้อความถูกคัดลอกไปยังคลิปบอร์ดแล้ว",
    });
  };

  const remainingQuestions = RATE_LIMIT - questionsUsed;

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900 overflow-hidden">
      <ChatSidebar
        userId={user.uid}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 shrink-0"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">AI Assistant</h1>
                  {useLocalStorage && (
                    <p className="text-xs text-orange-500">โหมดออฟไลน์</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span className={`${remainingQuestions <= 3 ? 'text-orange-500' : ''}`}>
                  {remainingQuestions}/{RATE_LIMIT}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            </div>
          </div>
          
          {/* Mobile Usage Counter */}
          <div className="sm:hidden mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span className={`${remainingQuestions <= 3 ? 'text-orange-500' : ''}`}>
              เหลือ {remainingQuestions}/{RATE_LIMIT} ครั้ง
            </span>
          </div>
        </div>

        {/* Messages - ChatGPT Style */}
        <ScrollArea className="flex-1 bg-gray-50 dark:bg-gray-900">
          <div className="w-full">
            {messages.length === 0 && !isLoading && (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    ยินดีต้อนรับสู่ AI Assistant
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    เริ่มการสนทนาใหม่ด้วยการพิมพ์ข้อความหรือส่งรูปภาพ
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`w-full border-b border-gray-100 dark:border-gray-800 ${
                  message.type === 'ai' ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'
                }`}
              >
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {message.type === 'ai' ? (
                        <div className="w-8 h-8 rounded-sm bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-sm bg-purple-600 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="group">
                        {message.imageUrl && (
                          <div className="mb-3">
                            <img
                              src={message.imageUrl}
                              alt="Uploaded"
                              className="max-w-full max-h-64 rounded-lg object-contain border border-gray-200 dark:border-gray-700"
                            />
                          </div>
                        )}
                        
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap leading-relaxed text-gray-900 dark:text-gray-100 mb-0">
                            {message.content}
                          </p>
                        </div>
                        
                        {/* Message Actions - Only for AI messages */}
                        {message.type === 'ai' && (
                          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading State */}
            {isLoading && (
              <div className="w-full bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-sm bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 text-sm">กำลังคิด...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="max-w-3xl mx-auto">
            {remainingQuestions <= 0 && (
              <div className="mb-3 sm:mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <span className="text-orange-700 dark:text-orange-300 text-sm">
                  คุณได้ใช้งานครบ {RATE_LIMIT} ครั้งแล้ว กรุณารอ 1 วันแล้วลองใหม่
                </span>
              </div>
            )}
            
            {imagePreview && (
              <div className="mb-3 sm:mb-4 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-24 max-h-24 sm:max-w-32 sm:max-h-32 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  ×
                </Button>
              </div>
            )}
            
            <div className="flex gap-2 sm:gap-3 items-end">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || remainingQuestions <= 0}
                className="shrink-0 w-10 h-10 sm:w-12 sm:h-12"
              >
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="ส่งข้อความไปยัง AI Assistant..."
                  className="pr-12 sm:pr-14 py-3 sm:py-4 text-base bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded-xl resize-none min-h-[44px] sm:min-h-[52px]"
                  disabled={isLoading || remainingQuestions <= 0}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!inputMessage.trim() && !selectedImage) || isLoading || remainingQuestions <= 0}
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 rounded-lg"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-gray-900" />
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center px-2">
              AI อาจมีข้อผิดพลาด กรุณาตรวจสอบข้อมูลสำคัญ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
