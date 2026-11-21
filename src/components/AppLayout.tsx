import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-24">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <MobileHeader />
      <main
        id="main-content"
        className="mx-auto w-full px-4 py-5 md:max-w-3xl md:py-6 lg:max-w-5xl xl:max-w-6xl"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
