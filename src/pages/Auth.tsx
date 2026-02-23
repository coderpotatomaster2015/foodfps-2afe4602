import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, User } from "lucide-react";

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"regular" | "class">("regular");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || password.length < 6) {
      toast.error("Username and password (min 6 chars) required");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const email = `${username}@foodfps.game`;
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const email = `${username}@foodfps.game`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        // Sync account to Website B (shooter1.lovable.app)
        if (data.user) {
          try {
            await supabase.functions.invoke('sync-account', {
              body: { email, password, username }
            });
            console.log('Account synced to Website B');
          } catch (syncError) {
            console.error('Account sync failed (non-blocking):', syncError);
          }
        }
        
        toast.success("Account created! Logging you in...");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClassJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }
    if (!classCode.trim() || classCode.length !== 6) {
      toast.error("Please enter a valid 6-character class code");
      return;
    }

    setLoading(true);
    try {
      // Check if class code exists and is active
      const { data: classData, error: classError } = await supabase
        .from("class_codes")
        .select("*")
        .eq("code", classCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (classError || !classData) {
        toast.error("Invalid or inactive class code");
        setLoading(false);
        return;
      }

      // Create a class-specific account with a deterministic password based on code and username
      const email = `${username.toLowerCase().replace(/\s+/g, '_')}_class_${classCode.toLowerCase()}@foodfps.game`;
      // Use a consistent password so users can rejoin
      const tempPassword = `Class${classCode.toUpperCase()}User${username.toLowerCase().replace(/\s+/g, '')}123!`;

      // First try to sign in (in case user already exists)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      });
      
      if (signInError) {
        // Account doesn't exist, create it
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: {
            data: { username: username.trim(), isClassMember: true, classCode: classCode.toUpperCase() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) {
          console.error("Signup error:", signUpError);
          toast.error("Failed to create class account. Try a different username.");
          setLoading(false);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Add to class members using upsert
        const { error: memberError } = await supabase.from("class_members").upsert({
          class_code_id: classData.id,
          user_id: user.id,
          username: username.trim(),
          is_ip_blocked: true,
        }, {
          onConflict: 'user_id,class_code_id'
        });

        if (memberError) {
          console.error("Member add error:", memberError);
        }

        // Store class mode flag
        localStorage.setItem("isClassMode", "true");
        localStorage.setItem("classCode", classCode.toUpperCase());
      }

      toast.success(`Joined ${classData.name}! School Mode only.`);
      navigate("/");
    } catch (error: any) {
      console.error("Class join error:", error);
      toast.error("Failed to join class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Food FPS
          </h1>
          <p className="text-muted-foreground">
            {authMode === "regular" 
              ? (isLogin ? "Welcome back!" : "Create your account")
              : "Join your class"}
          </p>
        </div>

        <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "regular" | "class")} className="mb-6">
          <TabsList className="w-full">
            <TabsTrigger value="regular" className="flex-1 gap-2">
              <User className="w-4 h-4" />
              Regular
            </TabsTrigger>
            <TabsTrigger value="class" className="flex-1 gap-2">
              <GraduationCap className="w-4 h-4" />
              Join Class
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regular" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-input border-border"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-input border-border"
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                variant="gaming"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Login"}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="class" className="mt-4">
            <form onSubmit={handleClassJoin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Your Name</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-input border-border"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Class Code</label>
                <Input
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  className="bg-input border-border font-mono text-lg tracking-widest text-center"
                  disabled={loading}
                  maxLength={6}
                />
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                <GraduationCap className="w-4 h-4 inline mr-2" />
                Class members can only play School Mode with elemental powers.
              </div>

              <Button
                type="submit"
                variant="gaming"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Joining..." : "Join Class"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground">
          Made by{" "}
          <a
            href="https://victories.games"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            victories
          </a>
          .
        </p>
      </Card>
    </div>
  );
};
