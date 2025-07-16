
import { database } from '@/lib/firebase';
import { ref, push, set, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';

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
}

export const saveMessage = async (userId: string, sessionId: string, message: Omit<ChatMessage, 'id'>) => {
  try {
    const messagesRef = ref(database, `chats/${userId}/${sessionId}/messages`);
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
      ...message,
      id: newMessageRef.key
    });
    
    // Update session timestamp
    const sessionRef = ref(database, `chats/${userId}/${sessionId}/updatedAt`);
    await set(sessionRef, Date.now());
    
    return newMessageRef.key;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

export const createChatSession = async (userId: string, title: string = 'New Chat') => {
  try {
    const sessionsRef = ref(database, `chats/${userId}`);
    const newSessionRef = push(sessionsRef);
    const sessionData = {
      id: newSessionRef.key,
      title,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: {}
    };
    
    await set(newSessionRef, sessionData);
    return newSessionRef.key;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

export const subscribeToMessages = (userId: string, sessionId: string, callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = ref(database, `chats/${userId}/${sessionId}/messages`);
  const messagesQuery = query(messagesRef, orderByChild('timestamp'));
  
  const unsubscribe = onValue(messagesQuery, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      messages.push(childSnapshot.val());
    });
    callback(messages);
  });
  
  return () => off(messagesRef, 'value', unsubscribe);
};

export const subscribeToChatSessions = (userId: string, callback: (sessions: ChatSession[]) => void) => {
  const sessionsRef = ref(database, `chats/${userId}`);
  const sessionsQuery = query(sessionsRef, orderByChild('updatedAt'), limitToLast(50));
  
  const unsubscribe = onValue(sessionsQuery, (snapshot) => {
    const sessions: ChatSession[] = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      if (data.title) { // Only include session metadata, not individual messages
        sessions.push({
          id: childSnapshot.key!,
          title: data.title,
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    });
    sessions.reverse(); // Show newest first
    callback(sessions);
  });
  
  return () => off(sessionsRef, 'value', unsubscribe);
};
