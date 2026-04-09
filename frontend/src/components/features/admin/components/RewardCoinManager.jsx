import { useState, useEffect } from 'react';
import {
    Coins,
    Plus,
    Trash2,
    RefreshCcw,
    Power,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { adminService } from "@/index";

export default function RewardCoinManager() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [form, setForm] = useState({
        min_commission: '',
        max_commission: '',
        coins_per_100: ''
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAllRewardRules();
            setRules(data);
        } catch (err) {
            toast.error('Failed to load reward rules');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            min_commission: parseFloat(form.min_commission),
            max_commission: parseFloat(form.max_commission),
            coins_per_100: parseInt(form.coins_per_100)
        };

        try {
            if (editingId) {
                await adminService.updateRewardRule(editingId, payload);
                toast.success('Reward rule updated successfully');
            } else {
                await adminService.createRewardRule(payload);
                toast.success('Reward rule created successfully');
            }

            setOpenDialog(false);
            setEditingId(null);
            setForm({ min_commission: '', max_commission: '', coins_per_100: '' });
            loadRules();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save reward rule');
        }
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            await adminService.toggleRewardRuleStatus(id, !currentStatus);
            toast.success('Rule status updated');
            loadRules();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await adminService.deleteRewardRule(id);
            toast.success('Rule deleted');
            loadRules();
        } catch (err) {
            toast.error('Failed to delete rule');
        }
    };

    const openEditDialog = (rule) => {
        setEditingId(rule.id);
        setForm({
            min_commission: rule.min_commission,
            max_commission: rule.max_commission,
            coins_per_100: rule.coins_per_100
        });
        setOpenDialog(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Reward Coins - Rule Engine</h1>
                    <p className="text-muted-foreground text-sm">Define how many coins customers earn based on seller commission percentage</p>
                </div>

                <Dialog open={openDialog} onOpenChange={(val) => {
                    setOpenDialog(val);
                    if (!val) {
                        setEditingId(null);
                        setForm({ min_commission: '', max_commission: '', coins_per_100: '' });
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-primary hover:bg-primary/90">
                            <Plus className="h-4 w-4" /> Create New Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Reward Rule' : 'Create Reward Rule'}</DialogTitle>
                            <DialogDescription>
                                Set rules for earnable coins based on seller commission percentage.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="min_commission">Min Commission (%)</Label>
                                    <Input
                                        id="min_commission"
                                        min={0}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.min_commission}
                                        onChange={e => setForm({ ...form, min_commission: e.target.value })}
                                        onWheel={e => e.target.blur()}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="max_commission">Max Commission (%)</Label>
                                    <Input
                                        id="max_commission"
                                        min={0}
                                        type="number"
                                        step="0.01"
                                        placeholder="100.00"
                                        value={form.max_commission}
                                        onChange={e => setForm({ ...form, max_commission: e.target.value })}
                                        onWheel={e => e.target.blur()}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="coins_per_100">Coins per ₹100 spent</Label>
                                <Input
                                    id="coins_per_100"
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={form.coins_per_100}
                                    onChange={e => setForm({ ...form, coins_per_100: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Ex: If set to 5, a ₹200 purchase earns 10 coins.</p>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="submit" className="w-full">
                                    {editingId ? 'Update Rule' : 'Save Rule'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                        <Coins className="h-5 w-5 text-primary" />
                        Commission-Based Reward Tiers
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Configure reward coin earnings based on the seller's commission percentage for each product.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-none overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold">Commission Range</TableHead>
                                    <TableHead className="font-semibold text-center">Reward (per ₹100)</TableHead>
                                    <TableHead className="font-semibold text-center">Value Ratio</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-right font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            <RefreshCcw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : rules.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Coins className="h-10 w-10 opacity-20" />
                                                <p>No reward rules defined yet.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rules.map((rule) => (
                                        <TableRow key={rule.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">
                                                {rule.min_commission}% - {rule.max_commission}%
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                                    {rule.coins_per_100} Coins
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-muted-foreground italic">
                                                Worth ₹{((rule.coins_per_100 || 0) / 20).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={rule.active ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}
                                                    variant="outline"
                                                >
                                                    {rule.active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary"
                                                        onClick={() => openEditDialog(rule)}
                                                    >
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={rule.active ? "h-8 w-8 text-amber-500" : "h-8 w-8 text-success"}
                                                        onClick={() => handleToggle(rule.id, rule.active)}
                                                        title={rule.active ? "Deactivate" : "Activate"}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(rule.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-primary/5 border-primary/20 shadow-none">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-primary" />
                            Calculation Logic
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2 text-muted-foreground pb-4 leading-relaxed">
                        <p>• Coins are calculated using: <code className="bg-primary/10 px-1 rounded text-primary">floor(price / 100) * coins_per_100</code></p>
                        <p>• Example: For a rule with 5 coins/₹100, a ₹250 product earns 10 coins.</p>
                        <p>• <strong>Status Flow:</strong> Rule applies at order placement → Frozen until delivery → Credited after delivery → Redeemable after 45 days.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
