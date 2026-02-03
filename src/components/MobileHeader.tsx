import { MobileSidebar } from "./MobileSidebar";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:hidden">
      <MobileSidebar />
      <h1 className="text-lg font-bold text-foreground">MoneyTrack</h1>
    </header>
  );
}
