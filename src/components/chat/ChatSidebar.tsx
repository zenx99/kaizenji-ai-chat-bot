
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Menu,
  X
} from "lucide-react";
import { ChatSession, subscribeToChatSessions } from "@/services/firebaseService";

interface ChatSidebarProps {
  userId: string;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({ 
  userId, 
  currentSessionId, 
  onSelectSession, 
  onNewChat,
  isOpen,
  onToggle 
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToChatSessions(userId, setSessions);
    return unsubscribe;
  }, [userId]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'เมื่อสักครู่';
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffHours < 48) return 'เมื่อวาน';
    return date.toLocaleDateString('th-TH');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:relative top-0 left-0 h-full bg-gray-900 border-r border-gray-700 
        transition-transform duration-300 z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-80 flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold">AI Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="text-gray-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <Button
            onClick={onNewChat}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            แชทใหม่
          </Button>
        </div>

        {/* Chat Sessions */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`
                  group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                  ${currentSessionId === session.id 
                    ? 'bg-gray-800 border border-gray-600' 
                    : 'hover:bg-gray-800/50'
                  }
                `}
              >
                <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate font-medium">
                    {session.title}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {formatDate(session.updatedAt)}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-gray-400 hover:text-white"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            
            {sessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">ยังไม่มีการสนทนา</p>
                <p className="text-xs">เริ่มแชทใหม่เพื่อเริ่มต้นใช้งาน</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
