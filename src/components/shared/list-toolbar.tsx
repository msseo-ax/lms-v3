interface ListToolbarProps {
  children: React.ReactNode;
}

export function ListToolbar({ children }: ListToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">{children}</div>
  );
}
