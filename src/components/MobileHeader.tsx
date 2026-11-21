import { MobileSidebar } from "./MobileSidebar";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:hidden">
      <MobileSidebar />
      <span className="text-base font-semibold tracking-[-0.02em] text-foreground">EZfinance</span>
    </header>
  );
}
