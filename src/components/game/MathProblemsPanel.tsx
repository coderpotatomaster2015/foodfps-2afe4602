import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassCode {
  id: string;
  name: string;
  code: string;
}

interface MathProblem {
  id: string;
  question: string;
  answer: string;
  class_code_id: string;
}

export const MathProblemsPanel = () => {
  const [classCodes, setClassCodes] = useState<ClassCode[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    loadClassCodes();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadProblems();
    }
  }, [selectedClass]);

  const loadClassCodes = async () => {
    const { data } = await supabase
      .from("class_codes")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name");

    if (data) setClassCodes(data);
  };

  const loadProblems = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    const { data } = await supabase
      .from("class_math_problems")
      .select("*")
      .eq("class_code_id", selectedClass)
      .order("created_at", { ascending: false });

    if (data) setProblems(data);
    setLoading(false);
  };

  const addProblem = async () => {
    if (!selectedClass || !question.trim() || !answer.trim()) {
      toast.error("Please select a class and fill in question and answer");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("class_math_problems").insert({
      class_code_id: selectedClass,
      question: question.trim(),
      answer: answer.trim(),
      created_by: user.id,
    });

    if (error) {
      toast.error("Failed to add problem");
    } else {
      toast.success("Math problem added!");
      setQuestion("");
      setAnswer("");
      loadProblems();
    }
  };

  const deleteProblem = async (id: string) => {
    const { error } = await supabase
      .from("class_math_problems")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete problem");
    } else {
      toast.success("Problem deleted");
      loadProblems();
    }
  };

  const generateBulkProblems = async () => {
    if (!selectedClass) {
      toast.error("Please select a class first");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const operations = ["+", "-", "*"];
    const newProblems = [];

    for (let i = 0; i < 10; i++) {
      const op = operations[Math.floor(Math.random() * operations.length)];
      let a: number, b: number, ans: number;

      switch (op) {
        case "+":
          a = Math.floor(Math.random() * 50) + 1;
          b = Math.floor(Math.random() * 50) + 1;
          ans = a + b;
          break;
        case "-":
          a = Math.floor(Math.random() * 50) + 20;
          b = Math.floor(Math.random() * 20) + 1;
          ans = a - b;
          break;
        case "*":
          a = Math.floor(Math.random() * 12) + 1;
          b = Math.floor(Math.random() * 12) + 1;
          ans = a * b;
          break;
        default:
          a = 5; b = 3; ans = 8;
      }

      newProblems.push({
        class_code_id: selectedClass,
        question: `${a} ${op} ${b}`,
        answer: ans.toString(),
        created_by: user.id,
      });
    }

    const { error } = await supabase.from("class_math_problems").insert(newProblems);

    if (error) {
      toast.error("Failed to generate problems");
    } else {
      toast.success("10 math problems generated!");
      loadProblems();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Class Math Problems</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Students in Join Class mode must solve these problems to reload their powers.
      </p>

      <div className="space-y-3">
        <div>
          <Label>Select Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class..." />
            </SelectTrigger>
            <SelectContent>
              {classCodes.map(cc => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.name} ({cc.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClass && (
          <>
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-medium">Add New Problem</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Question</Label>
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., 5 + 3"
                  />
                </div>
                <div>
                  <Label>Answer</Label>
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="e.g., 8"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addProblem} size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Add Problem
                </Button>
                <Button onClick={generateBulkProblems} size="sm" variant="outline">
                  Generate 10 Random
                </Button>
              </div>
            </Card>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Problems ({problems.length})</h4>
              <ScrollArea className="h-[200px]">
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : problems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No problems yet. Add some or generate random ones!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {problems.map(p => (
                      <Card key={p.id} className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-mono">{p.question}</span>
                          <span className="mx-2">=</span>
                          <span className="font-bold text-primary">{p.answer}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProblem(p.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
