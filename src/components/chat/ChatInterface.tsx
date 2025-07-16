
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
  Mic
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatSidebar } from "./ChatSidebar";
import { 
  saveMessage, 
  createChatSession, 
  subscribeToMessages,
  ChatMessage 
} from "@/services/firebaseService";

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        const sessionId = await createChatSession(user.uid, 'การสนทนาใหม่');
        setCurrentSessionId(sessionId);
        
        // Add welcome message
        const welcomeMessage = {
          type: 'ai' as const,
          content: `สวัสดี ${user.name}! ฉันคือ AI Assistant ฉันพร้อมที่จะช่วยเหลือคุณ คุณสามารถถามคำถามหรือส่งรูปภาพมาให้ฉันวิเคราะห์ได้เลย`,
          timestamp: Date.now(),
          userId: user.uid
        };
        
        await saveMessage(user.uid, sessionId, welcomeMessage);
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
  }, [user.uid, user.name]);

  // Subscribe to messages for current session
  useEffect(() => {
    if (!currentSessionId) return;

    const unsubscribe = subscribeToMessages(user.uid, currentSessionId, (newMessages) => {
      setMessages(newMessages);
    });

    return unsubscribe;
  }, [currentSessionId, user.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        title: "เกินขด จำกัด",
        description: `คุณใช้งานครบ ${RATE_LIMIT} ครั้งแล้วในชั่วโมงนี้ กรุณารอ 1 ชั่วโมงแล้วลองใหม่`,
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

      // Save user message to Firebase
      const userMessage = {
        type: 'user' as const,
        content: inputMessage || "รูปภาพที่ส่งมา",
        timestamp: Date.now(),
        imageUrl: imagePreview || undefined,
        userId: user.uid
      };

      await saveMessage(user.uid, currentSessionId, userMessage);

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
        
        await saveMessage(user.uid, currentSessionId, aiMessage);
        updateUsageCount();
      } else {
        throw new Error('No response from AI');
      }

    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setInputMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
      const sessionId = await createChatSession(user.uid, 'การสนทนาใหม่');
      setCurrentSessionId(sessionId);
      setSidebarOpen(false);
    } catch (error) {
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

  const remainingQuestions = RATE_LIMIT - questionsUsed;

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
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
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant</h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <Avatar className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 shrink-0">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="w-5 h-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[70%] ${message.type === 'user' ? 'order-first' : ''}`}>
                  <Card className={`p-4 ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white border-0' 
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}>
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt="Uploaded"
                        className="max-w-full max-h-64 rounded-lg mb-3 object-contain"
                      />
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </Card>
                  <p className={`text-xs mt-2 px-1 ${
                    message.type === 'user' ? 'text-right text-gray-500' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('th-TH')}
                  </p>
                </div>

                {message.type === 'user' && (
                  <Avatar className="w-8 h-8 bg-blue-600 shrink-0">
                    <AvatarFallback className="bg-transparent">
                      <User className="w-5 h-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <Avatar className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="w-5 h-5 text-white" />
                  </AvatarFallback>
                </Avatar>
                <Card className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">กำลังคิด...</span>
                  </div>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            {remainingQuestions <= 0 && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <span className="text-orange-700 dark:text-orange-300 text-sm">
                  คุณได้ใช้งานครบ {RATE_LIMIT} ครั้งแล้ว กรุณารอ 1 ชั่วโมงแล้วลองใหม่
                </span>
              </div>
            )}
            
            {imagePreview && (
              <div className="mb-4 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-32 max-h-32 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
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
            
            <div className="flex gap-3 items-end">
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
                className="shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="พิมพ์ข้อความของคุณที่นี่..."
                  className="pr-12 py-3 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                  disabled={isLoading || remainingQuestions <= 0}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!inputMessage.trim() && !selectedImage) || isLoading || remainingQuestions <= 0}
                  size="icon"
                  className="absolute right-1 top-1 bottom-1 w-10 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
