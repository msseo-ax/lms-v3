"use client";

import { useState } from "react";
import type { QuestionType } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface QuestionFormData {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  keywords: string[];
}

export interface QuizFormData {
  enabled: boolean;
  passingScore: number;
  questions: QuestionFormData[];
}

interface QuizEditorProps {
  value: QuizFormData;
  onChange: (value: QuizFormData) => void;
}

function createEmptyQuestion(): QuestionFormData {
  return {
    id: crypto.randomUUID(),
    type: "multiple_choice",
    text: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    keywords: [],
  };
}

export function QuizEditor({ value, onChange }: QuizEditorProps) {
  const [keywordInput, setKeywordInput] = useState<Record<string, string>>({});

  function updateQuestion(id: string, patch: Partial<QuestionFormData>) {
    onChange({
      ...value,
      questions: value.questions.map((q) =>
        q.id === id ? { ...q, ...patch } : q
      ),
    });
  }

  function addQuestion() {
    onChange({
      ...value,
      questions: [...value.questions, createEmptyQuestion()],
    });
  }

  function removeQuestion(id: string) {
    onChange({
      ...value,
      questions: value.questions.filter((q) => q.id !== id),
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= value.questions.length) return;
    const newQuestions = [...value.questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    onChange({ ...value, questions: newQuestions });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">퀴즈 설정</Label>
        <div className="flex items-center gap-2">
          <Label htmlFor="quiz-toggle" className="text-sm text-muted-foreground">
            퀴즈 사용
          </Label>
          <Switch
            id="quiz-toggle"
            checked={value.enabled}
            onCheckedChange={(checked) =>
              onChange({
                ...value,
                enabled: checked,
                questions: checked && value.questions.length === 0
                  ? [createEmptyQuestion()]
                  : value.questions,
              })
            }
          />
        </div>
      </div>

      {value.enabled && (
        <div className="space-y-4">
          <div className="space-y-3">
            {value.questions.map((question, idx) => (
              <Card key={question.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        disabled={idx === 0}
                        onClick={() => moveQuestion(idx, -1)}
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        disabled={idx === value.questions.length - 1}
                        onClick={() => moveQuestion(idx, 1)}
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Q{idx + 1}
                    </span>
                    <Select
                      value={question.type}
                      onValueChange={(v) =>
                        updateQuestion(question.id, {
                          type: v as QuestionType,
                          options: v === "multiple_choice" ? ["", "", "", ""] : [],
                          correctAnswer: "",
                          keywords: [],
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">객관식</SelectItem>
                        <SelectItem value="short_answer">주관식</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Textarea
                    placeholder="문제를 입력하세요"
                    value={question.text}
                    onChange={(e) =>
                      updateQuestion(question.id, { text: e.target.value })
                    }
                    rows={2}
                  />

                  {question.type === "multiple_choice" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">보기</Label>
                      {question.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctAnswer === opt && opt !== ""}
                            onChange={() =>
                              updateQuestion(question.id, { correctAnswer: opt })
                            }
                            className="shrink-0"
                          />
                          <Input
                            placeholder={`보기 ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...question.options];
                              const oldVal = newOptions[optIdx];
                              newOptions[optIdx] = e.target.value;
                              // Update correctAnswer if it was the old value
                              const patch: Partial<QuestionFormData> = { options: newOptions };
                              if (question.correctAnswer === oldVal) {
                                patch.correctAnswer = e.target.value;
                              }
                              updateQuestion(question.id, patch);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "short_answer" && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">정답</Label>
                        <Input
                          placeholder="정답을 입력하세요"
                          value={question.correctAnswer}
                          onChange={(e) =>
                            updateQuestion(question.id, { correctAnswer: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          키워드 (하나라도 포함되면 정답 처리)
                        </Label>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {question.keywords.map((kw, kwIdx) => (
                            <span
                              key={kwIdx}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                            >
                              {kw}
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  updateQuestion(question.id, {
                                    keywords: question.keywords.filter((_, i) => i !== kwIdx),
                                  })
                                }
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="키워드 입력 후 Enter"
                            value={keywordInput[question.id] ?? ""}
                            onChange={(e) =>
                              setKeywordInput((prev) => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const kw = (keywordInput[question.id] ?? "").trim();
                                if (kw) {
                                  updateQuestion(question.id, {
                                    keywords: [...question.keywords, kw],
                                  });
                                  setKeywordInput((prev) => ({
                                    ...prev,
                                    [question.id]: "",
                                  }));
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5"
              onClick={addQuestion}
            >
              <Plus className="h-4 w-4" />
              문제 추가
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
