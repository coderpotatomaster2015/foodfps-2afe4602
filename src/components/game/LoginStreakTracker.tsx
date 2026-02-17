import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, Calendar, Star, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LoginStreakTrackerProps {
  userId: string;
  username: string;
}

export const LoginStreakTracker = ({ userId, username }: LoginStreakTrackerProps) => {
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalLogins, setTotalLogins] = useState(0);
  const [bonusEarned, setBonusEarned] = useState<string | null>(null);

  useEffect(() => {
    trackLogin();
  }, [userId]);

  const trackLogin = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("login_streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        // First login ever
        await supabase.from("login_streaks").insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_login_date: today,
          total_logins: 1,
        });
        setStreak(1);
        setLongestStreak(1);
        setTotalLogins(1);
        setShowWelcomeBack(true);
        setBonusEarned("Welcome to FoodFPS! 🎉");
        return;
      }

      const lastDate = existing.last_login_date;
      if (lastDate === today) {
        // Already logged in today
        setStreak(existing.current_streak);
        setLongestStreak(existing.longest_streak);
        setTotalLogins(existing.total_logins);
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = 1;
      if (lastDate === yesterdayStr) {
        newStreak = existing.current_streak + 1;
      }

      const newLongest = Math.max(newStreak, existing.longest_streak);
      const newTotal = existing.total_logins + 1;

      await supabase
        .from("login_streaks")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_login_date: today,
          total_logins: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      setStreak(newStreak);
      setLongestStreak(newLongest);
      setTotalLogins(newTotal);

      // Award streak bonuses
      let bonus: string | null = null;
      if (newStreak >= 7 && newStreak % 7 === 0) {
        await supabase.rpc("add_player_currency", { _user_id: userId, _gold: 5 });
        bonus = `🔥 ${newStreak}-day streak! +5 Gold!`;
      } else if (newStreak >= 3 && newStreak % 3 === 0) {
        await supabase.rpc("add_player_currency", { _user_id: userId, _gems: 15 });
        bonus = `🔥 ${newStreak}-day streak! +15 Gems!`;
      } else if (newStreak > 1) {
        await supabase.rpc("add_player_currency", { _user_id: userId, _coins: 50 * newStreak });
        bonus = `🔥 ${newStreak}-day streak! +${50 * newStreak} Coins!`;
      }

      setBonusEarned(bonus);
      setShowWelcomeBack(true);
    } catch (error) {
      console.error("Error tracking login streak:", error);
    }
  };

  return (
    <Dialog open={showWelcomeBack} onOpenChange={setShowWelcomeBack}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
            Welcome Back, {username}!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Card className="p-3">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-bold">{streak}</p>
              <p className="text-[10px] text-muted-foreground">Day Streak</p>
            </Card>
            <Card className="p-3">
              <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold">{longestStreak}</p>
              <p className="text-[10px] text-muted-foreground">Best Streak</p>
            </Card>
            <Card className="p-3">
              <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">{totalLogins}</p>
              <p className="text-[10px] text-muted-foreground">Total Logins</p>
            </Card>
          </div>

          {bonusEarned && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
              <Gift className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-semibold">{bonusEarned}</p>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground">
            <p>🔥 Play every day to build your streak!</p>
            <p className="mt-1">Every 3 days: 💎 Gems • Every 7 days: ⭐ Gold</p>
          </div>

          <Button className="w-full" onClick={() => setShowWelcomeBack(false)}>
            Let's Play!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
