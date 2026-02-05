import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MathReloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classCodeId: string | null;
  onCorrect: () => void;
}

interface MathProblem {
  id: string;
  question: string;
  answer: string;
}

export const MathReloadModal = ({ open, onOpenChange, classCodeId, onCorrect }: MathReloadModalProps) => {
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && classCodeId) {
      loadRandomProblem();
    }
  }, [open, classCodeId]);

  const loadRandomProblem = async () => {
    if (!classCodeId) {
      // Generate a random math problem if no class-specific problems
      generateRandomProblem();
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from("class_math_problems")
        .select("*")
        .eq("class_code_id", classCodeId);

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        setProblem(data[randomIndex]);
      } else {
        // Fallback to generated problem
        generateRandomProblem();
      }
    } catch (error) {
      console.error("Error loading math problems:", error);
      generateRandomProblem();
    } finally {
      setLoading(false);
    }
  };

  const generateRandomProblem = () => {
    const operations = ["+", "-", "*"];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let a: number, b: number, answer: number;

    switch (op) {
      case "+":
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        answer = a + b;
        break;
      case "-":
        a = Math.floor(Math.random() * 50) + 20;
        b = Math.floor(Math.random() * 20) + 1;
        answer = a - b;
        break;
      case "*":
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
        answer = a * b;
        break;
      default:
        a = 5; b = 3; answer = 8;
    }

    setProblem({
      id: "generated",
      question: `${a} ${op} ${b} = ?`,
      answer: answer.toString()
    });
  };

  const checkAnswer = () => {
    if (!problem) return;

    const isCorrect = userAnswer.trim().toLowerCase() === problem.answer.toLowerCase();
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setTimeout(() => {
        onCorrect();
        setUserAnswer("");
        setFeedback(null);
        onOpenChange(false);
      }, 500);
    } else {
      setTimeout(() => {
        setFeedback(null);
        setUserAnswer("");
        loadRandomProblem();
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Solve to Reload!
          </DialogTitle>
          <DialogDescription>
            Answer the math problem correctly to reload your powers
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : problem ? (
          <div className="space-y-4">
            <div className="text-center p-6 bg-secondary rounded-lg">
              <p className="text-3xl font-bold">{problem.question}</p>
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Your answer..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`text-lg text-center ${
                  feedback === "correct" ? "border-green-500 bg-green-500/10" :
                  feedback === "wrong" ? "border-red-500 bg-red-500/10" : ""
                }`}
                autoFocus
              />
              <Button onClick={checkAnswer} disabled={!userAnswer.trim()}>
                Submit
              </Button>
            </div>

            {feedback === "correct" && (
              <div className="flex items-center justify-center gap-2 text-green-500">
                <Check className="w-5 h-5" />
                <span>Correct! Reloading...</span>
              </div>
            )}
            {feedback === "wrong" && (
              <div className="flex items-center justify-center gap-2 text-red-500">
                <X className="w-5 h-5" />
                <span>Wrong! Try again...</span>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
