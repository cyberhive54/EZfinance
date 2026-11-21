import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "@/lib/navigation";

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 hidden border-t border-border bg-background/90 backdrop-blur-md md:block"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-1 overflow-x-auto px-3 lg:max-w-6xl">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavActive(location.pathname, item.to);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex shrink-0 flex-col items-center justify-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex-row lg:gap-2 lg:px-4",
                isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.25px]")} />
              <span className={cn("text-[11px] lg:text-sm", isActive && "font-medium")}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
