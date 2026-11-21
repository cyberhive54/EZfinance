import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  PiggyBank,
  BarChart3,
  Tags,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { to: "/accounts", icon: Wallet, label: "Accounts" },
  { to: "/budget", icon: Target, label: "Budget" },
  { to: "/goals", icon: PiggyBank, label: "Goals" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/categories", icon: Tags, label: "Categories" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export function isNavActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}
