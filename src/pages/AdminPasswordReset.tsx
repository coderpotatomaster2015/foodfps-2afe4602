import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Lock, Shield, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AdminPasswordReset = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"admin-login" | "reset-password">("admin-login");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const callResetFunction = async (payload: Record<string, string>) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-password-reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Request failed");
    }

    return data;
  };

  const handleAdminLogin = async () => {
    if (!adminUsername.trim() || !adminPassword.trim()) {
      toast.error("Enter admin username/email and password");
      return;
    }

    setLoading(true);
    try {
      await callResetFunction({
        action: "verify",
        adminUsername: adminUsername.trim(),
        adminPassword,
      });
      setStep("reset-password");
      toast.success("Admin verified. You can now reset a player's password.");
    } catch (error: any) {
      toast.error(error.message || "Admin verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!targetUsername.trim() || !newPassword.trim()) {
      toast.error("Enter target username and new password");
      return;
    }

    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const data = await callResetFunction({
        action: "reset",
        adminUsername: adminUsername.trim(),
        adminPassword,
        targetUsername: targetUsername.trim(),
        newPassword: newPassword.trim(),
      });

      toast.success(`Password updated for ${data.username}`);
      setTargetUsername("");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-destructive" />
          <h1 className="text-2xl font-bold">Admin Password Reset</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="ml-auto">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>

        {step === "admin-login" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Admins must log in first before changing another user's password.
            </p>
            <div className="space-y-2">
              <Label>Admin Username or Email</Label>
              <Input
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin username or email"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Password</Label>
              <Input
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                type="password"
                placeholder="password"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              />
            </div>
            <Button className="w-full" onClick={handleAdminLogin} disabled={loading}>
              <Lock className="w-4 h-4 mr-2" />
              {loading ? "Verifying..." : "Login as Admin"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Choose a user and set a new password.
            </p>
            <div className="space-y-2">
              <Label>Target Username</Label>
              <Input
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                placeholder="new password"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && handlePasswordReset()}
              />
            </div>
            <Button className="w-full" onClick={handlePasswordReset} disabled={loading}>
              <KeyRound className="w-4 h-4 mr-2" />
              {loading ? "Updating..." : "Reset Password"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep("admin-login")} disabled={loading}>
              <UserRound className="w-4 h-4 mr-2" /> Switch Admin Account
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminPasswordReset;
