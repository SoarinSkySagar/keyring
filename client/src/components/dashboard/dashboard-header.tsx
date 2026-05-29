import { UserMenu } from "@/components/dashboard/user-menu";

export function DashboardHeader({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between pl-14 pr-4 sm:pr-6 lg:px-6 sticky top-0 z-30">
      <h1
        className="text-lg font-bold text-foreground"
        style={{ fontFamily: "var(--font-syne)" }}
      >
        {title}
      </h1>

      <UserMenu />
    </header>
  );
}
