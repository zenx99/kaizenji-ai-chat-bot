import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Mail, Lock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthFormProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onAuthSuccess: (user: { name: string; email: string; uid: string }) => void;
}

export function AuthForm({ mode, onModeChange, onAuthSuccess }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ในการใช้งานจริง ควรเชื่อมต่อกับ API Backend
      // ตอนนี้จำลองการล็อกอินสำเร็จ
      if (mode === 'login') {
        if (formData.email && formData.password) {
          const user = {
            name: formData.name || formData.email.split('@')[0],
            email: formData.email,
            uid: Math.random().toString(36).substr(2, 9)
          };
          localStorage.setItem('user', JSON.stringify(user));
          onAuthSuccess(user);
          toast({
            title: "เข้าสู่ระบบสำเร็จ",
            description: `ยินดีต้อนรับ ${user.name}`,
          });
        } else {
          throw new Error('กรุณากรอกข้อมูลให้ครบ');
        }
      } else {
        if (formData.name && formData.email && formData.password) {
          const user = {
            name: formData.name,
            email: formData.email,
            uid: Math.random().toString(36).substr(2, 9)
          };
          localStorage.setItem('user', JSON.stringify(user));
          onAuthSuccess(user);
          toast({
            title: "สมัครสมาชิกสำเร็จ",
            description: `ยินดีต้อนรับ ${user.name}`,
          });
        } else {
          throw new Error('กรุณากรอกข้อมูลให้ครบ');
        }
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'ไม่สามารถดำเนินการได้',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-primary to-primary-hover">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
            {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </CardTitle>
          <CardDescription className="text-base">
            {mode === 'login' 
              ? 'เข้าสู่ระบบเพื่อใช้งาน AI Assistant' 
              : 'สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน AI Assistant'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  ชื่อผู้ใช้
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="กรอกชื่อของคุณ"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11"
                  required={mode === 'register'}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                อีเมล
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="h-11"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                รหัสผ่าน
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรอกรหัสผ่าน"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="h-11 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11" 
              variant="gradient"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  กำลังดำเนินการ...
                </div>
              ) : (
                mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}
              <Button
                type="button"
                variant="link"
                className="pl-2 text-primary font-medium"
                onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}