"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { QuizResult } from "./quiz-result";

interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "short_answer";
  text: string;
  options: string[] | null;
  sortOrder: number;
}

interface QuizData {
  id: string;
  contentId: string;
  passingScore: number;
  questions: QuizQuestion[];
}

interface LastAttempt {
  score: number;
  passed: boolean;
}

interface QuizPanelProps {
  quizId: string;
  passingScore: number;
  lastAttempt?: LastAttempt | null;
}

interface SubmitResult {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  answers: Array<{
    questionId: string;
    answer: string;
    isCorrect: boolean;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function QuizPanel({ quizId, passingScore, lastAttempt }: QuizPanelProps) {
  const [mode, setMode] = useState<"idle" | "taking" | "result">("idle");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<LastAttempt | null | undefined>(lastAttempt);

  const startQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/take`);
      const data = await res.json();
      if (!res.ok) return;
      setQuizData(data);
      setAnswers({});
      setResult(null);
      setMode("taking");
    } catch {
      // ignore
    }
  }, [quizId]);

  async function handleSubmit() {
    if (!quizData) return;
    setIsSubmitting(true);

    try {
      const answerPayload = quizData.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? "",
      }));

      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerPayload }),
      });

      const data = await res.json();
      if (!res.ok) return;

      setResult(data);
      setCurrentAttempt({ score: data.score, passed: data.passed });
      setMode("result");
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === "result" && result && quizData) {
    return (
      <div className="mt-6">
        <Separator className="mb-6" />
        <h2 className="text-lg font-semibold mb-4">퀴즈 결과</h2>
        <QuizResult
          passed={result.passed}
          totalQuestions={result.totalQuestions}
          correctCount={result.correctCount}
          answers={result.answers}
          questions={quizData.questions}
        />
        {!result.passed && (
          <Button onClick={startQuiz} className="mt-4 w-full">
            재응시
          </Button>
        )}
      </div>
    );
  }

  if (mode === "taking" && quizData) {
    return (
      <div className="mt-6">
        <Separator className="mb-6" />
        <h2 className="text-lg font-semibold mb-4">퀴즈</h2>
        <div className="space-y-4">
          {quizData.questions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader className="pb-2">
                <p className="text-sm font-medium">
                  Q{idx + 1}. {q.text}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {q.type === "multiple_choice" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground">답변</Label>
                    <Input
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="답변을 입력하세요"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "제출 중..." : "답안 제출"}
          </Button>
        </div>
      </div>
    );
  }

  // Idle mode
  return (
    <div className="mt-6">
      <Separator className="mb-6" />
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <h3 className="font-semibold">학습 확인 퀴즈</h3>
          {currentAttempt ? (
            <div>
              <Badge variant={currentAttempt.passed ? "default" : "secondary"}>
                {currentAttempt.passed
                  ? `합격 (${currentAttempt.score}점)`
                  : `불합격 (${currentAttempt.score}점)`}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              이 콘텐츠는 퀴즈를 통과해야 완료 처리됩니다.
            </p>
          )}
          {(!currentAttempt || !currentAttempt.passed) && (
            <Button onClick={startQuiz}>
              {currentAttempt ? "재응시" : "퀴즈 시작"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
