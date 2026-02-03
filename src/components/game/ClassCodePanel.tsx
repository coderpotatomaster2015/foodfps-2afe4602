import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Copy, Trash2, Clock, Plus, GraduationCap, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  expires_at: string | null;
  max_students: number;
  created_at: string;
}

interface ClassMember {
  id: string;
  user_id: string;
  username: string;
  joined_at: string;
  session_ends_at: string | null;
  is_ip_blocked: boolean;
}

export const ClassCodePanel = () => {
  const [classCodes, setClassCodes] = useState<ClassCode[]>([]);
  const [classMembers, setClassMembers] = useState<Record<string, ClassMember[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassCode | null>(null);

  // Form state
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [sessionDuration, setSessionDuration] = useState("60");

  useEffect(() => {
    loadClassCodes();
  }, []);

  const loadClassCodes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("class_codes")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setClassCodes(data);
        // Load members for each class
        for (const classCode of data) {
          loadClassMembers(classCode.id);
        }
      }
    } catch (error) {
      console.error("Error loading class codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassMembers = async (classCodeId: string) => {
    const { data } = await supabase
      .from("class_members")
      .select("*")
      .eq("class_code_id", classCodeId)
      .order("joined_at", { ascending: false });

    if (data) {
      setClassMembers(prev => ({ ...prev, [classCodeId]: data }));
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createClassCode = async () => {
    if (!newClassName.trim()) {
      toast.error("Please enter a class name");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const code = generateCode();

      const { error } = await supabase.from("class_codes").insert({
        code,
        name: newClassName.trim(),
        description: newClassDescription.trim() || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success(`Class code created: ${code}`);
      setNewClassName("");
      setNewClassDescription("");
      loadClassCodes();
    } catch (error) {
      console.error("Error creating class code:", error);
      toast.error("Failed to create class code");
    }
  };

  const deleteClassCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from("class_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Class code deleted");
      loadClassCodes();
    } catch (error) {
      console.error("Error deleting class code:", error);
      toast.error("Failed to delete class code");
    }
  };

  const toggleClassActive = async (classCode: ClassCode) => {
    try {
      const { error } = await supabase
        .from("class_codes")
        .update({ is_active: !classCode.is_active })
        .eq("id", classCode.id);

      if (error) throw error;

      toast.success(classCode.is_active ? "Class deactivated" : "Class activated");
      loadClassCodes();
    } catch (error) {
      console.error("Error toggling class:", error);
      toast.error("Failed to update class");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const removeStudent = async (memberId: string, classCodeId: string) => {
    try {
      const { error } = await supabase
        .from("class_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Student removed from class");
      loadClassMembers(classCodeId);
    } catch (error) {
      console.error("Error removing student:", error);
      toast.error("Failed to remove student");
    }
  };

  const setStudentSessionEnd = async (memberId: string, classCodeId: string, hours: number) => {
    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + hours);

      const { error } = await supabase
        .from("class_members")
        .update({ session_ends_at: endsAt.toISOString() })
        .eq("id", memberId);

      if (error) throw error;

      toast.success(`Session will end in ${hours} hours`);
      loadClassMembers(classCodeId);
    } catch (error) {
      console.error("Error setting session end:", error);
      toast.error("Failed to update session");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Class */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Create New Class
        </h3>

        <div className="grid gap-4">
          <div>
            <Label>Class Name</Label>
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g., Math Class Period 3"
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Input
              value={newClassDescription}
              onChange={(e) => setNewClassDescription(e.target.value)}
              placeholder="e.g., For learning about game physics"
            />
          </div>

          <Button onClick={createClassCode} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Class Code
          </Button>
        </div>
      </Card>

      {/* Existing Classes */}
      <Card className="p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          Your Classes
        </h3>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : classCodes.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No classes created yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {classCodes.map((classCode) => (
                <Card key={classCode.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{classCode.name}</h4>
                      {classCode.description && (
                        <p className="text-sm text-muted-foreground">{classCode.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={classCode.is_active ? "default" : "secondary"}>
                        {classCode.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 p-2 bg-secondary rounded-lg">
                    <code className="text-lg font-mono font-bold flex-1">{classCode.code}</code>
                    <Button size="sm" variant="ghost" onClick={() => copyCode(classCode.code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">
                      <Users className="w-3 h-3 mr-1" />
                      {classMembers[classCode.id]?.length || 0} students
                    </Badge>
                    <Button
                      size="sm"
                      variant={classCode.is_active ? "outline" : "default"}
                      onClick={() => toggleClassActive(classCode)}
                    >
                      {classCode.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteClassCode(classCode.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Students */}
                  {classMembers[classCode.id]?.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <h5 className="text-sm font-medium mb-2">Students</h5>
                      <div className="space-y-2">
                        {classMembers[classCode.id].map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                          >
                            <div>
                              <span className="font-medium">{member.username}</span>
                              {member.session_ends_at && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Ends: {new Date(member.session_ends_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStudentSessionEnd(member.id, classCode.id, 1)}
                              >
                                1h
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStudentSessionEnd(member.id, classCode.id, 2)}
                              >
                                2h
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeStudent(member.id, classCode.id)}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
};
