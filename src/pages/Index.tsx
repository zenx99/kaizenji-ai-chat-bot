import { useState, useEffect } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { ChatInterface } from "@/components/chat/ChatInterface";

interface User {
  name: string;
  email: string;
  uid: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    // Reset daily usage on logout
    const today = new Date().toDateString();
    localStorage.removeItem(`usage_${today}`);
  };

  if (user) {
    return <ChatInterface user={user} onLogout={handleLogout} />;
  }

  return (
    <AuthForm 
      mode={authMode} 
      onModeChange={setAuthMode}
      onAuthSuccess={handleAuthSuccess}
    />
  );
};

export default Index;
