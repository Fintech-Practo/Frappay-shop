import { useState, useEffect } from 'react';
import {
    Percent,
    CheckCircle,
    XCircle,
    Clock,
    Save,
    UserCheck,
    Edit2,
    X,
    Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { adminService } from "@/index";
import { formatDate } from '@/lib/utils';


export default function CommissionManager() {
    const [loading, setLoading] = useState(true);
    const [globalRate, setGlobalRate] = useState('');
    const [commissionRequests, setCommissionRequests] = useState([]);
    const [profileRequests, setProfileRequests] = useState([]);
    const [shippingRules, setShippingRules] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [editingRates, setEditingRates] = useState({}); // { [sellerId]: { value, saving } }
    const [remarks, setRemarks] = useState({});
    const [shippingForm, setShippingForm] = useState({
        min_order_amount: '',
        max_order_amount: '',
        margin_amount: '',
        margin_type: 'flat',
    });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        try {
            const global = await adminService.getGlobalCommission();
            setGlobalRate(global?.percentage || '10.00');

            const commReqs = await adminService.getCommissionRequests('PENDING');
            setCommissionRequests(Array.isArray(commReqs) ? commReqs : []);

            const profReqs = await adminService.getProfileUpdateRequests('PENDING');
            setProfileRequests(Array.isArray(profReqs) ? profReqs : []);

            const rules = await adminService.getShippingMargins();
            setShippingRules(Array.isArray(rules) ? rules : []);

            const sellerList = await adminService.getSellerCommissionRates();
            setSellers(Array.isArray(sellerList) ? sellerList : []);
        } finally {
            setLoading(false);
        }
    }

    /* ── Global Commission ── */
    const handleUpdateGlobal = async () => {
        try {
            await adminService.updateGlobalCommission(globalRate);
            toast.success('Global commission rate updated');
        } catch (err) {
            toast.error('Failed to update global rate');
        }
    };

    /* ── Commission Requests ── */
    const handleActionComm = async (requestId, action) => {
        try {
            await adminService.actionCommissionRequest(requestId, action, remarks[requestId] || '');
            toast.success(`Request ${action === 'APPROVE' ? 'approved' : 'rejected'}`);
            loadData();
        } catch (err) {
            toast.error('Action failed');
        }
    };

    /* ── Profile Update Requests ── */
    const handleActionProfile = async (requestId, action) => {
        try {
            await adminService.actionProfileUpdateRequest(requestId, action, remarks[requestId] || '');
            toast.success(`Profile update ${action === 'APPROVE' ? 'approved' : 'rejected'}`);
            loadData();
        } catch (err) {
            toast.error('Action failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleRemarkChange = (id, value) => {
        setRemarks(prev => ({ ...prev, [id]: value }));
    };

    /* ── Shipping Margins ── */
    const handleAddShippingRule = async (e) => {
        e.preventDefault();
        try {
            await adminService.createShippingMargin(shippingForm);
            toast.success('Shipping margin rule added');
            setShippingForm({ min_order_amount: '', max_order_amount: '', margin_amount: '', margin_type: 'flat' });
            loadData();
        } catch (err) {
            toast.error('Failed to add shipping rule');
        }
    };

    const handleDeleteShippingRule = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await adminService.deleteShippingMargin(id);
            toast.success('Rule deleted');
            loadData();
        } catch (err) {
            toast.error('Failed to delete rule');
        }
    };

    /* ── Inline seller commission editing ── */
    const startEditing = (seller) => {
        setEditingRates(prev => ({
            ...prev,
            [seller.id]: { value: String(seller.commission_rate ?? 10), saving: false },
        }));
    };
    const cancelEditing = (sellerId) => {
        setEditingRates(prev => { const n = { ...prev }; delete n[sellerId]; return n; });
    };
    const handleRateInputChange = (sellerId, value) => {
        setEditingRates(prev => ({ ...prev, [sellerId]: { ...prev[sellerId], value } }));
    };
    const saveSellerCommission = async (sellerId) => {
        const rate = parseFloat(editingRates[sellerId]?.value);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast.error('Commission rate must be between 0% and 100%');
            return;
        }
        setEditingRates(prev => ({ ...prev, [sellerId]: { ...prev[sellerId], saving: true } }));
        try {
            await adminService.updateSellerCommission(sellerId, rate);
            setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, commission_rate: rate } : s));
            cancelEditing(sellerId);
            toast.success('Commission rate updated successfully');
        } catch (err) {
            toast.error('Failed to update commission rate');
            setEditingRates(prev => ({ ...prev, [sellerId]: { ...prev[sellerId], saving: false } }));
        }
    };

    if (loading) return <div className="p-8 text-center">Loading management panel...</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold text-foreground">Commission &amp; Moderation</h1>
                <Badge variant="outline" className="px-3 py-1">
                    <Clock className="h-3 w-3 mr-2" />
                    Real-time Updates
                </Badge>
            </div>

            {/* Global Rate + Stats row */}
            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="h-5 w-5 text-primary" />
                            Base Price Margin
                        </CardTitle>
                        <CardDescription>Default commission % for all products</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                <Input
                                    type="number"
                                    value={globalRate}
                                    onChange={(e) => setGlobalRate(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Button onClick={handleUpdateGlobal} size="icon">
                                <Save className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Changes apply instantly to all products without custom overrides.
                        </p>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Pending Rate Requests
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{commissionRequests.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Pending Profile Updates
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{profileRequests.length}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="sellers" className="w-full">
                <div className="w-full overflow-x-auto">
                    <TabsList className="flex w-max md:w-full md:grid md:grid-cols-4 max-w-[840px]">
                        <TabsTrigger value="sellers" className="data-[state=active]:text-primary text-xs sm:text-sm">Sellers Directory</TabsTrigger>
                        <TabsTrigger value="commissions" className="data-[state=active]:text-primary text-xs sm:text-sm">Rate Requests</TabsTrigger>
                        <TabsTrigger value="shipping" className="data-[state=active]:text-primary text-xs sm:text-sm">Shipping Margins</TabsTrigger>
                        <TabsTrigger value="profiles" className="data-[state=active]:text-primary text-xs sm:text-sm">Profile Updates</TabsTrigger>
                    </TabsList>
                </div>

                {/* ── Tab: Sellers Directory (Inline Commission Edit) ── */}
                <TabsContent value="sellers" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seller Commission Directory</CardTitle>
                            <CardDescription>
                                Inline-edit individual commission rates. Changes take effect immediately on all future orders.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sellers.length === 0 ? (
                                <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed">
                                    <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">No sellers found on the platform.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-secondary/50">
                                            <TableRow>
                                                <TableHead className="text-xs">Business</TableHead>
                                                <TableHead className="text-xs">Email</TableHead>
                                                <TableHead className="text-xs">Requested Rate</TableHead>
                                                <TableHead className="text-xs">Current Rate</TableHead>
                                                <TableHead className="text-xs text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sellers.map(seller => {
                                                const isEditing = !!editingRates[seller.id];
                                                const editState = editingRates[seller.id];
                                                return (
                                                    <TableRow key={seller.id}>
                                                        <TableCell>
                                                            <div className="font-medium text-sm">{seller.business_name || seller.name || 'N/A'}</div>
                                                            <div className="text-xs text-muted-foreground">ID: {seller.id}</div>
                                                        </TableCell>
                                                        <TableCell className="text-xs">{seller.email}</TableCell>
                                                        <TableCell>
                                                            {seller.requested_commission_rate != null ? (
                                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 text-xs font-bold">
                                                                    {seller.requested_commission_rate}% (proposed)
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">Not specified</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.5"
                                                                        value={editState.value}
                                                                        onChange={(e) => handleRateInputChange(seller.id, e.target.value)}
                                                                        className="w-20 h-7 text-xs"
                                                                        disabled={editState.saving}
                                                                        autoFocus
                                                                    />
                                                                    <span className="text-xs text-muted-foreground">%</span>
                                                                </div>
                                                            ) : (
                                                                <Badge variant="secondary" className="font-bold">
                                                                    {Number(seller.commission_rate || 10).toFixed(2)}%
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {isEditing ? (
                                                                <div className="flex gap-1 justify-end">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="outline"
                                                                        className="h-7 w-7 bg-success/10 text-success border-success/20 hover:bg-success hover:text-white"
                                                                        onClick={() => saveSellerCommission(seller.id)}
                                                                        disabled={editState.saving}
                                                                    >
                                                                        <Save className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="outline"
                                                                        className="h-7 w-7"
                                                                        onClick={() => cancelEditing(seller.id)}
                                                                        disabled={editState.saving}
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-primary"
                                                                    onClick={() => startEditing(seller)}
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Tab: Commission Rate Requests ── */}
                <TabsContent value="commissions" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Commission Rate Requests</CardTitle>
                            <CardDescription>Review seller requests for lower/custom commission rates</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {commissionRequests.length === 0 ? (
                                <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed">
                                    <CheckCircle className="h-10 w-10 text-success mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">All caught up! No pending requests.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {commissionRequests.map((req) => (
                                        <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/30 rounded-xl gap-4 border border-border">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-foreground">{req.seller_name}</span>
                                                    <Badge variant="secondary">{req.seller_email}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Requested Rate: <span className="text-primary font-bold">{req.requested_percentage}%</span>
                                                </p>
                                            </div>
                                            <div className="flex flex-1 max-w-md gap-2">
                                                <Input
                                                    placeholder="Remarks/Reason"
                                                    className="text-sm"
                                                    value={remarks[req.id] || ''}
                                                    onChange={(e) => handleRemarkChange(req.id, e.target.value)}
                                                />
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="bg-success/10 text-success border-success/20 hover:bg-success hover:text-white"
                                                        onClick={() => handleActionComm(req.id, 'APPROVE')}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                                                        onClick={() => handleActionComm(req.id, 'REJECT')}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Tab: Shipping Margins ── */}
                <TabsContent value="shipping" className="mt-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-lg">Add New Rule</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddShippingRule} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold">Min Order ₹</label>
                                        <Input type="number" value={shippingForm.min_order_amount} onChange={e => setShippingForm({ ...shippingForm, min_order_amount: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold">Max Order ₹</label>
                                        <Input type="number" value={shippingForm.max_order_amount} onChange={e => setShippingForm({ ...shippingForm, max_order_amount: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold">Margin Amount</label>
                                        <Input type="number" value={shippingForm.margin_amount} onChange={e => setShippingForm({ ...shippingForm, margin_amount: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold">Type</label>
                                        <select
                                            className="w-full h-9 rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                                            value={shippingForm.margin_type}
                                            onChange={e => setShippingForm({ ...shippingForm, margin_type: e.target.value })}
                                        >
                                            <option value="flat">Flat (₹)</option>
                                            <option value="percentage">Percentage (%)</option>
                                        </select>
                                    </div>
                                    <Button type="submit" className="w-full mt-2">Save Rule</Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">Active Shipping Slabs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-secondary/50">
                                            <TableRow>
                                                <TableHead className="text-xs">Order Range</TableHead>
                                                <TableHead className="text-xs">Margin</TableHead>
                                                <TableHead className="text-xs text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {shippingRules.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No rules defined</TableCell>
                                                </TableRow>
                                            ) : (
                                                shippingRules.map(rule => (
                                                    <TableRow key={rule.id}>
                                                        <TableCell className="text-xs font-medium italic">₹{rule.min_order_amount} - ₹{rule.max_order_amount}</TableCell>
                                                        <TableCell className="text-xs">
                                                            <Badge variant="outline" className="bg-primary/5 font-bold">
                                                                {rule.margin_type === 'flat' ? '₹' : ''}{rule.margin_amount}{rule.margin_type === 'percentage' ? '%' : ''}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteShippingRule(rule.id)} className="h-8 w-8 text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── Tab: Profile Update Requests ── */}
                <TabsContent value="profiles" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seller Profile Update Requests</CardTitle>
                            <CardDescription>Verify and approve changes to seller business or bank details</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {profileRequests.length === 0 ? (
                                <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed">
                                    <UserCheck className="h-10 w-10 text-success mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">No pending profile updates.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {profileRequests.map((req) => {
                                        const data = typeof req.data_json === 'string' ? JSON.parse(req.data_json) : req.data_json;
                                        return (
                                            <div key={req.id} className="p-6 bg-secondary/30 rounded-xl border border-border space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <UserCheck className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold">{req.seller_name}</h4>
                                                            <p className="text-xs text-muted-foreground">{req.seller_email} • {formatDate(req.created_at)}</p>
                                                            <p className="text-xs text-primary font-medium">Request ID: #{req.id}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="bg-warning/10 text-warning-foreground">Verify Required</Badge>
                                                </div>

                                                <div className="space-y-4 text-sm bg-background/50 p-4 rounded-lg">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <p><b>Business Name:</b> {data.business_name || '-'}</p>
                                                            <p><b>Business Location:</b> {data.business_location || '-'}</p>
                                                            <p><b>City:</b> {data.city || '-'}</p>
                                                            <p><b>PIN:</b> {data.pin || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p><b>Bank Name:</b> {data.bank_name || '-'}</p>
                                                            <p><b>Account Number:</b> {data.bank_account_number || '-'}</p>
                                                            <p><b>IFSC:</b> {data.bank_ifsc || '-'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                        <div>
                                                            <p><b>Warehouse Name:</b> {data.warehouse_name || '-'}</p>
                                                            <p><b>Warehouse Phone:</b> {data.warehouse_phone || '-'}</p>
                                                            <p><b>Warehouse Address:</b> {data.warehouse_address || '-'}</p>
                                                            <p><b>Warehouse City:</b> {data.warehouse_city || '-'}</p>
                                                            <p><b>Warehouse PIN:</b> {data.warehouse_pin || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p><b>Return Address:</b> {data.return_address || '-'}</p>
                                                            <p><b>Return City:</b> {data.return_city || '-'}</p>
                                                            <p><b>Return State:</b> {data.return_state || '-'}</p>
                                                            <p><b>Return PIN:</b> {data.return_pin || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row gap-4 items-center pt-2">
                                                    <Input
                                                        placeholder="Approval/Rejection remarks"
                                                        className="bg-background"
                                                        value={remarks[req.id] || ''}
                                                        onChange={(e) => handleRemarkChange(req.id, e.target.value)}
                                                    />
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <Button
                                                            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={() => handleActionProfile(req.id, 'APPROVE')}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            className="flex-1 md:flex-none"
                                                            onClick={() => handleActionProfile(req.id, 'REJECT')}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-2" /> Reject
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}