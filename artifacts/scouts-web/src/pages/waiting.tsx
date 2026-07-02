import { Clock, UserCheck, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import logoImg from "@/assets/scoutPic/avatars-logo.jpg";

export default function Waiting() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"pending" | "approved" | "denied" | "loading">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Get email from localStorage if available
    const storedEmail = localStorage.getItem("pendingUserEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      checkStatus(storedEmail);
    } else {
      setStatus("pending");
    }
  }, []);

  const checkStatus = async (userEmail: string) => {
    try {
      setStatus("loading");
      const response = await fetch("/api/users/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === "approved") {
          setStatus("approved");
        } else if (data.status === "denied") {
          setStatus("denied");
        } else {
          setStatus("pending");
        }
      } else {
        setStatus("pending");
      }
    } catch (error) {
      console.error("Error checking status:", error);
      setStatus("pending");
    }
  };

  const handleCheckStatus = () => {
    if (email) {
      checkStatus(email);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20 mx-auto mb-4">
            <img
              src={logoImg}
              alt="Saint George Scouts"
              className="w-full h-full object-cover"
            />
          </div>
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking your request status...</p>
        </div>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-20">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-green-500 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-green-500/20 mb-6">
            <img
              src={logoImg}
              alt="Saint George Scouts"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Request Accepted!</h1>
          <h2 className="text-lg font-semibold text-green-600 mb-6" dir="rtl">تم قبول طلبك!</h2>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 w-full">
            <p className="text-sm text-green-800 mb-2">
              Your request to join has been accepted and you can now login to your account.
            </p>
            <p className="text-sm text-green-800" dir="rtl">
              تم قبول طلب انضمامك ويمكنك الآن تسجيل الدخول إلى حسابك.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/login")}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            Login Now / سجل الدخول الآن
          </Button>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-20">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-red-500 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500 blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-red-500/20 mb-6">
            <img
              src={logoImg}
              alt="Saint George Scouts"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Request Denied</h1>
          <h2 className="text-lg font-semibold text-red-600 mb-6" dir="rtl">تم رفض طلبك</h2>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 w-full">
            <p className="text-sm text-red-800 mb-2">
              Your request to join has been denied. Please contact an admin for more information.
            </p>
            <p className="text-sm text-red-800" dir="rtl">
              تم رفض طلب انضمامك. يرجى التواصل مع المشرف للحصول على مزيد من المعلومات.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/login")}
            variant="outline"
            className="w-full"
          >
            Back to Login / العودة إلى تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-secondary blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-xl p-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20 mb-6">
          <img
            src={logoImg}
            alt="Saint George Scouts"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Account Pending Approval</h1>
        <h2 className="text-lg font-semibold text-secondary mb-6" dir="rtl">حسابك في انتظار الموافقة</h2>

        <div className="bg-muted/50 border border-border rounded-lg p-6 mb-6 w-full">
          <div className="flex items-start gap-3 mb-4">
            <UserCheck className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground mb-1">What happens next?</p>
              <p className="text-sm text-muted-foreground">
                Your account has been created and is currently pending approval from an admin. 
                You will be able to login once your request is approved.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground mb-1">ماذا يحدث بعد ذلك؟</p>
              <p className="text-sm text-muted-foreground" dir="rtl">
                تم إنشاء حسابك وهو حالياً في انتظار موافقة المشرف. 
                ستتمكن من تسجيل الدخول بمجرد الموافقة على طلبك.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <Button
            onClick={handleCheckStatus}
            variant="outline"
            className="w-full"
          >
            Check Status / تحقق من الحالة
          </Button>
          
          <Button
            onClick={() => setLocation("/login")}
            variant="outline"
            className="w-full"
          >
            Try Logging In Again / محاولة تسجيل الدخول مرة أخرى
          </Button>
          
          <Button
            onClick={() => setLocation("/login")}
            variant="ghost"
            className="w-full"
          >
            Back to Login / العودة إلى تسجيل الدخول
          </Button>
        </div>
      </div>
    </div>
  );
}