import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Clock, Check, X } from "lucide-react";

const EVENT_TYPES = [
  { value: "ultimate_rainbow", label: "🌈 Ultimate Rainbow Mode" },
  { value: "godmode_all", label: "🛡️ Godmode for All" },
  { value: "all_weapons", label: "🔫 All Weapons Unlocked" },
  { value: "double_coins", label: "💰 Double Coins" },
  { value: "chaos_mode", label: "💥 Chaos Mode" },
  { value: "birthday_mode", label: "🎂 Birthday Mode" },
];

interface AbuseRequestPanelProps {
  userId: string;
  username: string;
}

export const AbuseRequestPanel = ({ userId, username }: AbuseRequestPanelProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [eventType, setEventType] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("abuse_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  const submitRequest = async () => {
    if (!eventType || !requestedDate || !requestedTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("abuse_requests").insert({
      user_id: userId,
      username,
      event_type: eventType,
      requested_date: requestedDate,
      requested_time: requestedTime,
      duration_minutes: duration,
      reason: reason || null,
    });

    if (error) {
      toast.error("Failed to submit request");
    } else {
      toast.success("Request submitted! An admin will review it.");
      setEventType("");
      setRequestedDate("");
      setRequestedTime("");
      setDuration(30);
      setReason("");
      loadRequests();
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
    if (status === "denied") return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Denied</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Send className="w-4 h-4" />
          Request an Event
        </h4>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Time</Label>
            <Input type="time" value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duration (minutes)</Label>
          <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} min={5} max={120} />
        </div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you want this event? (optional)" rows={2} />
        <Button onClick={submitRequest} disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Your Requests</h4>
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No requests yet</p>
        ) : (
          requests.map(req => (
            <Card key={req.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{EVENT_TYPES.find(t => t.value === req.event_type)?.label || req.event_type}</p>
                  <p className="text-xs text-muted-foreground">{req.requested_date} at {req.requested_time} • {req.duration_minutes}min</p>
                </div>
                {getStatusBadge(req.status)}
              </div>
              {req.reason && <p className="text-xs text-muted-foreground mt-1">{req.reason}</p>}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
