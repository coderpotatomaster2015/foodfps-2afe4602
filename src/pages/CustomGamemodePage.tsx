import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomGamemodeCanvas } from "@/components/game/CustomGamemodeCanvas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const CustomGamemodePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    loadGamemode();
    loadUsername();
  }, [slug, user, authLoading]);

  const loadUsername = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle();
    if (data) setUsername(data.username);
  };

  const loadGamemode = async () => {
    if (!slug) { setError("No gamemode specified"); setLoading(false); return; }
    const { data, error: err } = await supabase
      .from("custom_gamemodes")
      .select("*")
      .eq("slug", slug)
      .eq("status", "approved")
      .eq("is_public", true)
      .maybeSingle();

    if (err || !data) { setError("Gamemode not found or not approved yet"); }
    else { setConfig(data); }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-destructive">{error}</p>
          <Button onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-2" />Back to Game</Button>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <CustomGamemodeCanvas
        config={config}
        username={username}
        onBack={() => navigate("/")}
        playerSkin={localStorage.getItem("foodfps_skin") || "#FFF3D6"}
      />
    </div>
  );
};

export default CustomGamemodePage;
