import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Send, Calendar, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BetaTesterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Update {
  id: string;
  name: string;
  description: string;
  is_beta: boolean;
  created_at: string;
}

interface BetaTask {
  id: string;
  title: string;
  description: string;
  status: string;
  feedback: string | null;
  created_at: string;
}

export const BetaTesterPanel = ({ open, onOpenChange }: BetaTesterPanelProps) => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [tasks, setTasks] = useState<BetaTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null);
  const [feedback, setFeedback] = useState("");
  const [taskFeedback, setTaskFeedback] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      loadBetaUpdates();
      loadTasks();
    }
  }, [open]);

  const loadBetaUpdates = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("game_updates")
        .select("*")
        .eq("is_beta", true)
        .eq("is_released", false)
        .order("created_at", { ascending: false });
      if (data) setUpdates(data);
    } catch (error) {
      console.error("Error loading beta updates:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("beta_tasks")
      .select("*")
      .eq("tester_user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
  };

  const submitFeedback = async () => {
    if (!selectedUpdate || !feedback.trim()) {
      toast.error("Please write some feedback");
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .single();

      if (!adminRole) { toast.error("No admin found"); return; }

      await supabase.from("messages").insert({
        from_user_id: user.id,
        to_user_id: adminRole.user_id,
        from_username: profile?.username || "Unknown",
        to_username: "Admin",
        subject: `Beta Feedback: ${selectedUpdate.name}`,
        content: feedback,
        is_feedback: true,
      });

      toast.success("Feedback submitted!");
      setSelectedUpdate(null);
      setFeedback("");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setSending(false);
    }
  };

  const completeTask = async (task: BetaTask) => {
    const fb = taskFeedback[task.id];
    if (!fb?.trim()) {
      toast.error("Please write feedback before completing the task");
      return;
    }

    const { error } = await supabase
      .from("beta_tasks")
      .update({
        status: "completed",
        feedback: fb,
        completed_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      toast.error("Failed to complete task");
    } else {
      toast.success("Task completed!");
      setTaskFeedback(prev => ({ ...prev, [task.id]: "" }));
      loadTasks();
    }
  };

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Beta Tester Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="tasks" className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="tasks" className="text-xs">
              Tasks {pendingTasks.length > 0 && `(${pendingTasks.length})`}
            </TabsTrigger>
            <TabsTrigger value="updates" className="text-xs">Beta Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {pendingTasks.length > 0 && (
                <div className="space-y-3 pr-4 mb-4">
                  <h4 className="text-sm font-semibold text-yellow-500">⚠️ Pending Tasks - Complete before playing!</h4>
                  {pendingTasks.map(task => (
                    <Card key={task.id} className="p-3 border-yellow-500/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{task.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <Textarea
                        placeholder="Write your feedback to complete this task..."
                        value={taskFeedback[task.id] || ""}
                        onChange={(e) => setTaskFeedback(prev => ({ ...prev, [task.id]: e.target.value }))}
                        rows={2}
                      />
                      <Button size="sm" onClick={() => completeTask(task)} className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Task
                      </Button>
                    </Card>
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="space-y-2 pr-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Completed</h4>
                  {completedTasks.map(task => (
                    <Card key={task.id} className="p-3 opacity-60">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{task.title}</span>
                        <Badge className="bg-green-500/20 text-green-500 ml-auto">Done</Badge>
                      </div>
                      {task.feedback && <p className="text-xs text-muted-foreground mt-1">{task.feedback}</p>}
                    </Card>
                  ))}
                </div>
              )}

              {tasks.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks assigned</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="updates" className="flex-1 overflow-hidden">
            {selectedUpdate ? (
              <div className="flex-1 flex flex-col space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedUpdate(null)} className="self-start">
                  ← Back
                </Button>
                <Card className="p-4 space-y-2">
                  <h3 className="font-bold text-lg">{selectedUpdate.name}</h3>
                  <p className="text-sm">{selectedUpdate.description}</p>
                </Card>
                <Textarea
                  placeholder="Share your feedback on this update..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="flex-1 min-h-[150px]"
                />
                <Button onClick={submitFeedback} disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : updates.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No beta updates available</p>
                  </div>
                ) : (
                  <div className="space-y-4 pr-4">
                    {updates.map((update) => (
                      <Card key={update.id} className="p-4 space-y-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => setSelectedUpdate(update)}>
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold">{update.name}</h3>
                          <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Beta</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(update.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm line-clamp-2">{update.description}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
