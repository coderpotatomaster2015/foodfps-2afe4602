import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";

interface AdminAbuseRequestsProps {
  userId: string;
}

const EVENT_LABELS: Record<string, string> = {
  ultimate_rainbow: "🌈 Ultimate Rainbow",
  godmode_all: "🛡️ Godmode All",
  all_weapons: "🔫 All Weapons",
  double_coins: "💰 Double Coins",
  chaos_mode: "💥 Chaos Mode",
  birthday_mode: "🎂 Birthday Mode",
};

export const AdminAbuseRequests = ({ userId }: AdminAbuseRequestsProps) => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("abuse_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  const handleRequest = async (request: any, action: "approved" | "denied") => {
    await supabase.from("abuse_requests").update({
      status: action,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", request.id);

    if (action === "approved") {
      // Create the actual scheduled event
      await supabase.from("admin_abuse_schedule").insert({
        event_type: request.event_type,
        scheduled_date: request.requested_date,
        scheduled_time: request.requested_time,
        duration_minutes: request.duration_minutes,
        description: `Requested by ${request.username}: ${request.reason || "No reason given"}`,
        created_by: userId,
      });
      toast.success(`Approved and scheduled ${request.username}'s request`);
    } else {
      toast.success(`Denied ${request.username}'s request`);
    }
    loadRequests();
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Player Event Requests</h4>

      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm text-muted-foreground">Pending ({pendingRequests.length})</h5>
          {pendingRequests.map(req => (
            <Card key={req.id} className="p-3 border-yellow-500/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{EVENT_LABELS[req.event_type] || req.event_type}</p>
                  <p className="text-xs text-muted-foreground">
                    By <span className="font-medium">{req.username}</span> • {req.requested_date} at {req.requested_time} • {req.duration_minutes}min
                  </p>
                  {req.reason && <p className="text-xs mt-1">{req.reason}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleRequest(req, "approved")}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRequest(req, "denied")}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pendingRequests.length === 0 && (
        <p className="text-sm text-muted-foreground">No pending requests</p>
      )}

      {processedRequests.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm text-muted-foreground">History</h5>
          <ScrollArea className="max-h-[200px]">
            {processedRequests.slice(0, 20).map(req => (
              <Card key={req.id} className="p-2 mb-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs">{req.username} - {EVENT_LABELS[req.event_type] || req.event_type}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={req.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                    {req.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
