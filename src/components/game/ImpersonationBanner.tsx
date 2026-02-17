import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ImpersonationBanner = () => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const flag = localStorage.getItem("admin_impersonating");
    const name = localStorage.getItem("admin_impersonating_username");
    if (flag === "true") {
      setIsImpersonating(true);
      setTargetUsername(name || "unknown");
    }
  }, []);

  const handleStopImpersonating = async () => {
    localStorage.removeItem("admin_impersonating");
    localStorage.removeItem("admin_impersonating_username");
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <ShieldAlert className="w-4 h-4 shrink-0" />
      <span className="font-semibold">
        ⚠️ Admin Impersonation Active — You are logged in as <span className="underline">{targetUsername}</span>
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStopImpersonating}
        className="ml-2 bg-transparent border-destructive-foreground/50 text-destructive-foreground hover:bg-destructive-foreground/10 h-7 text-xs"
      >
        <LogOut className="w-3 h-3 mr-1" />
        Stop & Logout
      </Button>
    </div>
  );
};
