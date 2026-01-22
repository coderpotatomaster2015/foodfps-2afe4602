import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Zap, Sparkles } from "lucide-react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";

interface ScheduledEvent {
  id: string;
  event_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  description: string | null;
  is_activated: boolean;
}

interface PublicScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  ultimate_rainbow: { label: "Ultimate Rainbow Mode", color: "from-pink-500 to-purple-500", emoji: "🌈" },
  godmode_all: { label: "Godmode for All", color: "from-yellow-500 to-orange-500", emoji: "🛡️" },
  all_weapons: { label: "All Weapons Unlocked", color: "from-red-500 to-pink-500", emoji: "🔫" },
  double_coins: { label: "Double Coins", color: "from-green-500 to-emerald-500", emoji: "💰" },
  chaos_mode: { label: "Chaos Mode", color: "from-purple-500 to-indigo-500", emoji: "💥" },
};

export const PublicScheduleModal = ({ open, onOpenChange }: PublicScheduleModalProps) => {
  const [schedules, setSchedules] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadSchedules();
    }

    const channel = supabase
      .channel('public-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_abuse_schedule' }, () => {
        loadSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  const loadSchedules = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('admin_abuse_schedule')
      .select('*')
      .gte('scheduled_date', today)
      .eq('is_activated', false)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (!error && data) {
      setSchedules(data);
    }
    setLoading(false);
  };

  const getEventInfo = (type: string) => {
    return EVENT_LABELS[type] || { label: type, color: "from-gray-500 to-gray-600", emoji: "⚡" };
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, 'EEEE, MMM d');
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Event Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No upcoming events scheduled</p>
              <p className="text-sm text-muted-foreground">Check back later!</p>
            </div>
          ) : (
            schedules.map(schedule => {
              const eventInfo = getEventInfo(schedule.event_type);
              return (
                <div
                  key={schedule.id}
                  className="relative overflow-hidden rounded-xl border border-border bg-card p-4"
                >
                  {/* Gradient accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${eventInfo.color}`} />
                  
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{eventInfo.emoji}</div>
                    <div className="flex-1 space-y-2">
                      <h3 className="font-bold text-lg">{eventInfo.label}</h3>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-full">
                          <Calendar className="h-3 w-3" />
                          {getDateLabel(schedule.scheduled_date)}
                        </span>
                        <span className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-full">
                          <Clock className="h-3 w-3" />
                          {formatTime(schedule.scheduled_time)}
                        </span>
                        <span className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-full">
                          <Zap className="h-3 w-3" />
                          {schedule.duration_minutes} min
                        </span>
                      </div>

                      {schedule.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {schedule.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Events are activated by admins at the scheduled time
        </p>
      </DialogContent>
    </Dialog>
  );
};
