import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UpdatesHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Update {
  id: string;
  name: string;
  description: string;
  summary: string | null;
  is_released: boolean;
  is_beta: boolean;
  released_at: string | null;
  created_at: string;
}

export const UpdatesHub = ({ open, onOpenChange }: UpdatesHubProps) => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUpdates();
    }
  }, [open]);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("game_updates")
        .select("*")
        .eq("is_released", true)
        .order("released_at", { ascending: false });

      if (data) setUpdates(data);
    } catch (error) {
      console.error("Error loading updates:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Game Updates
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No updates yet</p>
              <p className="text-sm">Stay tuned for new features!</p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {updates.map((update) => (
                <Card key={update.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-lg">{update.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {update.is_beta ? "Beta" : "Released"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {update.released_at
                      ? new Date(update.released_at).toLocaleDateString()
                      : new Date(update.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    {update.summary || update.description}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};