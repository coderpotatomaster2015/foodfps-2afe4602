import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

interface OnlinePlayersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername: string;
  onJoinGame?: (username: string, roomCode: string) => void;
}

interface OnlinePlayer {
  username: string;
  roomCode: string;
  status: string;
}

export const OnlinePlayersModal = ({ 
  open, 
  onOpenChange, 
  currentUsername,
  onJoinGame 
}: OnlinePlayersModalProps) => {
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);

  useEffect(() => {
    if (!open) return;

    const channel = supabase.channel('online-players', {
      config: {
        presence: {
          key: currentUsername,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlinePlayers: OnlinePlayer[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((presence) => {
            if (presence.username !== currentUsername) {
              onlinePlayers.push({
                username: presence.username,
                roomCode: presence.roomCode || 'N/A',
                status: presence.status || 'online',
              });
            }
          });
        });
        
        setPlayers(onlinePlayers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username: currentUsername,
            roomCode: 'N/A',
            status: 'online',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, currentUsername]);

  const handleJoinGame = (username: string, roomCode: string) => {
    if (onJoinGame) {
      onJoinGame(username, roomCode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Online Players
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] pr-4">
          {players.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No other players online
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{player.username}</div>
                    <div className="text-xs text-muted-foreground">
                      Room: {player.roomCode}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleJoinGame(player.username, player.roomCode)}
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="text-xs text-muted-foreground text-center">
          {players.length} player{players.length !== 1 ? 's' : ''} online
        </div>
      </DialogContent>
    </Dialog>
  );
};
