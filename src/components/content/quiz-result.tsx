"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface GradedAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
}

interface QuizResultProps {
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  answers: GradedAnswer[];
  questions: Array<{
    id: string;
    type: string;
    text: string;
    options: string[] | null;
  }>;
}

export function QuizResult({
  passed,
  totalQuestions,
  correctCount,
  answers,
  questions,
}: QuizResultProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 text-center">
          <Badge variant={passed ? "default" : "destructive"} className="text-sm mb-2">
            {passed ? "합격" : "불합격"}
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">
            총 {totalQuestions}문제 중 {correctCount}문제 정답
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {questions.map((q, idx) => {
          const answer = answers.find((a) => a.questionId === q.id);
          return (
            <Card key={q.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  {answer?.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      Q{idx + 1}. {q.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      내 답변: {answer?.answer || "(미응답)"}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
