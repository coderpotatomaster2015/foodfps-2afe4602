import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PublicLeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  total_score: number;
}

export const PublicLeaderboard = ({ open, onOpenChange }: PublicLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (open) {
      loadLeaderboard();
      checkIfPublic();
    }
  }, [open]);

  const checkIfPublic = async () => {
    // Check if admin has enabled public leaderboard (stored in game_settings)
    const { data } = await supabase
      .from("game_settings")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();
    
    // For now, always show it. Admin can toggle this later.
    setIsPublic(true);
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, total_score")
        .order("total_score", { ascending: false })
        .limit(100);

      if (data) setLeaderboard(data);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return "text-yellow-400";
    if (index === 1) return "text-gray-400";
    if (index === 2) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Global Leaderboard
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No players yet</p>
              <p className="text-sm">Be the first to play!</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {leaderboard.map((entry, index) => (
                <Card key={entry.id} className={`p-3 flex items-center gap-3 ${index < 3 ? "bg-primary/10 border-primary/30" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getMedalColor(index)}`}>
                    {index < 3 ? (
                      <Medal className="w-5 h-5" />
                    ) : (
                      <span className="text-sm">#{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{entry.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">{entry.total_score.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">pts</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};