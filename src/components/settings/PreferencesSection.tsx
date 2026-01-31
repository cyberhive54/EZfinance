import { useTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/useProfile";
import { useAccounts } from "@/hooks/useAccounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CURRENCIES } from "@/types/database";
import { Moon, Sun } from "lucide-react";

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

export function PreferencesSection() {
  const { theme, toggleTheme } = useTheme();
  const { profile, preferredCurrency, updateProfile } = useProfile();
  const { accounts } = useAccounts();
  const { toast } = useToast();

  const handleCurrencyChange = async (currency: string) => {
    try {
      await updateProfile({ preferred_currency: currency });
      toast({ title: "Currency updated" });
    } catch {
      toast({ title: "Failed to update currency", variant: "destructive" });
    }
  };

  const handleTimezoneChange = async (timezone: string) => {
    try {
      await updateProfile({ timezone });
      toast({ title: "Timezone updated" });
    } catch {
      toast({ title: "Failed to update timezone", variant: "destructive" });
    }
  };

  const handleDefaultAccountChange = async (accountId: string) => {
    try {
      await updateProfile({ default_account_id: accountId === "none" ? null : accountId });
      toast({ title: "Default account updated" });
    } catch {
      toast({ title: "Failed to update default account", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <div>
              <Label className="text-base">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle dark/light theme</p>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Timezone */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={profile?.timezone || "UTC"} onValueChange={handleTimezoneChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={preferredCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Account */}
          <div className="space-y-2">
            <Label>Default Account</Label>
            <Select
              value={profile?.default_account_id || "none"}
              onValueChange={handleDefaultAccountChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pre-selected when adding transactions
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
