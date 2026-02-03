import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useProfile, formatCurrency } from "@/hooks/useProfile";
import { AnalyticsSkeleton } from "@/components/skeletons/PageSkeletons";
import { TrendingUp, TrendingDown, PiggyBank, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

export default function Analytics() {
  const { monthlyData, categoryBreakdown, summary, isLoading } = useAnalytics();
  const { preferredCurrency } = useProfile();

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted))", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Analytics</h1>
        <p className="text-muted-foreground">{format(new Date(), "MMMM yyyy")} Overview</p>
      </div>

      {/* Summary Cards - Responsive grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-semibold text-foreground truncate">
                  {fmt(summary?.thisMonthIncome || 0)}
                </p>
                {summary?.incomeChange !== 0 && (
                  <p className={`text-xs ${summary?.incomeChange && summary.incomeChange > 0 ? "text-primary" : "text-destructive"}`}>
                    {summary?.incomeChange && summary.incomeChange > 0 ? "+" : ""}
                    {summary?.incomeChange?.toFixed(1)}% vs last month
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-destructive/10 p-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-semibold text-foreground truncate">
                  {fmt(summary?.thisMonthExpenses || 0)}
                </p>
                {summary?.expenseChange !== 0 && (
                  <p className={`text-xs ${summary?.expenseChange && summary.expenseChange < 0 ? "text-primary" : "text-destructive"}`}>
                    {summary?.expenseChange && summary.expenseChange > 0 ? "+" : ""}
                    {summary?.expenseChange?.toFixed(1)}% vs last month
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <PiggyBank className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Savings Rate</p>
                <p className="text-lg font-semibold text-foreground">
                  {summary?.savingsRate?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Net</p>
                <p className={`text-lg font-semibold truncate ${(summary?.thisMonthIncome || 0) - (summary?.thisMonthExpenses || 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                  {fmt((summary?.thisMonthIncome || 0) - (summary?.thisMonthExpenses || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Responsive layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income vs Expenses Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Income vs Expenses (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Bar dataKey="income" fill="hsl(var(--primary))" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No expenses this month</p>
            ) : (
              <>
                <div className="h-48 lg:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        dataKey="amount"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => fmt(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {categoryBreakdown.slice(0, 6).map((cat, index) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 shrink-0 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate text-sm text-muted-foreground">{cat.name}</span>
                      <span className="ml-auto text-sm font-medium text-foreground whitespace-nowrap">{fmt(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
