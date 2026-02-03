import { useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useProfile } from "@/hooks/useProfile";
import { AccountsSkeleton } from "@/components/skeletons/PageSkeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Wallet, CreditCard, Landmark, Coins, PiggyBank, Bitcoin, MoreHorizontal, Pencil, Trash2, Loader2, Lock, Unlock, ArrowRight } from "lucide-react";
import { ACCOUNT_TYPES, CURRENCIES, Account } from "@/types/database";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  bank: Landmark,
  cash: Coins,
  wallet: Wallet,
  credit: CreditCard,
  investment: PiggyBank,
  crypto: Bitcoin,
  other: MoreHorizontal,
};

function formatCurrency(amount: number, currency: string = "USD") {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const symbol = currencyInfo?.symbol || "$";
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AccountFormData {
  name: string;
  type: string;
  currency: string;
  balance: number;
}

export default function Accounts() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, isCreating, isUpdating, isDeleting } = useAccounts();
  const { preferredCurrency, isLoading: profileLoading } = useProfile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: "",
    type: "bank",
    currency: "USD",
    balance: 0,
  });
  const [lockedBalanceAccountId, setLockedBalanceAccountId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [accountForBalanceChange, setAccountForBalanceChange] = useState<{ account: Account; newBalance: number } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
  });
  const [isTransferring, setIsTransferring] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", type: "bank", currency: "USD", balance: 0 });
    setEditingAccount(null);
  };

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        currency: account.currency,
        balance: Number(account.balance),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await updateAccount({ id: editingAccount.id, ...formData, icon: null, color: null });
      } else {
        await createAccount({ ...formData, icon: null, color: null });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const { user } = useAuth();
  const { toast } = useToast();
  const { createTransaction } = useTransactions();

  const handleVerifyPassword = async () => {
    if (!passwordInput || !reasonInput || !accountForBalanceChange) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    try {
      // Verify password by attempting to sign in with current email
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordInput,
      });

      if (error) {
        toast({ title: "Error", description: "Incorrect password", variant: "destructive" });
        return;
      }

      // Password verified, create transaction for balance change (don't update balance directly)
      const { account, newBalance } = accountForBalanceChange;
      const oldBalance = Number(account.balance);
      const difference = newBalance - oldBalance;

      // Create transaction for the balance change - this will auto-update account balance
      if (difference !== 0) {
        const transactionType = difference > 0 ? "income" : "expense";
        await createTransaction({
          type: transactionType,
          amount: Math.abs(difference),
          account_id: account.id,
          category_id: null,
          description: reasonInput,
          transaction_date: format(new Date(), "yyyy-MM-dd"),
          currency: account.currency,
          frequency: "none",
          notes: `Balance adjustment: ${oldBalance} → ${newBalance}`,
        });
      }

      toast({ title: "Success", description: "Balance adjustment recorded as transaction" });
      setShowPasswordModal(false);
      setPasswordInput("");
      setReasonInput("");
      setAccountForBalanceChange(null);
      setLockedBalanceAccountId(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) {
      toast({ title: "Error", description: "Please fill in all transfer fields", variant: "destructive" });
      return;
    }

    if (parseFloat(transferData.amount) <= 0) {
      toast({ title: "Error", description: "Transfer amount must be greater than 0", variant: "destructive" });
      return;
    }

    try {
      setIsTransferring(true);
      const fromAccount = accounts.find((a) => a.id === transferData.fromAccountId);
      const toAccount = accounts.find((a) => a.id === transferData.toAccountId);
      const amount = parseFloat(transferData.amount);

      if (!fromAccount || !toAccount) {
        throw new Error("Account not found");
      }

      if (Number(fromAccount.balance) < amount) {
        throw new Error("Insufficient balance in source account");
      }

      // Create transfer-sender transaction from source account
      await createTransaction({
        type: "transfer-sender",
        amount: amount,
        account_id: fromAccount.id,
        category_id: null,
        description: `Transfer to ${toAccount.name}`,
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        currency: fromAccount.currency,
        frequency: "none",
        notes: `Transfer to ${toAccount.name}`,
      });

      // Create transfer-receiver transaction to destination account
      await createTransaction({
        type: "transfer-receiver",
        amount: amount,
        account_id: toAccount.id,
        category_id: null,
        description: `Transfer from ${fromAccount.name}`,
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        currency: toAccount.currency,
        frequency: "none",
        notes: `Transfer from ${fromAccount.name}`,
      });

      toast({ title: "Success", description: `Transferred ${formatCurrency(amount, fromAccount.currency)} from ${fromAccount.name} to ${toAccount.name}` });
      setShowTransferModal(false);
      setTransferData({ fromAccountId: "", toAccountId: "", amount: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsTransferring(false);
    }
  };

  if (isLoading || profileLoading) {
    return <AccountsSkeleton />;
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalBalance, preferredCurrency)}
          </p>
        </div>
        <div className="flex gap-2">
          {accounts.length >= 2 && (
            <Button onClick={() => setShowTransferModal(true)} variant="outline" size="sm" className="md:flex hidden">
              <ArrowRight className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()} className="md:hidden">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="hidden md:flex">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit Account" : "Add New Account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Checking"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Account Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Current Balance {editingAccount && <span className="text-muted-foreground text-xs">(Edit via "Edit Balance" option)</span>}</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                  disabled={!!editingAccount}
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAccount ? "Update Account" : "Create Account"}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">No accounts yet</p>
            <p className="mb-4 text-sm text-muted-foreground">Add your first account to start tracking</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = ACCOUNT_ICONS[account.type] || Wallet;
            return (
              <Card key={account.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
                    <Icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{account.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ACCOUNT_TYPES.find((t) => t.value === account.type)?.label || account.type}
                    </p>
                  </div>
                  <div className="text-right">
                    {lockedBalanceAccountId === account.id ? (
                      <div className="space-y-1">
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={Number(account.balance)}
                          onChange={(e) => {
                            if (accountForBalanceChange?.account.id === account.id) {
                              setAccountForBalanceChange({ account, newBalance: parseFloat(e.target.value) });
                            }
                          }}
                          onFocus={(e) => {
                            if (!accountForBalanceChange || accountForBalanceChange.account.id !== account.id) {
                              setAccountForBalanceChange({ account, newBalance: Number(account.balance) });
                            }
                          }}
                          className="w-24 h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full h-6 text-xs"
                          onClick={() => {
                            if (accountForBalanceChange && accountForBalanceChange.account.id === account.id) {
                              setShowPasswordModal(true);
                            }
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className={`font-bold ${Number(account.balance) >= 0 ? "text-foreground" : "text-destructive"}`}>
                          {formatCurrency(Number(account.balance), account.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{account.currency}</p>
                      </>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(account)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLockedBalanceAccountId(lockedBalanceAccountId === account.id ? null : account.id)}>
                        {lockedBalanceAccountId === account.id ? (
                          <>
                            <Unlock className="mr-2 h-4 w-4" />
                            Lock Balance
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Edit Balance
                          </>
                        )}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{account.name}" and all associated transactions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(account.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={isDeleting}
                            >
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Password Verification Modal for Balance Change */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Account Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                To change the account balance, please verify your password and provide a reason for the adjustment.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment</Label>
              <Input
                id="reason"
                placeholder="e.g., Balance correction, Initial setup, etc."
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
              />
              {accountForBalanceChange && (
                <p className="text-xs text-muted-foreground mt-1">
                  {`Old: ${formatCurrency(Number(accountForBalanceChange.account.balance), accountForBalanceChange.account.currency)} → New: ${formatCurrency(accountForBalanceChange.newBalance, accountForBalanceChange.account.currency)}`}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                  setReasonInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerifyPassword}
                disabled={!passwordInput || !reasonInput}
              >
                Verify & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Between Accounts Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Between Accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-account">From Account</Label>
              <Select value={transferData.fromAccountId} onValueChange={(v) => setTransferData({ ...transferData, fromAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(Number(account.balance), account.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-account">To Account</Label>
              <Select value={transferData.toAccountId} onValueChange={(v) => setTransferData({ ...transferData, toAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== transferData.fromAccountId)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(Number(account.balance), account.currency)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                step="0.01"
                min="0"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferData({ fromAccountId: "", toAccountId: "", amount: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleTransfer}
                disabled={!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount || isTransferring}
              >
                {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
