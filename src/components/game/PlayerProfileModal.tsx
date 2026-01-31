import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User, Camera, Save, Trophy, Swords, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;  // Optional: if provided, view another user's profile
  viewOnly?: boolean; // If true, hide edit controls
}

interface ProfileData {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  total_score: number;
  ranked_rank: string | null;
  ranked_tier: number | null;
}

const RANK_COLORS: Record<string, string> = {
  bronze: "text-orange-600",
  gold: "text-yellow-500",
  diamond: "text-blue-400",
  pro: "text-purple-500",
};

export const PlayerProfileModal = ({ open, onOpenChange, userId, viewOnly = false }: PlayerProfileModalProps) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open, userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        targetUserId = user.id;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url, total_score, ranked_rank, ranked_tier")
        .eq("user_id", targetUserId)
        .single();

      if (data) {
        setProfile(data);
        setBio(data.bio || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2MB)");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast.success("Avatar updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const saveBio = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ bio: bio.trim() || null })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, bio: bio.trim() || null } : null);
      toast.success("Bio saved!");
    } catch (error) {
      console.error("Error saving bio:", error);
      toast.error("Failed to save bio");
    } finally {
      setSaving(false);
    }
  };

  const getRankDisplay = () => {
    if (!profile?.ranked_rank || !profile?.ranked_tier) return null;

    const rankName = profile.ranked_rank.charAt(0).toUpperCase() + profile.ranked_rank.slice(1);
    const tierDisplay = profile.ranked_rank === "pro" ? "" : ` ${["I", "II", "III", "IV", "V"][profile.ranked_tier - 1] || profile.ranked_tier}`;
    
    return (
      <Badge className={`${RANK_COLORS[profile.ranked_rank]} bg-transparent border`}>
        <Medal className="w-3 h-3 mr-1" />
        {rankName}{tierDisplay}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {viewOnly ? "Player Profile" : "My Profile"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-orange-400 to-red-400 text-white">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!viewOnly && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold">{profile.username}</h3>
                {getRankDisplay()}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-lg font-bold">{profile.total_score.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Score</p>
              </Card>
              <Card className="p-3 text-center">
                <Swords className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-lg font-bold">{profile.ranked_rank ? "Ranked" : "Unranked"}</p>
                <p className="text-xs text-muted-foreground">Status</p>
              </Card>
            </div>

            {/* Bio Section */}
            <div className="space-y-2">
              <Label>Bio</Label>
              {viewOnly ? (
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg min-h-[80px]">
                  {profile.bio || "No bio set"}
                </p>
              ) : (
                <>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    rows={3}
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{bio.length}/200</span>
                    <Button size="sm" onClick={saveBio} disabled={saving}>
                      {saving ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Bio
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Failed to load profile</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
