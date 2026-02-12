import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crown, Lock, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const OWNER_PASSWORD = "DonutSmp12!67kidsithebest@lwsdvictories.games";

const OwnerPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGranted, setIsGranted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      toast.info("Please sign in with your FoodFPS account first");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }

    if (password !== OWNER_PASSWORD) {
      toast.error("Incorrect password");
      return;
    }

    setIsVerifying(true);

    try {
      // Use the secure database function to grant owner role
      const { data, error } = await supabase.rpc("grant_owner_with_password", {
        _user_id: user.id,
        _password: password,
      });

      if (error) {
        console.error("RPC error:", error);
        throw new Error("Failed to grant owner role");
      }

      if (!data) {
        toast.error("Incorrect password");
        setIsVerifying(false);
        return;
      }

      toast.success("🎉 You are now an Owner! You have both Admin and Owner panels.");
      setIsGranted(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error granting owner role:", error);
      toast.error("Failed to grant owner role. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <LogIn className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="text-muted-foreground">You must be signed in with your FoodFPS account to access this page.</p>
          <Button onClick={() => navigate("/auth")} className="w-full">
            Go to Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (isGranted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4 bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
          <Crown className="w-20 h-20 mx-auto text-yellow-500 animate-bounce" />
          <h1 className="text-3xl font-bold text-yellow-500">Welcome, Owner!</h1>
          <p className="text-muted-foreground">
            You now have access to both Admin and Owner panels with all privileges.
          </p>
          <p className="text-sm">Redirecting to the game...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <Lock className="w-16 h-16 mx-auto text-amber-500" />
          <h1 className="text-2xl font-bold">Owner Access</h1>
          <p className="text-muted-foreground text-sm">Enter the secret password to become an Owner</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Secret Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the secret password..."
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isVerifying || !password}
            className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {isVerifying ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Verifying...
              </>
            ) : (
              <>
                <Crown className="w-4 h-4" />
                Claim Owner Status
              </>
            )}
          </Button>
        </div>

        <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
          Back to Game
        </Button>
      </Card>
    </div>
  );
};

export default OwnerPage;
