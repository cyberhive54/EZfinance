import { useState } from "react";
import { cn } from "@/lib/utils";
import { User, Settings as SettingsIcon, Tag, Bell, Shield, Flag } from "lucide-react";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { CategoriesSection } from "@/components/settings/CategoriesSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { PrioritiesSection } from "@/components/settings/PrioritiesSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type SettingsTab = "profile" | "preferences" | "categories" | "priorities" | "notifications" | "security";

const SETTINGS_TABS = [
  { id: "profile" as const, label: "Profile", icon: User, component: ProfileSection },
  { id: "preferences" as const, label: "Preferences", icon: SettingsIcon, component: PreferencesSection },
  { id: "categories" as const, label: "Categories", icon: Tag, component: CategoriesSection },
  { id: "priorities" as const, label: "Priorities", icon: Flag, component: PrioritiesSection },
  { id: "notifications" as const, label: "Notifications", icon: Bell, component: NotificationsSection },
  { id: "security" as const, label: "Security", icon: Shield, component: SecuritySection },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSection />;
      case "preferences":
        return <PreferencesSection />;
      case "categories":
        return <CategoriesSection />;
      case "priorities":
        return <PrioritiesSection />;
      case "notifications":
        return <NotificationsSection />;
      case "security":
        return <SecuritySection />;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Mobile: Accordion Layout */}
      <div className="md:hidden">
        <Accordion type="single" collapsible defaultValue="profile" className="space-y-2">
          {SETTINGS_TABS.map((tab) => (
            <AccordionItem
              key={tab.id}
              value={tab.id}
              className="border rounded-lg bg-card px-4"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <tab.icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{tab.label}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <tab.component />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Desktop/Tablet: Sidebar Layout */}
      <div className="hidden md:flex md:gap-6 lg:gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-48 shrink-0 lg:w-56">
          <nav className="sticky top-4 space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
