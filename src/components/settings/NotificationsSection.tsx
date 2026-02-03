import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const NOTIFICATION_OPTIONS = [
  { id: "notifications", label: "Notifications", description: "Receive in-app notifications" },
  { id: "email", label: "Email Notifications", description: "Receive updates via email" },
  { id: "push", label: "Push Notifications", description: "Receive push notifications on your device" },
  { id: "weekly", label: "Weekly Reports", description: "Get a weekly summary of your finances" },
  { id: "budget", label: "Budget Alerts", description: "Get notified when approaching budget limits" },
  { id: "daily", label: "Daily Log Alert", description: "Reminder to log your daily transactions" },
];

export function NotificationsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Notification settings are not functional yet. Coming soon!
        </p>
        <div className="space-y-4">
          {NOTIFICATION_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-center justify-between">
              <div>
                <Label className="text-base">{option.label}</Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <Switch disabled />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
