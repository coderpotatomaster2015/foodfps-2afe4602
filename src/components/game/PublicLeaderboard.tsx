import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerProfileModal } from "./PlayerProfileModal";

interface PublicLeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  total_score: number;
  ranked_rank: string | null;
  ranked_tier: number | null;
}

export const PublicLeaderboard = ({ open, onOpenChange }: PublicLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (open) {
      loadLeaderboard();
    }
  }, [open]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, username, total_score, ranked_rank, ranked_tier")
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

  const getRankDisplay = (rank: string | null, tier: number | null) => {
    if (!rank) return null;
    const rankColors: Record<string, string> = {
      bronze: "text-orange-600",
      gold: "text-yellow-500",
      diamond: "text-blue-400",
      pro: "text-purple-500",
    };
    return (
      <span className={`text-xs ${rankColors[rank] || ""}`}>
        {rank.toUpperCase()} {tier || ""}
      </span>
    );
  };

  const handlePlayerClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfile(true);
  };

  return (
    <>
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
                  <Card 
                    key={entry.id} 
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors ${index < 3 ? "bg-primary/10 border-primary/30" : ""}`}
                    onClick={() => handlePlayerClick(entry.user_id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getMedalColor(index)}`}>
                      {index < 3 ? (
                        <Medal className="w-5 h-5" />
                      ) : (
                        <span className="text-sm">#{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium hover:underline">{entry.username}</span>
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                      {getRankDisplay(entry.ranked_rank, entry.ranked_tier)}
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

      {selectedUserId && (
        <PlayerProfileModal
          open={showProfile}
          onOpenChange={setShowProfile}
          userId={selectedUserId}
          viewOnly
        />
      )}
    </>
  );
};