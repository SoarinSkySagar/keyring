import { getCurrentUser } from "@/lib/privy";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Settings } from "lucide-react";

export async function DashboardHeader({ title }: { title: string }) {
  const user = await getCurrentUser();

  const displayName = user?.name ?? user?.email ?? "Account";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between pl-14 pr-4 sm:pr-6 lg:px-6 sticky top-0 z-30">
      <h1
        className="text-lg font-bold text-foreground"
        style={{ fontFamily: "var(--font-syne)" }}
      >
        {title}
      </h1>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors outline-none cursor-pointer"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">
              {displayName}
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground leading-tight">
                {user.email}
              </p>
            )}
          </div>
          <Avatar className="w-8 h-8 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <p className="font-medium text-sm">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <a
              href="/dashboard/settings"
              className="flex items-center gap-2 w-full"
            >
              <Settings className="w-4 h-4" /> Settings
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="w-full p-0">
            <SignOutButton />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
