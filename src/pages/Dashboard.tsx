import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProfile, formatCurrency } from "@/hooks/useProfile";
import { DashboardSkeleton } from "@/components/skeletons/PageSkeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { preferredCurrency } = useProfile();
  const { accounts, transactions, totalBalance, monthlyIncome, monthlyExpenses, isLoading } = useDashboardData(preferredCurrency);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Hi, {firstName}!</h1>
        <p className="text-muted-foreground">Here's your financial overview</p>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-primary text-primary-foreground">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold md:text-4xl">{formatCurrency(totalBalance, preferredCurrency)}</p>
          <div className="mt-4 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs opacity-75">Income</p>
                <p className="font-semibold">{formatCurrency(monthlyIncome, preferredCurrency)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs opacity-75">Expenses</p>
                <p className="font-semibold">{formatCurrency(monthlyExpenses, preferredCurrency)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats - Responsive grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Wallet className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accounts</p>
              <p className="text-xl font-bold text-foreground">{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              {monthlyIncome >= monthlyExpenses ? (
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              ) : (
                <TrendingDown className="h-5 w-5 text-accent-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net</p>
              <p className={`text-xl font-bold ${monthlyIncome >= monthlyExpenses ? "text-foreground" : "text-destructive"}`}>
                {formatCurrency(monthlyIncome - monthlyExpenses, preferredCurrency)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="hidden md:block">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <ArrowUpRight className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(monthlyIncome, preferredCurrency)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hidden md:block">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <ArrowDownRight className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(monthlyExpenses, preferredCurrency)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Add your first transaction to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {transactions.slice(0, 6).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    transaction.type === "income" ? "bg-accent" : "bg-muted"
                  }`}
                >
                  {transaction.type === "income" ? (
                    <ArrowUpRight className="h-5 w-5 text-accent-foreground" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {transaction.description || "Untitled"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.type === "income" ? "text-foreground" : "text-destructive"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  {transaction.currency !== preferredCurrency && (
                    <p className="text-xs text-muted-foreground">{transaction.currency}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
