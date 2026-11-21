import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, useQueryError } from "@/components/ui/error-state";
import { useCategories } from "@/hooks/useCategories";
import { Plus, Trash2, Pencil, Tag, icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORICAL_COLORS, SEMANTIC_COLORS } from "@/lib/palette";

const CategoryIcon = ({ icon, color }: { icon: string | null; color: string | null }) => {
  const iconName = icon || "Tag";
  const bgColor = color ? `${color}20` : `${SEMANTIC_COLORS.neutral}20`;
  
  const isLucideIcon = /^[A-Z][a-zA-Z0-9]*$/.test(iconName);
  
  if (isLucideIcon && iconName in icons) {
    const LucideIconComponent = icons[iconName as keyof typeof icons] as LucideIcon;
    return (
      <div 
        className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        <LucideIconComponent className="h-4 w-4 md:h-5 md:w-5" style={{ color: color || SEMANTIC_COLORS.neutral }} />
      </div>
    );
  }
  
  return (
    <div
      className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full shrink-0"
      style={{ backgroundColor: bgColor }}
    >
      <Tag className="h-4 w-4 md:h-5 md:w-5" style={{ color: color || SEMANTIC_COLORS.neutral }} />
    </div>
  );
};

const CATEGORY_COLORS: string[] = [...CATEGORICAL_COLORS];

const CATEGORY_ICONS = [
  "Home", "Car", "UtensilsCrossed", "ShoppingCart", "Pill", "Clapperboard", "Plane", "BookOpen",
  "Wallet", "CreditCard", "Gift", "Shirt", "Zap", "Smartphone", "Dumbbell", "Music",
  "Dog", "Baby", "Hospital", "GraduationCap", "Briefcase", "Landmark", "TrendingUp", "Target",
];

export function CategoriesSection() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory, isCreating } = useCategories();
  const error = useQueryError("categories");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);

  const resetForm = () => {
    setName("");
    setType("expense");
    setColor(CATEGORY_COLORS[0]);
    setIcon(CATEGORY_ICONS[0]);
    setEditingCategory(null);
  };

  const handleOpenDialog = (categoryId?: string) => {
    if (categoryId) {
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        setName(cat.name);
        setType(cat.type);
        setColor(cat.color || CATEGORY_COLORS[0]);
        setIcon(cat.icon || CATEGORY_ICONS[0]);
        setEditingCategory(categoryId);
      }
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    if (editingCategory) {
      await updateCategory({ id: editingCategory, name: name.trim(), icon, color });
    } else {
      await createCategory({ name: name.trim(), type, icon, color });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
  };

  const expenseCategories = categories.filter(c => c.type === "expense");
  const incomeCategories = categories.filter(c => c.type === "income");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState message="We couldn't load your categories. Check your connection and try again." />
        </CardContent>
      </Card>
    );
  }

  const CategoryList = ({ items, emptyText }: { items: typeof categories; emptyText: string }) => (
    <div className="space-y-1.5">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        items.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border p-2 md:p-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <CategoryIcon icon={cat.icon} color={cat.color} />
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm md:text-base truncate">{cat.name}</p>
                {cat.is_default && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
            </div>
            {!cat.is_default && (
              <div className="flex gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label={`Edit ${cat.name}`}
                  onClick={() => handleOpenDialog(cat.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete category?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{cat.name}". This action can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cat.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg md:text-xl">Categories</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="settings-category-name">Name</Label>
                <Input 
                  id="settings-category-name"
                  placeholder="Category name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                />
              </div>
              
              {!editingCategory && (
                <div className="space-y-1.5">
                  <Label htmlFor="settings-category-type">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                    <SelectTrigger id="settings-category-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label id="settings-category-icon-label">Icon</Label>
                <div role="group" aria-labelledby="settings-category-icon-label" className="grid grid-cols-8 gap-2">
                  {CATEGORY_ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Use ${i} icon`}
                      aria-pressed={icon === i}
                      onClick={() => setIcon(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors ${
                        icon === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label id="settings-category-color-label">Color</Label>
                <div role="group" aria-labelledby="settings-category-color-label" className="grid grid-cols-9 gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Use ${c} as category color`}
                      aria-pressed={color === c}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:brightness-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              
              <Button onClick={handleSubmit} disabled={isCreating || !name.trim()} className="w-full">
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expense" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="expense">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <TabsContent value="expense" className="mt-4">
            <CategoryList items={expenseCategories} emptyText="No expense categories" />
          </TabsContent>
          <TabsContent value="income" className="mt-4">
            <CategoryList items={incomeCategories} emptyText="No income categories" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
