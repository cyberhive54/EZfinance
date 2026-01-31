import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/useCategories";
import { Plus, Trash2, Pencil, icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CategoryIcon = ({ icon, color }: { icon: string | null; color: string | null }) => {
  const iconName = icon || "Tag";
  const bgColor = color ? `${color}20` : "#64748b20";
  
  const isLucideIcon = /^[A-Z][a-zA-Z0-9]*$/.test(iconName);
  
  if (isLucideIcon && iconName in icons) {
    const LucideIconComponent = icons[iconName as keyof typeof icons] as LucideIcon;
    return (
      <div 
        className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        <LucideIconComponent className="h-4 w-4 md:h-5 md:w-5" style={{ color: color || "#64748b" }} />
      </div>
    );
  }
  
  return (
    <div 
      className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full text-base md:text-lg shrink-0"
      style={{ backgroundColor: bgColor }}
    >
      {iconName}
    </div>
  );
};

const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b",
];

const CATEGORY_ICONS = [
  "🏠", "🚗", "🍔", "🛒", "💊", "🎬", "✈️", "📚",
  "💰", "💳", "🎁", "👕", "⚡", "📱", "🏋️", "🎵",
  "🐕", "👶", "🏥", "🎓", "💼", "🏦", "📈", "🎯",
];

export function CategoriesSection() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory, isCreating } = useCategories();
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

  const CategoryList = ({ items, emptyText }: { items: typeof categories; emptyText: string }) => (
    <div className="space-y-2">
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
                  onClick={() => handleOpenDialog(cat.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  placeholder="Category name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                />
              </div>
              
              {!editingCategory && (
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-8 gap-2">
                  {CATEGORY_ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
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
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-9 gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        color === c ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-105"
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
