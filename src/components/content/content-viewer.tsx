"use client";

import Link from "next/link";
import type { Content, ContentFile, Category, User } from "@/types/domain";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  Play,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Sparkles,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { ReadTracker } from "./read-tracker";

interface ContentViewerProps {
  content: Content;
  category: Category;
  author: User;
  files: ContentFile[];
  targetLabels: string[];
}

function getFileIcon(fileType: ContentFile["fileType"]) {
  switch (fileType) {
    case "pdf":
      return <FileText className="h-5 w-5 text-red-500" />;
    case "docx":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "mp4":
      return <Play className="h-5 w-5 text-purple-500" />;
    case "image":
      return <ImageIcon className="h-5 w-5 text-green-500" />;
    case "link":
      return <ExternalLink className="h-5 w-5 text-sky-500" />;
  }
}

export function ContentViewer({
  content,
  category,
  author,
  files,
  targetLabels,
}: ContentViewerProps) {
  function getAccessUrl(fileUrl: string): string {
    return `/api/files/access?fileUrl=${encodeURIComponent(fileUrl)}`;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <ReadTracker contentId={content.id} />

      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        피드로 돌아가기
      </Link>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="secondary">{category.name}</Badge>
        {targetLabels.map((label) => (
          <Badge key={label} variant="outline">
            {label}
          </Badge>
        ))}
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-3">
        {content.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-6">
        <span className="inline-flex items-center gap-1">
          <UserIcon className="h-3.5 w-3.5" />
          {author.name}
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(content.createdAt)}
        </span>
        <span>·</span>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            content.summaryType === "ai"
              ? "border-violet-300 text-violet-600"
              : "border-slate-300 text-slate-600"
          )}
        >
          {content.summaryType === "ai" ? "AI 요약" : "직접 작성"}
        </Badge>
      </div>

      <Separator />

      {content.summary && (
        <Card className="my-6 border-slate-200 bg-slate-50/60">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              {content.summaryType === "ai" && (
                <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              )}
              <p className="text-sm text-slate-700 leading-relaxed">
                {content.summary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {content.body && (
        <div
          className="my-6 text-base leading-7 text-slate-800 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      )}

      {files.length > 0 && (
        <>
          <Separator className="my-6" />

          <div>
            <h2 className="text-lg font-semibold mb-4">
              첨부 파일 ({files.length})
            </h2>

            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 shrink-0">
                          {getFileIcon(file.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.fileName}
                          </p>
                          {file.fileSize > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </p>
                          )}
                        </div>
                        {file.fileType === "link" ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              열기
                            </a>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={getAccessUrl(file.fileUrl)} download={file.fileName}>
                              <Download className="h-4 w-4" />
                              다운로드
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {file.fileType === "pdf" && (
                    <div className="mt-2 rounded-lg border overflow-hidden">
                      <iframe
                        src={getAccessUrl(file.fileUrl)}
                        title={file.fileName}
                        className="w-full h-[600px]"
                      />
                    </div>
                  )}

                  {file.fileType === "image" && (
                    <div className="mt-2 rounded-lg border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getAccessUrl(file.fileUrl)}
                        alt={file.fileName}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {file.fileType === "mp4" && (
                    <div className="mt-2 rounded-lg border overflow-hidden">
                      <video
                        src={getAccessUrl(file.fileUrl)}
                        controls
                        className="w-full"
                      >
                        <track kind="captions" />
                      </video>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
