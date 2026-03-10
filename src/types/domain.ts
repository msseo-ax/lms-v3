export type Role = "admin" | "user";
export type SummaryType = "manual" | "ai";
export type FileType = "pdf" | "docx" | "mp4" | "image" | "link";
export type TargetType = "all" | "division" | "user";

export interface Division {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  divisionId: string | null;
  teamId: string | null;
  avatarUrl: string | null;
  division?: Division | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface ContentFile {
  id: string;
  contentId: string;
  fileUrl: string;
  fileType: FileType;
  fileName: string;
  fileSize: number;
}

export interface ContentTarget {
  id: string;
  contentId: string;
  targetType: TargetType;
  targetId: string | null;
}

export interface Content {
  id: string;
  title: string;
  body: string | null;
  summary: string | null;
  summaryType: SummaryType;
  categoryId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  author?: User;
  files?: ContentFile[];
  targets?: ContentTarget[];
}

export interface ContentWithMeta extends Content {
  isRead: boolean;
  isTargeted: boolean;
  readRate?: number;
  fileCount: number;
  targetLabels: string[];
}

export interface ReadLog {
  id: string;
  contentId: string;
  userId: string;
  readAt: string;
  durationSeconds: number;
}

export interface FileAccessLog {
  id: string;
  contentFileId: string;
  userId: string;
  accessedAt: string;
}
