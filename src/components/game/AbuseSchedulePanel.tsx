import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Calendar, Clock, Zap } from "lucide-react";
import { format } from "date-fns";

interface ScheduledEvent {
  id: string;
  event_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  description: string | null;
  created_by: string;
  created_at: string;
  is_activated: boolean;
}

interface AbuseSchedulePanelProps {
  userId: string;
}

const EVENT_TYPES = [
  { value: "ultimate_rainbow", label: "Ultimate Rainbow Mode" },
  { value: "godmode_all", label: "Godmode for All" },
  { value: "all_weapons", label: "All Weapons Unlocked" },
  { value: "double_coins", label: "Double Coins" },
  { value: "chaos_mode", label: "Chaos Mode" },
];

export const AbuseSchedulePanel = ({ userId }: AbuseSchedulePanelProps) => {
  const [schedules, setSchedules] = useState<ScheduledEvent[]>([]);
  const [eventType, setEventType] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSchedules();
    
    const channel = supabase
      .channel('schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_abuse_schedule' }, () => {
        loadSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSchedules = async () => {
    const { data, error } = await supabase
      .from('admin_abuse_schedule')
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (!error && data) {
      setSchedules(data);
    }
  };

  const createSchedule = async () => {
    if (!eventType || !scheduledDate || !scheduledTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('admin_abuse_schedule')
      .insert({
        event_type: eventType,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        duration_minutes: durationMinutes,
        description: description || null,
        created_by: userId,
      });

    if (error) {
      toast.error("Failed to create schedule: " + error.message);
    } else {
      toast.success("Event scheduled!");
      setEventType("");
      setScheduledDate("");
      setScheduledTime("");
      setDurationMinutes(30);
      setDescription("");
      loadSchedules();
    }
    setLoading(false);
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from('admin_abuse_schedule')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete schedule");
    } else {
      toast.success("Schedule deleted");
      loadSchedules();
    }
  };

  const activateNow = async (schedule: ScheduledEvent) => {
    // Create the actual admin abuse event
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + schedule.duration_minutes);

    const { error: eventError } = await supabase
      .from('admin_abuse_events')
      .insert({
        event_type: schedule.event_type,
        created_by: userId,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

    if (eventError) {
      toast.error("Failed to activate event");
      return;
    }

    // Mark as activated
    await supabase
      .from('admin_abuse_schedule')
      .update({ is_activated: true })
      .eq('id', schedule.id);

    toast.success(`${schedule.event_type} activated for ${schedule.duration_minutes} minutes!`);
    loadSchedules();
  };

  const getEventLabel = (type: string) => {
    return EVENT_TYPES.find(e => e.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Create Schedule Form */}
      <div className="bg-secondary/30 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Schedule New Event
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
              min={5}
              max={1440}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this event about?"
            rows={2}
          />
        </div>

        <Button onClick={createSchedule} disabled={loading} className="w-full">
          Schedule Event
        </Button>
      </div>

      {/* Scheduled Events List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Upcoming Events</h3>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events scheduled</p>
        ) : (
          schedules.map(schedule => (
            <div
              key={schedule.id}
              className={`bg-secondary/20 rounded-lg p-3 border ${
                schedule.is_activated ? 'border-green-500/50 opacity-60' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    {getEventLabel(schedule.event_type)}
                    {schedule.is_activated && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        Activated
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(schedule.scheduled_date), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {schedule.scheduled_time}
                    </span>
                    <span>{schedule.duration_minutes}min</span>
                  </div>
                  {schedule.description && (
                    <p className="text-sm text-muted-foreground">{schedule.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!schedule.is_activated && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateNow(schedule)}
                    >
                      Activate Now
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
