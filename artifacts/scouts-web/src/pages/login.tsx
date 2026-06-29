import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tent, Upload, X } from "lucide-react";
import { useLocation } from "wouter";
import { useRequestUploadUrl } from "@workspace/api-client-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"request" | "login">("request");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [section, setSection] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [isNewScout, setIsNewScout] = useState<boolean | null>(null);
  const [nationalId, setNationalId] = useState("");
  const [parentsWhatsappNumber, setParentsWhatsappNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [patrol, setPatrol] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [parentNationalIdPhoto, setParentNationalIdPhoto] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadUrlMutation = useRequestUploadUrl();

  const sections = ["سنافر", "اشبال", "زهرات", "كشافة", "مرشدات"];
  const teams = ["A", "B"];
  const patrols = ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"];

  const handleParentNationalIdSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file (JPG, PNG, etc.)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      setParentNationalIdPhoto(file);
      setError(null);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      // Validate file type (only images)
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file (JPG, PNG, etc.)");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Photo size must be less than 5MB");
        return;
      }
      setSelectedPhoto(file);
      setError(null);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const urlResult = await new Promise<{ uploadURL: string; objectPath: string }>((resolve, reject) => {
        uploadUrlMutation.mutate(
          { data: { name: file.name, size: file.size, contentType: file.type } },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      if (urlResult.uploadURL.includes('local-upload')) {
        await fetch(urlResult.uploadURL, {
          method: "PUT",
          body: file,
        });
      } else {
        await fetch(urlResult.uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      }

      return urlResult.objectPath;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (mode === "request") {
      if (!name || !email || !password || !phone || !section || isNewScout === null) {
        setError("Please fill in all fields.");
        return;
      }
      if (!isNewScout && !team) {
        setError("Please fill in all fields.");
        return;
      }
      
      // Validate three-part name
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length < 3) {
        setError("Please enter your full three-part name (e.g., youssef miro soshi). First name only is not accepted.");
        return;
      }
      
      // Validate new scout fields
      if (isNewScout) {
        if (!nationalId || !parentsWhatsappNumber || !homeAddress || !selectedPhoto || !parentNationalIdPhoto) {
          setError("Please fill in all new scout fields including photo.");
          return;
        }
        if (!/^\d{14}$/.test(nationalId)) {
          setError("الرقم القومي must be exactly 14 digits");
          return;
        }
      }
      
      // Validate existing scout fields
      if (!isNewScout && !patrol) {
        setError("Please select your patrol.");
        return;
      }
    } else {
      if (!loginEmail || !password) {
        setError("Please fill in email/phone and password.");
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      if (mode === "login") {
        // Handle login mode
        const loginResponse = await fetch("/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password }),
          credentials: "include",
        });

        if (loginResponse.ok) {
          const loginResult = await loginResponse.json();
          setStatus("Login successful! Redirecting...");
          setTimeout(() => {
            if (loginResult.isAdmin) {
              window.location.href = "/admin";
            } else {
              window.location.href = "/";
            }
          }, 1000);
          return;
        }

        const loginError = await loginResponse.json().catch(() => ({}));
        
        // Check if user is pending approval
        if (loginError.status === "pending") {
          setError(loginError.error || "Your account is pending approval.");
          setTimeout(() => {
            setLocation("/waiting");
          }, 2000);
          return;
        }
        
        throw new Error(loginError.error || "Login failed. Please check your credentials.");
      } else {
        // Upload files first if it's a new scout
        let uploadedPhotoUrl: string | null = null;
        let uploadedParentNationalIdUrl: string | null = null;
        if (isNewScout) {
          if (selectedPhoto) {
            uploadedPhotoUrl = await uploadFile(selectedPhoto);
            if (!uploadedPhotoUrl) {
              setError("Failed to upload photo. Please try again.");
              setIsSubmitting(false);
              return;
            }
          }
          if (parentNationalIdPhoto) {
            uploadedParentNationalIdUrl = await uploadFile(parentNationalIdPhoto);
            if (!uploadedParentNationalIdUrl) {
              setError("Failed to upload parent national ID. Please try again.");
              setIsSubmitting(false);
              return;
            }
          }
        }

        // Handle request mode
        const response = await fetch("/api/access-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name, 
            email, 
            password, 
            phone, 
            section, 
            team: isNewScout ? undefined : team, 
            isNewScout,
            nationalId: isNewScout ? nationalId : undefined,
            parentsWhatsappNumber: isNewScout ? parentsWhatsappNumber : undefined,
            homeAddress: isNewScout ? homeAddress : undefined,
            photoUrl: isNewScout ? uploadedPhotoUrl : undefined,
            parentNationalIdPhotoUrl: isNewScout ? uploadedParentNationalIdUrl : undefined,
            patrol: patrol
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.error || "Failed to submit request.");
        }

        const result = await response.json();
        setStatus("Your access request was sent. An admin will approve or deny it.");
        
        // Store email in localStorage for waiting page status check
        localStorage.setItem("pendingUserEmail", email);
        
        // Clear form and redirect to waiting page
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
        setSection("");
        setTeam("");
        setIsNewScout(null);
        setNationalId("");
        setParentsWhatsappNumber("");
        setHomeAddress("");
        setPatrol("");
        setSelectedPhoto(null);
        setParentNationalIdPhoto(null);
        
        setTimeout(() => {
          setLocation("/waiting");
        }, 1500);
      }
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

      <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-xl p-6 sm:p-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <Tent className="w-10 h-10" />
        </div>

        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">San George Scouts</h1>
        <h2 className="text-xl font-semibold text-secondary mb-8" dir="rtl">كشافة مار جرجس هليوبوليس</h2>

        <p className="text-muted-foreground mb-6 text-sm max-w-sm">
          إذا لم يكن لديك حساب بعد، قدم طلب انضمام وسيراجع المشرف بياناتك.
        </p>

        <div className="w-full border-t border-border pt-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setMode("request");
                setPassword("");
                setLoginEmail("");
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === "request" 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Request Access / طلب انضمام
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setPassword("");
                setLoginEmail("");
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === "login" 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Login / تسجيل الدخول
            </button>
          </div>
          
          {mode === "request" && (
            <p className="text-sm text-muted-foreground mb-4">
              Submit your information to request access to the platform.
            </p>
          )}
          
          {mode === "login" && (
            <p className="text-sm text-muted-foreground mb-4">
              Login if you already have an approved account.
            </p>
          )}
          
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            {mode === "request" && (
              <>
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Are you new to Scouting? / هل أنت جديد في الكشافة؟</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNewScout(true)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isNewScout === true 
                          ? "bg-secondary text-secondary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Yes, this is my first time / نعم، هذه أول مرة
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewScout(false)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isNewScout === false 
                          ? "bg-secondary text-secondary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      No, I'm a scout / لا، أنا كشاف
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Full name (three-part name) / الاسم الثلاثي</label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. youssef miro soshi"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Email / البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. john@example.com"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Password / كلمة المرور</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Phone number with WhatsApp / رقم الهاتف مع واتساب</label>
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="e.g. +201234567890"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Section / القطاع</label>
                  <select
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    required
                  >
                    <option value="">Select section</option>
                    {sections.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                {!isNewScout && (
                  <div className="space-y-2 text-left">
                    <label className="block text-sm font-medium text-foreground">Team / الفريق</label>
                    <select
                      value={team}
                      onChange={(event) => setTeam(event.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      required
                    >
                      <option value="">Select team</option>
                      {teams.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!isNewScout && (
                  <div className="space-y-2 text-left">
                    <label className="block text-sm font-medium text-foreground">ممطليعة / Patrol</label>
                    <select
                      value={patrol}
                      onChange={(event) => setPatrol(event.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      required
                    >
                      <option value="">Select patrol</option>
                      {patrols.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}

                {isNewScout && (
                  <>
                    <div className="space-y-2 text-left">
                      <label className="block text-sm font-medium text-foreground">Parents WhatsApp Number / رقم واتساب الوالدين</label>
                      <Input
                        value={parentsWhatsappNumber}
                        onChange={(event) => setParentsWhatsappNumber(event.target.value)}
                        placeholder="e.g. +201234567890"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-sm font-medium text-foreground">Home Address / عنوان المنزل</label>
                      <Input
                        value={homeAddress}
                        onChange={(event) => setHomeAddress(event.target.value)}
                        placeholder="e.g. 123 Main Street, Cairo"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-sm font-medium text-foreground">الرقم القومي / National ID</label>
                      <Input
                        value={nationalId}
                        onChange={(event) => setNationalId(event.target.value)}
                        placeholder="e.g. 12345678901234"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-sm font-medium text-foreground">صورة بطاقة الرقم القومي للوالد / Parent National ID Card</label>
                      <div className="space-y-2">
                        {!parentNationalIdPhoto ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG up to 5MB
                              </p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleParentNationalIdSelect}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-background">
                              <img
                                src={URL.createObjectURL(parentNationalIdPhoto)}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {parentNationalIdPhoto.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(parentNationalIdPhoto.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setParentNationalIdPhoto(null)}
                              className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-sm font-medium text-foreground">Photo / صورة شخصية</label>
                      <div className="space-y-2">
                        {!selectedPhoto ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG, GIF up to 5MB
                              </p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handlePhotoSelect}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-background">
                              <img
                                src={URL.createObjectURL(selectedPhoto)}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {selectedPhoto.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(null)}
                              className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {mode === "login" && (
              <>
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Email or Phone / البريد الإلكتروني أو رقم الهاتف</label>
                  <Input
                    type="text"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="e.g. john@example.com or +201234567890"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">Password / كلمة المرور</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {status && <p className="text-sm text-green-600">{status}</p>}

            <Button
              type="submit"
              size="lg"
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-md h-12"
              disabled={isSubmitting || isUploading}
            >
              {isUploading ? "Uploading photo..." : isSubmitting ? (mode === "request" ? "Sending request..." : "Logging in...") : (mode === "request" ? "Send Request / إرسال الطلب" : "Login / تسجيل الدخول")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
