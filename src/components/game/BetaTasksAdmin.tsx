import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, Clock, User } from "lucide-react";

interface BetaTasksAdminProps {
  userId: string;
}

export const BetaTasksAdmin = ({ userId }: BetaTasksAdminProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [betaTesters, setBetaTesters] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTester, setSelectedTester] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
    loadBetaTesters();
  }, []);

  const loadTasks = async () => {
    const { data } = await supabase
      .from("beta_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
  };

  const loadBetaTesters = async () => {
    const { data: testers } = await supabase
      .from("beta_testers")
      .select("user_id");
    if (!testers) return;

    const userIds = testers.map(t => t.user_id);
    if (userIds.length === 0) { setBetaTesters([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);
    if (profiles) setBetaTesters(profiles);
  };

  const createTask = async () => {
    if (!title.trim() || !description.trim() || !selectedTester) {
      toast.error("Fill in all fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("beta_tasks").insert({
      title,
      description,
      tester_user_id: selectedTester,
      assigned_by: userId,
    });
    if (error) {
      toast.error("Failed to create task");
    } else {
      toast.success("Task assigned!");
      setTitle("");
      setDescription("");
      setSelectedTester("");
      loadTasks();
    }
    setLoading(false);
  };

  const deleteTask = async (id: string) => {
    await supabase.from("beta_tasks").delete().eq("id", id);
    toast.success("Task deleted");
    loadTasks();
  };

  const getTesterName = (userId: string) => {
    return betaTesters.find(t => t.user_id === userId)?.username || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Assign Beta Task
        </h4>
        <Select value={selectedTester} onValueChange={setSelectedTester}>
          <SelectTrigger><SelectValue placeholder="Select beta tester" /></SelectTrigger>
          <SelectContent>
            {betaTesters.map(t => (
              <SelectItem key={t.user_id} value={t.user_id}>{t.username}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task description" rows={2} />
        <Button onClick={createTask} disabled={loading} className="w-full">
          {loading ? "Creating..." : "Assign Task"}
        </Button>
      </div>

      <ScrollArea className="max-h-[300px]">
        <div className="space-y-2 pr-4">
          {tasks.map(task => (
            <Card key={task.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{task.title}</span>
                    <Badge className={task.status === "completed" 
                      ? "bg-green-500/20 text-green-500" 
                      : "bg-yellow-500/20 text-yellow-500"}>
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <User className="w-3 h-3 inline mr-1" />
                    {getTesterName(task.tester_user_id)}
                  </p>
                  {task.feedback && (
                    <div className="mt-2 p-2 bg-secondary/50 rounded text-xs">
                      <span className="font-medium">Feedback:</span> {task.feedback}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="destructive" className="h-7" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
          {tasks.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No tasks assigned</p>}
        </div>
      </ScrollArea>
    </div>
  );
};
