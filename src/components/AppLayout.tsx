import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-4 md:pb-20">
      {/* Mobile Header with Hamburger Menu */}
      <MobileHeader />
      
      {/* Main Content - Responsive container */}
      <main className="mx-auto w-full px-4 py-4 md:max-w-3xl md:py-6 lg:max-w-5xl xl:max-w-6xl">
        <Outlet />
      </main>
      
      {/* Bottom Nav - Hidden on mobile, shown on tablet/desktop */}
      <BottomNav />
    </div>
  );
}
