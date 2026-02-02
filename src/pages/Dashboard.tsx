import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardStats, DateFilterType } from "@/hooks/useDashboardStats";
import { useProfile, formatCurrency } from "@/hooks/useProfile";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { DashboardSkeleton } from "@/components/skeletons/PageSkeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  PiggyBank,
  Zap,
  Grid3x3,
  List,
  BarChart3,
  Calendar as CalendarIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type TransactionLayout = "grid" | "list";

export default function Dashboard() {
  const { user } = useAuth();
  const { preferredCurrency } = useProfile();
  const { accounts: allAccounts, transactions: recentTransactions, totalBalance, monthlyIncome: initialIncome, monthlyExpenses: initialExpenses, isLoading: dashboardLoading } = useDashboardData(preferredCurrency);
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  
  // Date filter state
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("this-month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [customMonth, setCustomMonth] = useState<string>("");
  const [customYear, setCustomYear] = useState<string>(new Date().getFullYear().toString());
  const [searchMonthInput, setSearchMonthInput] = useState("");
  const [transactionLayout, setTransactionLayout] = useState<TransactionLayout>("grid");

  // Get filtered stats
  const { stats, isLoading: statsLoading } = useDashboardStats(
    preferredCurrency,
    dateFilterType,
    customStartDate,
    customEndDate,
    customMonth,
    customYear
  );

  // Only show loading state during initial dashboard data load or when accounts/categories are missing
  const isInitialLoading = dashboardLoading || !accounts || !categories || accounts.length === 0 || categories.length === 0;

  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const income = stats?.income || 0;
  const expenses = stats?.expenses || 0;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  // Process categories data for charts - ensure categories are available
  const incomeByCategories = useMemo(() => {
    if (!stats?.incomeByCategory || !categories || categories.length === 0) return [];
    return Object.entries(stats.incomeByCategory)
      .map(([categoryId, amount]) => ({
        name: categories.find((c) => c.id === categoryId)?.name || categoryId,
        value: amount,
      }))
      .filter((item) => item.value > 0);
  }, [stats?.incomeByCategory, categories]);

  const expensesByCategories = useMemo(() => {
    if (!stats?.expensesByCategory || !categories || categories.length === 0) return [];
    return Object.entries(stats.expensesByCategory)
      .map(([categoryId, amount]) => ({
        name: categories.find((c) => c.id === categoryId)?.name || categoryId,
        value: amount,
      }))
      .filter((item) => item.value > 0);
  }, [stats?.expensesByCategory, categories]);

  // Process accounts data for charts - ensure accounts are available
  const incomeByAccounts = useMemo(() => {
    if (!stats?.incomeByAccount || !accounts || accounts.length === 0) return [];
    return Object.entries(stats.incomeByAccount)
      .map(([accountId, amount]) => ({
        name: accounts.find((a) => a.id === accountId)?.name || accountId,
        income: amount,
      }))
      .filter((item) => item.income > 0);
  }, [stats?.incomeByAccount, accounts]);

  const expensesByAccounts = useMemo(() => {
    if (!stats?.expensesByAccount || !accounts || accounts.length === 0) return [];
    return Object.entries(stats.expensesByAccount)
      .map(([accountId, amount]) => ({
        name: accounts.find((a) => a.id === accountId)?.name || accountId,
        expenses: amount,
      }))
      .filter((item) => item.expenses > 0);
  }, [stats?.expensesByAccount, accounts]);

  // Merge accounts data
  const accountsChartData = useMemo(() => {
    const merged: Record<string, { name: string; income: number; expenses: number }> = {};
    
    incomeByAccounts.forEach((item) => {
      if (!merged[item.name]) {
        merged[item.name] = { name: item.name, income: 0, expenses: 0 };
      }
      merged[item.name].income = item.income;
    });

    expensesByAccounts.forEach((item) => {
      if (!merged[item.name]) {
        merged[item.name] = { name: item.name, income: 0, expenses: 0 };
      }
      merged[item.name].expenses = item.expenses;
    });

    return Object.values(merged);
  }, [incomeByAccounts, expensesByAccounts]);

  // Chart colors
  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const chartConfig = {
    income: {
      label: "Income",
      color: "#10b981",
    },
    expenses: {
      label: "Expenses",
      color: "#ef4444",
    },
  };

  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [accountChartType, setAccountChartType] = useState<"line" | "bar">("bar");

  const renderChart = (data: any[], type: "line" | "bar", config: any) => {
    if (type === "line") {
      return (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="income" stroke={config.income.color} strokeWidth={2} />
          <Line type="monotone" dataKey="expenses" stroke={config.expenses.color} strokeWidth={2} />
        </LineChart>
      );
    } else {
      return (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="income" fill={config.income.color} />
          <Bar dataKey="expenses" fill={config.expenses.color} />
        </BarChart>
      );
    }
  };

  return (
    <div className="space-y-8 pb-4">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground md:text-5xl">
          Welcome Back, {firstName} 👋
        </h1>
        <p className="text-base text-muted-foreground">This is your Financial Overview Report</p>
      </div>

      {/* Date Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Label className="text-sm font-medium">Filter by Date:</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilterType === "this-month"
                ? "Current Month"
                : dateFilterType === "this-week"
                  ? "This Week"
                  : dateFilterType === "last-7-days"
                    ? "Last 7 Days"
                    : dateFilterType === "last-30-days"
                      ? "Last 30 Days"
                      : dateFilterType === "this-year"
                        ? "This Year"
                        : dateFilterType === "last-365-days"
                          ? "Last 365 Days"
                          : dateFilterType === "custom-date"
                            ? "Custom Date"
                            : dateFilterType === "custom-month"
                              ? "Custom Month"
                              : "Custom Year"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-4" align="start">
            <div className="space-y-3">
              <Select value={dateFilterType} onValueChange={(v: any) => setDateFilterType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="last-365-days">Last 365 Days</SelectItem>
                  <SelectItem value="custom-date">Custom Date</SelectItem>
                  <SelectItem value="custom-month">Custom Month</SelectItem>
                  <SelectItem value="custom-year">Custom Year</SelectItem>
                </SelectContent>
              </Select>

              {dateFilterType === "custom-date" && (
                <div className="space-y-3 border-t pt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate ? format(new Date(customStartDate), "MMM dd, yyyy") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customStartDate ? new Date(customStartDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setCustomStartDate(format(date, "yyyy-MM-dd"));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(new Date(customEndDate), "MMM dd, yyyy") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customEndDate ? new Date(customEndDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setCustomEndDate(format(date, "yyyy-MM-dd"));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {dateFilterType === "custom-month" && (
                <div className="space-y-3 border-t pt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Input
                      type="number"
                      placeholder="2026"
                      value={customYear}
                      onChange={(e) => setCustomYear(e.target.value)}
                      min={2000}
                      max={2100}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Month</Label>
                    <Input
                      placeholder="Search month..."
                      value={searchMonthInput}
                      onChange={(e) => setSearchMonthInput(e.target.value.toLowerCase())}
                      className="h-8 mb-2"
                    />
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded">
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1;
                        const monthName = format(new Date(parseInt(customYear), month - 1), "MMMM");
                        const monthValue = `${customYear}-${String(month).padStart(2, "0")}`;

                        if (!monthName.toLowerCase().includes(searchMonthInput)) return null;

                        return (
                          <button
                            key={month}
                            onClick={() => setCustomMonth(monthValue)}
                            className={`w-full text-left px-3 py-2 text-sm ${customMonth === monthValue ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                          >
                            {monthName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {dateFilterType === "custom-year" && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Input
                    type="number"
                    placeholder="2026"
                    value={customYear}
                    onChange={(e) => setCustomYear(e.target.value)}
                    min={2000}
                    max={2100}
                  />
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards - 4 Column */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm font-medium opacity-90">Available Balance</p>
                <p className="text-3xl font-bold">{formatCurrency(totalBalance, preferredCurrency)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/20">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Income Card */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Total Income</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(income, preferredCurrency)}</p>
                <p className="mt-2 text-xs text-accent">Period Total</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expense Card */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Total Expense</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(expenses, preferredCurrency)}</p>
                <p className="mt-2 text-xs text-destructive">Period Total</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/20">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Rate Card */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Savings Rate</p>
                <p className="text-3xl font-bold text-foreground">{savingsRate.toFixed(1)}%</p>
                <p className="mt-2 text-xs text-muted-foreground">of income saved</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                <PiggyBank className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Row 1: Income & Expenses (75%) + Expenses by Categories (25%) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Chart 1: Income & Expenses with Type Switch */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Income & Expenses</CardTitle>
              <Tabs value={chartType} onValueChange={(v: any) => setChartType(v)} className="w-auto">
                <TabsList className="grid w-auto grid-cols-2 gap-1">
                  <TabsTrigger value="line" className="px-2 py-1 text-xs">Line</TabsTrigger>
                  <TabsTrigger value="bar" className="px-2 py-1 text-xs">Bar</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  {renderChart(stats?.chartData || [], chartType, chartConfig)}
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Expenses by Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesByCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${formatCurrency(value, preferredCurrency)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByCategories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value, preferredCurrency)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">No expense data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Income by Categories + Income by Accounts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 3: Income by Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Income by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeByCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={incomeByCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${formatCurrency(value, preferredCurrency)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeByCategories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value, preferredCurrency)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">No income data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 4: Income & Expenses by Account */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-sm font-semibold">Income & Expenses by Account</CardTitle>
              <Tabs value={accountChartType} onValueChange={(v: any) => setAccountChartType(v)} className="w-auto">
                <TabsList className="grid w-auto grid-cols-2 gap-1">
                  <TabsTrigger value="bar" className="px-2 py-1 text-xs">Bar</TabsTrigger>
                  <TabsTrigger value="line" className="px-2 py-1 text-xs">Line</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {accountsChartData.length > 0 ? (
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height={300}>
                    {renderChart(accountsChartData, accountChartType, chartConfig)}
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">No account data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Transactions with Layout Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold text-foreground">Recent Transactions</h2>
          <Tabs value={transactionLayout} onValueChange={(v: any) => setTransactionLayout(v)}>
            <TabsList className="grid w-auto grid-cols-2 gap-1">
              <TabsTrigger value="grid" title="Grid view">
                <Grid3x3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" title="List view">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {recentTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-lg font-semibold text-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Start adding transactions to track your finances</p>
            </CardContent>
          </Card>
        ) : transactionLayout === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentTransactions.slice(0, 6).map((transaction) => (
              <Card key={transaction.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                        transaction.type === "income" ? "bg-accent/20" : "bg-destructive/20"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-6 w-6 text-accent" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {transaction.description || "Untitled"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-border">
                    <p
                      className={`font-bold ${
                        transaction.type === "income" ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    {transaction.currency !== preferredCurrency && (
                      <span className="text-xs text-muted-foreground">{transaction.currency}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {recentTransactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          transaction.type === "income" ? "bg-accent/20" : "bg-destructive/20"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-5 w-5 text-accent" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {transaction.description || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-bold ${
                          transaction.type === "income" ? "text-accent" : "text-destructive"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      {transaction.currency !== preferredCurrency && (
                        <span className="text-xs text-muted-foreground">{transaction.currency}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
