import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const NOTIFICATION_OPTIONS = [
  { id: "notifications", label: "In-app notifications", description: "Alerts while you're using EZfinance" },
  { id: "email", label: "Email", description: "Updates sent to your email address" },
  { id: "push", label: "Push", description: "Notifications on this device" },
  { id: "weekly", label: "Weekly summary", description: "A recap of your spending each week" },
  { id: "budget", label: "Budget alerts", description: "A heads-up when you near a budget limit" },
  { id: "daily", label: "Daily reminder", description: "A prompt to log the day's transactions" },
];

export function NotificationsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Notifications aren't available in this version. EZfinance won't send email or push messages — your data stays in
          your own account.
        </p>
        <div className="divide-y">
          {NOTIFICATION_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <Label htmlFor={option.id} className="text-sm font-medium">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <Switch id={option.id} disabled aria-label={option.label} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
