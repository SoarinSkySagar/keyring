import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/actions/auth";
import { LogOut, Settings } from "lucide-react";

export async function DashboardHeader({ title }: { title: string }) {
  const session = await auth();
  const user = session?.user;

  // Display name depends on auth method
  const displayName = (() => {
    if (user?.provider === "metamask" && user.walletAddress) {
      // Shorten wallet address: 0x1234…abcd
      const addr = user.walletAddress;
      return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    }
    if (user?.provider === "google" && user.name) return user.name;
    return user?.email ?? "Account";
  })();

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
            <p className="text-xs text-muted-foreground leading-tight">
              {user?.email}
            </p>
          </div>
          <Avatar className="w-8 h-8 border border-border">
            <AvatarImage src={user?.image ?? ""} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <p className="font-medium text-sm">{user?.name ?? "Account"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
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
          <form action={signOutAction} className="w-full">
            <DropdownMenuItem className="w-full p-0">
              <button
                type="submit"
                className="flex items-center gap-2 w-full px-1.5 py-1 text-destructive"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
