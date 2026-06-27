import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tent } from "lucide-react";

export default function Login() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!name || !phone || !team) {
      setError("Please fill in name, phone, and team.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, team }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error || "Failed to submit request.");
      }

      setStatus("Your access request was sent. An admin will approve or deny it.");
      setName("");
      setPhone("");
      setTeam("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
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

        <p className="text-muted-foreground mb-6 text-sm max-w-sm">
          إذا لم يكن لديك حساب بعد، قدم طلب انضمام وسيراجع المشرف بياناتك.
        </p>

        <div className="w-full border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground mb-3">Request access / طلب انضمام</p>
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2 text-left">
              <label className="block text-sm font-medium text-foreground">Full name / الاسم</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. John Smith"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-sm font-medium text-foreground">Phone / رقم الهاتف</label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. +201234567890"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-sm font-medium text-foreground">Team / الفوج</label>
              <Input
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                placeholder="e.g. Echo Scouts"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {status && <p className="text-sm text-success">{status}</p>}

            <Button
              type="submit"
              size="lg"
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-md h-12"
              disabled={isSubmitting}
            >
              Send Request / إرسال الطلب
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
