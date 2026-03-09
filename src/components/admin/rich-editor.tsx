"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RichEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function RichEditor({
  value = "",
  onChange,
  placeholder = "콘텐츠 본문을 입력하세요...",
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[240px] px-4 py-3 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  const toolbarItems = [
    {
      icon: Bold,
      label: "굵게",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      icon: Italic,
      label: "기울임",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    { type: "separator" as const },
    {
      icon: Heading1,
      label: "제목 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      label: "제목 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: Heading3,
      label: "제목 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
    },
    { type: "separator" as const },
    {
      icon: List,
      label: "글머리 기호",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      label: "번호 목록",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
  ] as const;

  return (
    <div className="rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
      <div className="flex items-center gap-0.5 border-b border-input px-2 py-1.5">
        {toolbarItems.map((item, idx) => {
          if ("type" in item && item.type === "separator") {
            return (
              <div
                key={`sep-${idx}`}
                className="mx-1 h-5 w-px bg-border"
              />
            );
          }
          const btn = item as {
            icon: React.ElementType;
            label: string;
            action: () => void;
            isActive: boolean;
          };
          return (
            <Button
              key={btn.label}
              type="button"
              variant="ghost"
              size="sm"
              onClick={btn.action}
              className={cn(
                "h-8 w-8 p-0",
                btn.isActive && "bg-accent text-accent-foreground"
              )}
              title={btn.label}
            >
              <btn.icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
