import { useEffect, useState } from 'react';
import api from '@/config/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, XCircle, Check, Settings, History, TrendingUp, Truck, MapPin, RefreshCw, Plus, Edit2, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import SellerCommissionUpdate from './SellerCommissionUpdate';
import SellerProfileHistory from './SellerProfileHistory';

// Delhivery API functions
const createDelhiveryWarehouse = async (warehouseData) => {
    try {
        const response = await api.post('/api/logistics/warehouse/create', warehouseData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const updateDelhiveryWarehouse = async (warehouseData) => {
    try {
        const response = await api.post('/api/logistics/warehouse/update', warehouseData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export default function SellerStoreSettings() {
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [warehouseLoading, setWarehouseLoading] = useState(false);

    const [sellerProfile, setSellerProfile] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [latestUpdateRequest, setLatestUpdateRequest] = useState(null);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);

    const [form, setForm] = useState({
        business_name: '',
        business_location: '',
        city: '',
        pin: '',
        bank_name: '',
        bank_account_number: '',
        bank_ifsc: '',
    });

    const [warehouseForm, setWarehouseForm] = useState({
        pickup_location_name: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        email: '',
        return_address: '',
        return_pincode: '',
        return_city: '',
        return_state: '',
        return_country: 'India'
    });
    const requiredFields = [
        sellerProfile?.business_name,
        sellerProfile?.business_location,
        sellerProfile?.bank_name,
        sellerProfile?.bank_account_number,
        sellerProfile?.bank_ifsc,
        sellerProfile?.pan_number,
        sellerProfile?.aadhaar_number
    ];

    const isProfileIncomplete = requiredFields.some(
        (field) => !field || field.toString().trim() === ''
    );

    // 🔹 Load seller dashboard data
    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/seller/dashboard');

            if (res.data.success) {
                const data = res.data.data;

                // Check if profile was updated (admin approval detected)
                const previousProfile = sellerProfile;
                const newProfile = data.seller_profile || null;

                setSellerProfile(newProfile);
                setWarehouses(data.seller_warehouses || []);
                setLatestUpdateRequest(data.latest_update_request || null);

                if (data.seller_profile) {
                    setForm({
                        business_name: data.seller_profile.business_name || '',
                        business_location: data.seller_profile.business_location || '',
                        city: data.seller_profile.city || '',
                        pin: data.seller_profile.pin || '',
                        bank_name: data.seller_profile.bank_name || '',
                        bank_account_number: data.seller_profile.bank_account_number || '',
                        bank_ifsc: data.seller_profile.bank_ifsc || ''
                    });
                }

                // Check if admin approved updates (profile changed and no pending requests)
                if (previousProfile && newProfile && !data.latest_update_request) {
                    toast({
                        title: 'Profile Updated!',
                        description: 'Your changes have been approved and applied successfully.',
                    });
                }
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to load store settings',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Set up periodic refresh to check for admin approval updates
        const interval = setInterval(() => {
            loadData();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // 🔹 Handle warehouse creation/update with Delhivery
    // 🔹 Handle warehouse creation/update (DB only, sync happens from admin or specific btn)
    const handleSaveWarehouse = async () => {
        try {
            setWarehouseLoading(true);
            const payload = {
                ...warehouseForm,
                id: selectedWarehouse?.id
            };

            const res = await api.post('/api/seller/warehouse', payload);

            if (res.data.success) {
                const savedWarehouse = res.data.data;

                // 🔥 AUTO SYNC TO DELHIVERY
                try {
                    await api.post('/api/logistics/warehouse/update', {
                        ...payload,
                        warehouse_name: payload.pickup_location_name,
                        warehouse_phone: payload.phone,
                        warehouse_address: payload.address,
                        warehouse_city: payload.city,
                        warehouse_state: payload.state,
                        warehouse_pin: payload.pincode,
                        warehouse_email: payload.email,
                        id: savedWarehouse?.id || payload.id
                    });

                    toast({
                        title: 'Success',
                        description: 'Warehouse saved and synced with Delhivery'
                    });
                } catch (syncErr) {
                    console.error("Auto-sync failed:", syncErr);
                    toast({
                        title: 'Saved locally',
                        description: 'Warehouse saved, but failed to sync with Delhivery. Please sync manually.',
                        variant: 'warning'
                    });
                }

                setIsWarehouseModalOpen(false);
                setSelectedWarehouse(null);
                await loadData();
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save warehouse',
                variant: 'destructive'
            });
        } finally {
            setWarehouseLoading(false);
        }
    };

    const handleSyncToDelhivery = async (warehouse) => {
        try {
            setWarehouseLoading(true);
            const res = await api.post('/api/logistics/warehouse/update', {
                ...warehouse,
                warehouse_name: warehouse.pickup_location_name,
                warehouse_phone: warehouse.phone,
                warehouse_address: warehouse.address,
                warehouse_city: warehouse.city,
                warehouse_state: warehouse.state,
                warehouse_pin: warehouse.pincode,
                warehouse_email: warehouse.email,
                id: warehouse.id
            });

            if (res.data.success) {
                toast({
                    title: 'Synced',
                    description: 'Warehouse details synced with Delhivery successfully'
                });
                await loadData();
            }
        } catch (error) {
            toast({
                title: 'Sync Failed',
                description: error.response?.data?.message || 'Failed to sync with Delhivery',
                variant: 'destructive'
            });
        } finally {
            setWarehouseLoading(false);
        }
    };

    const openWarehouseModal = (warehouse = null) => {
        if (warehouse) {
            setSelectedWarehouse(warehouse);
            setWarehouseForm({
                pickup_location_name: warehouse.pickup_location_name || '',
                phone: warehouse.phone || '',
                address: warehouse.address || '',
                city: warehouse.city || '',
                state: warehouse.state || '',
                pincode: warehouse.pincode || '',
                country: warehouse.country || 'India',
                email: warehouse.email || '',
                return_address: warehouse.return_address || '',
                return_pincode: warehouse.return_pincode || '',
                return_city: warehouse.return_city || '',
                return_state: warehouse.return_state || '',
                return_country: warehouse.return_country || 'India'
            });
        } else {
            setSelectedWarehouse(null);
            setWarehouseForm({
                pickup_location_name: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                pincode: '',
                country: 'India',
                email: '',
                return_address: '',
                return_pincode: '',
                return_city: '',
                return_state: '',
                return_country: 'India'
            });
        }
        setIsWarehouseModalOpen(true);
    };

    // 🔹 Submit update (admin approval)
    const handleSave = async () => {
        try {
            setLoading(true);
            const res = await api.put('/api/seller/profile', form);

            if (res.data.success) {
                toast({
                    title: 'Update Submitted',
                    description: 'Your changes were sent for admin approval'
                });
                setEditing(false);
                await loadData();
            }
        } catch (err) {
            toast({
                title: 'Error',
                description:
                    err.response?.data?.message || 'Failed to submit update',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading && !sellerProfile) {
        return <div className="py-12 text-center">Loading store settings…</div>;
    }

    return (
        <div className="space-y-6">
            {/* Status Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Store Settings Overview
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadData}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Manage your business profile, commission rate, and view update history
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                                {sellerProfile?.commission_rate || sellerProfile?.requested_commission_rate || 10}%
                            </div>
                            <p className="text-sm text-muted-foreground">Current Commission Rate</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <Badge
                                variant={sellerProfile?.approval_status === 'APPROVED' ? 'default' : 'secondary'}
                                className="mb-2"
                            >
                                {sellerProfile?.approval_status === 'APPROVED' ? 'Active' : 'Restricted'}
                            </Badge>
                            <p className="text-sm text-muted-foreground">Account Status</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold">
                                {latestUpdateRequest?.status === 'PENDING' ? '1' : '0'}
                            </div>
                            <p className="text-sm text-muted-foreground">Pending Updates</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Truck className="h-5 w-5" />
                                <Badge
                                    variant={warehouses.length > 0 ? 'default' : 'secondary'}
                                >
                                    {warehouses.length} {warehouses.length === 1 ? 'Warehouse' : 'Warehouses'}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Logistics Setup</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabbed Interface */}
            <Tabs defaultValue="profile" className="space-y-4">
                <div className="w-full overflow-x-auto">
                    <TabsList className="flex w-max md:w-full md:grid md:grid-cols-4">
                        <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:text-primary">
                            <Settings className="h-4 w-4" />
                            Store Profile
                        </TabsTrigger>
                        <TabsTrigger value="warehouses" className="flex items-center gap-2 data-[state=active]:text-primary">
                            <MapPin className="h-4 w-4" />
                            Pickup Locations
                        </TabsTrigger>
                        <TabsTrigger value="commission" className="flex items-center gap-2 data-[state=active]:text-primary">
                            <TrendingUp className="h-4 w-4" />
                            Commission
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:text-primary">
                            <History className="h-4 w-4" />
                            History
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Profile Details Tab */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Business & Banking Details</CardTitle>
                            <CardDescription>
                                Update your business and banking information (requires admin approval)
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Alerts */}
                            {isProfileIncomplete && (
                                <div className="p-4 rounded-lg bg-secondary border border-border flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-accent" />
                                    <div>
                                        <p className="font-medium text-foreground">
                                            Profile is incomplete
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Please complete all business, bank, and verification details.
                                            Incomplete profiles may face delays in approvals and payouts.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {latestUpdateRequest?.status === 'PENDING' && (
                                <div className="p-4 rounded-lg bg-secondary border border-border flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-accent" />
                                    <p className="text-sm text-muted-foreground">
                                        Your update is pending admin approval.
                                    </p>
                                </div>
                            )}

                            {latestUpdateRequest?.status === 'REJECTED' &&
                                sellerProfile?.approval_status !== 'APPROVED' && (
                                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-3">
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <div>
                                            <p className="font-medium text-destructive">
                                                Update Rejected
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {latestUpdateRequest.admin_remarks ||
                                                    'No reason provided'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                            {/* Business Information */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2">Business Information</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Business Name</Label>
                                        <Input
                                            value={form.business_name}
                                            disabled={!editing}
                                            onChange={(e) =>
                                                setForm({ ...form, business_name: e.target.value })
                                            }
                                            placeholder="Registered business name"
                                        />
                                    </div>

                                    <div>
                                        <Label>Business Location (Address)</Label>
                                        <Input
                                            value={form.business_location}
                                            disabled={!editing}
                                            onChange={(e) =>
                                                setForm({ ...form, business_location: e.target.value })
                                            }
                                            placeholder="Full address"
                                        />
                                    </div>

                                    <div>
                                        <Label>City</Label>
                                        <Input
                                            value={form.city}
                                            disabled={!editing}
                                            onChange={(e) =>
                                                setForm({ ...form, city: e.target.value })
                                            }
                                            placeholder="e.g. Mumbai"
                                        />
                                    </div>

                                    <div>
                                        <Label>PIN Code</Label>
                                        <Input
                                            value={form.pin}
                                            disabled={!editing}
                                            onChange={(e) =>
                                                setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })
                                            }
                                            placeholder="6-digit PIN"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Banking Information */}
                            <div className="space-y-4 pt-4">
                                <h3 className="font-semibold text-lg border-b pb-2">Banking Information</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Bank Name</Label>
                                        <Input
                                            value={form.bank_name}
                                            disabled={!editing}
                                            onChange={(e) =>
                                                setForm({ ...form, bank_name: e.target.value })
                                            }
                                            placeholder="Operating bank name"
                                        />
                                    </div>

                                    <div>
                                        <Label>Account Number</Label>
                                        <Input
                                            value={form.bank_account_number}
                                            disabled={!editing}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    bank_account_number: e.target.value.replace(/\D/g, '')
                                                })
                                            }
                                            placeholder="Bank account number"
                                        />
                                    </div>

                                    <div>
                                        <Label>IFSC Code</Label>
                                        <Input
                                            value={form.bank_ifsc}
                                            disabled={!editing}
                                            onChange={(e) =>
                                                setForm({ ...form, bank_ifsc: e.target.value.toUpperCase().replace(/\s/g, '') })
                                            }
                                            placeholder="IFSC code"
                                        />
                                    </div>
                                </div>
                            </div>


                            {/* Verification (READ ONLY) */}
                            <div className="border-t pt-6">
                                <h3 className="font-semibold mb-4">
                                    Verification Details
                                </h3>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>PAN Number</Label>
                                        <Input
                                            value={sellerProfile?.pan_number || ''}
                                            disabled
                                            className="bg-muted"
                                        />
                                    </div>

                                    <div>
                                        <Label>Aadhaar Number</Label>
                                        <Input
                                            value={sellerProfile?.aadhaar_number || ''}
                                            disabled
                                            className="bg-muted"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-2 flex-wrap">
                                {!editing ? (
                                    <Button
                                        onClick={() => setEditing(true)}
                                        disabled={latestUpdateRequest?.status === 'PENDING'}
                                    >
                                        {latestUpdateRequest?.status === 'PENDING'
                                            ? 'Update Pending'
                                            : 'Edit Profile Details'}
                                    </Button>
                                ) : (
                                    <>
                                        <Button onClick={handleSave} disabled={loading}>
                                            {loading
                                                ? 'Saving…'
                                                : 'Save & Send for Approval'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setEditing(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Warehouses Tab */}
                <TabsContent value="warehouses">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Pickup Locations & Warehouses</CardTitle>
                                <CardDescription>
                                    Manage your physical pickup points for shipping and returns.
                                </CardDescription>
                            </div>
                            <Button onClick={() => openWarehouseModal()} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Location
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {warehouses.length === 0 ? (
                                //  EMPTY STATE (NO WAREHOUSE)
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No pickup location added</p>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Add your warehouse to start shipping products.
                                    </p>
                                    <Button variant="outline" onClick={() => openWarehouseModal()}>
                                        Add Your Warehouse
                                    </Button>
                                </div>
                            ) : (
                                //  SINGLE WAREHOUSE VIEW
                                <div className="space-y-4">

                                    {/* Header */}
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold">Your Warehouse</h3>
                                        <span className="text-xs text-muted-foreground">
                                            Only one warehouse allowed
                                        </span>
                                    </div>

                                    {/* Warehouse Card */}
                                    {(() => {
                                        const w = warehouses[0];

                                        return (
                                            <div className="p-4 border rounded-lg flex flex-col md:flex-row justify-between gap-4 hover:bg-muted/30 transition-colors">

                                                {/* Left Section */}
                                                <div className="space-y-1">

                                                    {/* Name + Status */}
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-lg">{w.pickup_location_name}</h4>

                                                        {w.warehouse_created ? (
                                                            <Badge className="bg-green-100 text-green-700 border-green-200">
                                                                <Check className="h-3 w-3 mr-1" /> Synced
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                                <Info className="h-3 w-3" /> Pending Sync
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Address */}
                                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <MapPin className="h-3 w-3" />
                                                        {w.address}, {w.city}, {w.state} - {w.pincode}
                                                    </p>

                                                    {/* Warning */}
                                                    {!w.warehouse_created && (
                                                        <p className="text-[10px] text-red-500 font-medium">
                                                            ⚠️ Please sync with Delhivery before shipping
                                                        </p>
                                                    )}

                                                    {/* Info */}
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Truck className="h-3 w-3" /> {w.phone}
                                                        </span>
                                                        <span>{w.email}</span>
                                                    </div>

                                                    {/* Info Note */}
                                                    <p className="text-xs text-primary font-medium">
                                                        You can edit this warehouse but cannot add more.
                                                    </p>
                                                </div>

                                                {/* Right Section (Actions) */}
                                                <div className="flex items-center gap-2 self-end md:self-center">

                                                    {/* Edit */}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openWarehouseModal(w)}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" /> Edit
                                                    </Button>

                                                    {/* Sync */}
                                                    <Button
                                                        variant={w.warehouse_created ? "outline" : "default"}
                                                        size="sm"
                                                        onClick={() => handleSyncToDelhivery(w)}
                                                        disabled={warehouseLoading}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <RefreshCw className={`h-3.5 w-3.5 ${warehouseLoading ? 'animate-spin' : ''}`} />
                                                        {w.warehouse_created ? 'Re-sync' : 'Sync to Delhivery'}
                                                    </Button>
                                                </div>

                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Commission Update Tab */}
                <TabsContent value="commission">
                    <SellerCommissionUpdate />
                </TabsContent>

                {/* Update History Tab */}
                <TabsContent value="history">
                    <SellerProfileHistory />
                </TabsContent>
            </Tabs>

            {/* Warehouse Management Modal */}
            <Dialog open={isWarehouseModalOpen} onOpenChange={setIsWarehouseModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
                        <DialogDescription>
                            Enter your warehouse details exactly as they appear in your logistics documentation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="w_name">Pickup Location Name</Label>
                            <Input
                                id="w_name"
                                placeholder="e.g. Surat Main Branch"
                                value={warehouseForm.pickup_location_name}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, pickup_location_name: e.target.value })}
                            />
                            <p className="text-[10px] text-muted-foreground italic">Try to keep it unique and descriptive.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="w_phone">Business Phone</Label>
                            <Input
                                id="w_phone"
                                placeholder="10-digit mobile"
                                value={warehouseForm.phone}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="w_email">Business Email</Label>
                            <Input
                                id="w_email"
                                type="email"
                                placeholder="warehouse@example.com"
                                value={warehouseForm.email}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="w_addr">Complete Address</Label>
                            <Input
                                id="w_addr"
                                placeholder="House/Shop No, Street, Area"
                                value={warehouseForm.address}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="w_city">City</Label>
                            <Input
                                id="w_city"
                                placeholder="City"
                                value={warehouseForm.city}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="w_state">State</Label>
                            <Input
                                id="w_state"
                                placeholder="State"
                                value={warehouseForm.state}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, state: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="w_pin">PIN Code</Label>
                            <Input
                                id="w_pin"
                                placeholder="6-digit PIN"
                                value={warehouseForm.pincode}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="w_country">Country</Label>
                            <Input
                                id="w_country"
                                value={warehouseForm.country}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div className="md:col-span-2 border-t pt-4 mt-2">
                            <h4 className="font-medium text-sm mb-3 text-muted-foreground flex items-center gap-2">
                                Return Address (Optional - falls back to warehouse address)
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="r_addr">Return Address</Label>
                                    <Input
                                        id="r_addr"
                                        placeholder="Same as warehouse address if empty"
                                        value={warehouseForm.return_address}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, return_address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="r_city">Return City</Label>
                                    <Input
                                        id="r_city"
                                        value={warehouseForm.return_city}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, return_city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="r_pin">Return PIN</Label>
                                    <Input
                                        id="r_pin"
                                        value={warehouseForm.return_pincode}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, return_pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsWarehouseModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveWarehouse}
                            disabled={warehouseLoading || !warehouseForm.pickup_location_name || !warehouseForm.pincode}
                        >
                            {warehouseLoading ? 'Saving...' : 'Save Location'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
