import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { isNavActive, NAV_ITEMS } from "@/lib/navigation";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="p-5">
          <SheetTitle className="text-left text-lg font-semibold tracking-[-0.02em]">EZfinance</SheetTitle>
        </SheetHeader>
        <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(location.pathname, item.to);
            const Icon = item.icon;

            return (
              <SheetClose asChild key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
