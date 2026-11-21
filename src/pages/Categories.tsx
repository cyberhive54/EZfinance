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
import { ErrorState, useQueryError } from "@/components/ui/error-state";
import { useCategories } from "@/hooks/useCategories";
import { Plus, Trash2, Tag, Pencil, icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORICAL_COLORS, SEMANTIC_COLORS } from "@/lib/palette";

// Helper to render either a Lucide icon or emoji
const CategoryIcon = ({ icon, color }: { icon: string | null; color: string | null }) => {
  const iconName = icon || "Tag";
  const bgColor = color ? `${color}20` : `${SEMANTIC_COLORS.neutral}20`;
  
  // Check if it's a Lucide icon name (starts with uppercase and no emoji)
  const isLucideIcon = /^[A-Z][a-zA-Z0-9]*$/.test(iconName);
  
  if (isLucideIcon && iconName in icons) {
    const LucideIconComponent = icons[iconName as keyof typeof icons] as LucideIcon;
    return (
      <div 
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: bgColor }}
      >
        <LucideIconComponent className="h-5 w-5" style={{ color: color || SEMANTIC_COLORS.neutral }} />
      </div>
    );
  }
  
  // Legacy emoji values fall back to a real icon rather than rendering emoji as UI.
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: bgColor }}
    >
      <Tag className="h-5 w-5" style={{ color: color || SEMANTIC_COLORS.neutral }} />
    </div>
  );
};

const CATEGORY_COLORS: string[] = [...CATEGORICAL_COLORS];

const CATEGORY_ICONS = [
  "Home", "Car", "UtensilsCrossed", "ShoppingCart", "Pill", "Clapperboard", "Plane", "BookOpen",
  "Wallet", "CreditCard", "Gift", "Shirt", "Zap", "Smartphone", "Dumbbell", "Music",
  "Dog", "Baby", "Hospital", "GraduationCap", "Briefcase", "Landmark", "TrendingUp", "Target",
];

export default function Categories() {
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
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-20">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <ErrorState message="We couldn't load your categories. Check your connection and try again." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-1 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="category-name">Name</Label>
                <Input 
                  id="category-name"
                  placeholder="Category name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                />
              </div>
              
              {!editingCategory && (
                <div className="space-y-1.5">
                  <Label htmlFor="category-type">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                    <SelectTrigger id="category-type">
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
                <Label id="category-icon-label">Icon</Label>
                <div role="group" aria-labelledby="category-icon-label" className="grid grid-cols-8 gap-2">
                  {CATEGORY_ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Use ${i} icon`}
                      aria-pressed={icon === i}
                      onClick={() => setIcon(i)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-colors ${
                        icon === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label id="category-color-label">Color</Label>
                <div role="group" aria-labelledby="category-color-label" className="grid grid-cols-9 gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Use ${c} as category color`}
                      aria-pressed={color === c}
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-full transition-transform ${
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
      </div>

      {/* Expense Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {expenseCategories.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No expense categories</p>
          ) : (
            expenseCategories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={cat.icon} color={cat.color} />
                  <div>
                    <p className="font-medium text-foreground">{cat.name}</p>
                    {cat.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                </div>
                {!cat.is_default && (
                  <div className="flex gap-1">
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
        </CardContent>
      </Card>

      {/* Income Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Income Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {incomeCategories.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No income categories</p>
          ) : (
            incomeCategories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={cat.icon} color={cat.color} />
                  <div>
                    <p className="font-medium text-foreground">{cat.name}</p>
                    {cat.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                </div>
                {!cat.is_default && (
                  <div className="flex gap-1">
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
        </CardContent>
      </Card>
    </div>
  );
}
