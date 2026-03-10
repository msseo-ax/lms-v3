import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ContentRowActions } from "@/components/admin/content-row-actions";

interface ContentRowProps {
  id: string;
  title: string;
  categoryName: string;
  targetLabels: string[];
  createdAt: string;
  readRate: number;
}

export function ContentRow({
  id,
  title,
  categoryName,
  targetLabels,
  createdAt,
  readRate,
}: ContentRowProps) {
  return (
    <TableRow className="group">
      <TableCell>
        <Link
          href={`/admin/contents/${id}/edit`}
          className="block max-w-[34ch] truncate font-medium hover:underline underline-offset-4"
          title={title}
        >
          {title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="whitespace-nowrap">
          {categoryName}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {targetLabels.map((label) => (
            <Badge key={label} variant="outline" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{createdAt}</TableCell>
      <TableCell>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            readRate >= 80
              ? "text-emerald-600"
              : readRate >= 50
                ? "text-amber-600"
                : "text-red-500"
          )}
        >
          {readRate}%
        </span>
      </TableCell>
      <TableCell>
        <ContentRowActions id={id} />
      </TableCell>
    </TableRow>
  );
}
