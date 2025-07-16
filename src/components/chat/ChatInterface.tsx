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
  MessageSquare,
  Clock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface User {
  name: string;
  email: string;
  uid: string;
}

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

const RATE_LIMIT = 14; // 14 คำถามต่อชั่วโมง
const API_KEY = "e62d60dd-8853-4233-bbcb-9466b4cbc265";

export function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `สวัสดี ${user.name}! ฉันคือ AI Assistant ฉันพร้อมที่จะช่วยเหลือคุณ คุณสามารถถามคำถามหรือส่งรูปภาพมาให้ฉันวิเคราะห์ได้เลย`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  
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
      // Fallback: สร้าง URL ชั่วคราวสำหรับการทดสอบ
      return URL.createObjectURL(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
    
    if (questionsUsed >= RATE_LIMIT) {
      toast({
        title: "เกินขด จำกัด",
        description: `คุณใช้งานครบ ${RATE_LIMIT} ครั้งแล้วในชั่วโมงนี้ กรุณารอ 1 ชั่วโมงแล้วลองใหม่`,
        variant: "destructive"
      });
      return;
    }

    const messageId = Date.now().toString();
    let imageUrl = "";

    try {
      setIsLoading(true);

      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImageToImgur(selectedImage);
      }

      // Add user message
      const userMessage: Message = {
        id: messageId,
        type: 'user',
        content: inputMessage || "รูปภาพที่ส่งมา",
        timestamp: new Date(),
        imageUrl: imagePreview || undefined
      };

      setMessages(prev => [...prev, userMessage]);

      // Call API
      const apiUrl = `https://kaiz-apis.gleeze.com/api/gemini-vision?q=${encodeURIComponent(inputMessage || "อธิบายรูปนี้")}&uid=${user.uid}&imageUrl=${encodeURIComponent(imageUrl)}&apikey=${API_KEY}`;
      
      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.response) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: result.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
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

  const remainingQuestions = RATE_LIMIT - questionsUsed;

  return (
    <div className="h-screen flex flex-col bg-chat-background">
      {/* Header */}
      <div className="border-b border-gray-700 bg-chat-sidebar px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-white font-semibold">AI Assistant</h1>
              <p className="text-gray-400 text-sm">ยินดีต้อนรับ {user.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className={`${remainingQuestions <= 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                เหลือ {remainingQuestions}/{RATE_LIMIT}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-gray-400 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <Avatar className="w-8 h-8 bg-primary">
                  <AvatarFallback>
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <Card className={`max-w-[70%] p-4 ${
                message.type === 'user' 
                  ? 'bg-chat-message-user text-white' 
                  : 'bg-chat-message-ai text-gray-900'
              }`}>
                {message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="Uploaded"
                    className="max-w-full max-h-64 rounded-lg mb-2 object-contain"
                  />
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-2 opacity-70`}>
                  {message.timestamp.toLocaleTimeString('th-TH')}
                </p>
              </Card>

              {message.type === 'user' && (
                <Avatar className="w-8 h-8 bg-gray-600">
                  <AvatarFallback>
                    <User className="w-4 h-4 text-white" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 bg-primary">
                <AvatarFallback>
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-chat-message-ai p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                  <span className="text-gray-600 ml-2">กำลังคิด...</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-700 bg-chat-sidebar p-4">
        <div className="max-w-4xl mx-auto">
          {remainingQuestions <= 0 && (
            <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-200 text-sm">
                คุณได้ใช้งานครบ {RATE_LIMIT} ครั้งแล้ว กรุณารอ 1 ชั่วโมงแล้วลองใหม่
              </span>
            </div>
          )}
          
          {imagePreview && (
            <div className="mb-4 relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-32 max-h-32 rounded-lg object-cover border border-gray-600"
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
          
          <div className="flex gap-2">
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            
            <Button
              variant="chat"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || remainingQuestions <= 0}
            >
              <Image className="w-4 h-4" />
            </Button>
            
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="พิมพ์ข้อความหรือส่งรูปภาพ..."
              className="flex-1 bg-chat-input border-gray-600 text-white placeholder:text-gray-400"
              disabled={isLoading || remainingQuestions <= 0}
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={(!inputMessage.trim() && !selectedImage) || isLoading || remainingQuestions <= 0}
              variant="gradient"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}