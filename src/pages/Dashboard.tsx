import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProfile, formatCurrency } from "@/hooks/useProfile";
import { DashboardSkeleton } from "@/components/skeletons/PageSkeletons";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { preferredCurrency } = useProfile();
  const { accounts, transactions, totalBalance, monthlyIncome, monthlyExpenses, isLoading } = useDashboardData(preferredCurrency);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  return (
    <div className="space-y-8 pb-4">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground md:text-5xl">
          Welcome Back, {firstName} 👋
        </h1>
        <p className="text-base text-muted-foreground">This is your Financial Overview Report</p>
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
                <p className="text-3xl font-bold text-foreground">{formatCurrency(monthlyIncome, preferredCurrency)}</p>
                <p className="mt-2 text-xs text-accent">↑ 18% from last period</p>
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
                <p className="text-3xl font-bold text-foreground">{formatCurrency(monthlyExpenses, preferredCurrency)}</p>
                <p className="mt-2 text-xs text-destructive">↓ 33% from last period</p>
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
                <p className="mt-2 text-xs text-muted-foreground">of your monthly income</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                <PiggyBank className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-lg font-semibold text-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Start adding transactions to track your finances</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {transactions.slice(0, 6).map((transaction) => (
              <Card key={transaction.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                        transaction.type === "income" 
                          ? "bg-accent/20" 
                          : "bg-destructive/20"
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
                        transaction.type === "income" 
                          ? "text-accent" 
                          : "text-destructive"
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
        )}
      </div>
    </div>
  );
}
