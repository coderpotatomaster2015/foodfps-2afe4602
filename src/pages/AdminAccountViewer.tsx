import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Search, Lock, ArrowLeft, Loader2, LogIn } from "lucide-react";

const AdminAccountViewer = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"login" | "search" | "impersonating">("login");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      toast.error("Please enter your credentials");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (error) throw error;

      // Check if admin/owner
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "owner"]);

      if (!roles || roles.length === 0) {
        toast.error("You are not an admin");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Sign out so the impersonation can take over
      await supabase.auth.signOut();
      setStep("search");
      toast.success("Authenticated as admin");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const impersonateUser = async () => {
    if (!targetUsername.trim()) {
      toast.error("Enter a username");
      return;
    }
    setLoading(true);
    setStep("impersonating");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-impersonate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            adminEmail,
            adminPassword,
            targetUsername: targetUsername.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Impersonation failed");
        setStep("search");
        setLoading(false);
        return;
      }

      // Use the hashed token to verify OTP and log in as the target user
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });

      if (otpError) {
        console.error("OTP verification error:", otpError);
        toast.error("Failed to log in as user: " + otpError.message);
        setStep("search");
        setLoading(false);
        return;
      }

      // Mark that we're impersonating
      localStorage.setItem("admin_impersonating", "true");
      localStorage.setItem("admin_impersonating_username", data.username);

      toast.success(`Logged in as ${data.username}! Redirecting...`);
      
      // Small delay so the toast is visible, then redirect to main app
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error: any) {
      console.error("Impersonation error:", error);
      toast.error(error.message || "Impersonation failed");
      setStep("search");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-destructive" />
          <h1 className="text-2xl font-bold">Admin Account Access</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="ml-auto">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>

        {step === "login" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your admin credentials to access player accounts.
            </p>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Admin email" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Password" type="password"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} />
            </div>
            <Button className="w-full" onClick={handleAdminLogin} disabled={loading}>
              <Lock className="w-4 h-4 mr-2" />
              {loading ? "Authenticating..." : "Login as Admin"}
            </Button>
          </div>
        )}

        {step === "search" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the username of the player you want to log in as. You will be fully logged into their account.
            </p>
            <div className="space-y-2">
              <Label>Player Username</Label>
              <Input value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} placeholder="Enter username..."
                onKeyDown={(e) => e.key === "Enter" && impersonateUser()} />
            </div>
            <Button className="w-full" onClick={impersonateUser} disabled={loading}>
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? "Logging in..." : "Login as This User"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ You will be signed out of your admin account and logged into theirs.
            </p>
          </div>
        )}

        {step === "impersonating" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Logging into {targetUsername}'s account...</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAccountViewer;
