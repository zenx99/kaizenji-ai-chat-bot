
export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
  imageUrl?: string;
  userId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export const saveMessageLocally = (userId: string, sessionId: string, message: Omit<ChatMessage, 'id'>) => {
  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageWithId = { ...message, id: messageId };
    
    // Get existing sessions
    const sessions = getLocalSessions(userId);
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex >= 0) {
      sessions[sessionIndex].messages.push(messageWithId);
      sessions[sessionIndex].updatedAt = Date.now();
    } else {
      // Create new session if it doesn't exist
      const newSession: ChatSession = {
        id: sessionId,
        title: 'การสนทนาใหม่',
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [messageWithId]
      };
      sessions.push(newSession);
    }
    
    localStorage.setItem(`chat_sessions_${userId}`, JSON.stringify(sessions));
    return messageId;
  } catch (error) {
    console.error('Error saving message locally:', error);
    throw error;
  }
};

export const createLocalChatSession = (userId: string, title: string = 'การสนทนาใหม่') => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id: sessionId,
      title,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    
    const sessions = getLocalSessions(userId);
    sessions.push(newSession);
    localStorage.setItem(`chat_sessions_${userId}`, JSON.stringify(sessions));
    
    return sessionId;
  } catch (error) {
    console.error('Error creating local chat session:', error);
    throw error;
  }
};

export const getLocalSessions = (userId: string): ChatSession[] => {
  try {
    const sessionsData = localStorage.getItem(`chat_sessions_${userId}`);
    return sessionsData ? JSON.parse(sessionsData) : [];
  } catch (error) {
    console.error('Error getting local sessions:', error);
    return [];
  }
};

export const getLocalMessages = (userId: string, sessionId: string): ChatMessage[] => {
  try {
    const sessions = getLocalSessions(userId);
    const session = sessions.find(s => s.id === sessionId);
    return session ? session.messages : [];
  } catch (error) {
    console.error('Error getting local messages:', error);
    return [];
  }
};
