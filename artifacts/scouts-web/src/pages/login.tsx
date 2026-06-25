import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Tent } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-secondary blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-xl p-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <Tent className="w-10 h-10" />
        </div>
        
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">San George Scouts</h1>
        <h2 className="text-xl font-semibold text-secondary mb-8" dir="rtl">كشافة مار جرجس هليوبوليس</h2>
        
        <p className="text-muted-foreground mb-8 text-sm max-w-sm">
          Welcome to our community portal. Please log in to view announcements, attendance, and connect with your scout group.
        </p>

        <Button 
          onClick={login} 
          size="lg" 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md h-12"
        >
          تسجيل الدخول / Log In
        </Button>
      </div>
    </div>
  );
}
