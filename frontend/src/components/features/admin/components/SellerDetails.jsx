import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store,
  Package,
  IndianRupee,
  AlertTriangle,
  Calendar,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Building2,
  CreditCard,
  FileText,
  RefreshCw,
  User,
  Phone,
  Truck,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminService } from "@/index";
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

export default function SellerDetails() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warehouses, setWarehouses] = useState([]); // RENAMED
  const [onboardingRequests, setOnboardingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [commissionRate, setCommissionRate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [syncingWarehouse, setSyncingWarehouse] = useState(false);

  useEffect(() => {
    if (sellerId) {
      loadSellerDetails();
      loadWarehouseStatus();
      loadOnboardingRequests();
    }
  }, [sellerId]);

  async function loadSellerDetails() {
    try {
      setLoading(true);
      const response = await adminService.getSellerDetails(sellerId);
      setSellerData(response.data);

      // FIX: Set commission to the ACTUAL current rate first, then fallback to requested
      const activeRate = response.data.summary?.commission_percentage
        || response.data.seller_info?.requested_commission_rate
        || 10;
      setCommissionRate(activeRate.toString());

    } catch (err) {
      console.error('Failed to load seller details:', err);
      setError(err.response?.data?.message || 'Failed to load seller details');
    } finally {
      setLoading(false);
    }
  }

  async function loadWarehouseStatus() {
    try {
      const response = await adminService.getSellerWarehouseStatus(sellerId);
      // Ensure it's always an array
      setWarehouses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load warehouse status:', err);
      setWarehouses([]);
    }
  }

  async function loadOnboardingRequests() {
    try {
      const response = await adminService.getSellerOnboardingRequests();
      const sellerRequests = response.data?.filter(req => req.user_id == sellerId) || [];
      setOnboardingRequests(sellerRequests);
    } catch (err) {
      console.error('Failed to load onboarding requests:', err);
    }
  }

  const handleApprove = async () => {
    try {
      const response = await adminService.approveOnboarding(sellerId, parseFloat(commissionRate));
      toast({
        title: 'Seller Approved',
        description: 'Seller has been approved successfully.',
      });
      setApproveDialogOpen(false);
      loadSellerDetails();
      loadWarehouseStatus();
      loadOnboardingRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve seller',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Rejection reason is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await adminService.rejectOnboarding(sellerId, rejectionReason);
      toast({
        title: 'Seller Rejected',
        description: 'Seller application has been rejected.',
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      loadSellerDetails();
      loadOnboardingRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject seller',
        variant: 'destructive',
      });
    }
  };

  const handleSyncWarehouse = async (warehouseId = null) => {
    setSyncingWarehouse(warehouseId || true);
    try {
      await adminService.syncSellerWarehouse(sellerId, warehouseId);
      toast({
        title: 'Warehouse Synced',
        description: 'Warehouse has been successfully synced with Delhivery.',
      });
      loadWarehouseStatus();
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.response?.data?.message || 'Failed to sync warehouse',
        variant: 'destructive',
      });
    } finally {
      setSyncingWarehouse(false);
    }
  };

  const renderWarehouseStatus = () => {
    if (warehouses.length === 0) return null;

    const allSynced = warehouses.every(w => w.warehouse_created);
    const syncedCount = warehouses.filter(w => w.warehouse_created).length;

    return (
      <div className="flex items-center gap-3">
        <Badge className={allSynced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
          {allSynced ? (
            <><CheckCircle className="w-3 h-3 mr-1" /> ALL SYNCED</>
          ) : (
            <><AlertTriangle className="w-3 h-3 mr-1" /> {syncedCount}/{warehouses.length} SYNCED</>
          )}
        </Badge>
      </div>
    );
  };

  const renderOnboardingComparison = (request) => {
    if (!request.data_json) return null;

    const currentData = sellerData?.seller_info || {};
    const requestedData = request.data_json;

    const fields = [
      /* BUSINESS */
      { key: 'business_name', label: 'Business Name' },
      { key: 'business_location', label: 'Business Location' },
      { key: 'city', label: 'City' },
      { key: 'pin', label: 'PIN Code' },

      /* BANK */
      { key: 'bank_name', label: 'Bank Name' },
      { key: 'bank_account_number', label: 'Bank Account Number' },
      { key: 'bank_ifsc', label: 'Bank IFSC' },

      /* WAREHOUSE */
      { key: 'warehouse_name', label: 'Warehouse Name' },
      { key: 'warehouse_phone', label: 'Warehouse Phone' },
      { key: 'warehouse_address', label: 'Warehouse Address' },
      { key: 'warehouse_city', label: 'Warehouse City' },
      { key: 'warehouse_pin', label: 'Warehouse PIN' },
      { key: 'warehouse_country', label: 'Warehouse Country' },
      { key: 'warehouse_email', label: 'Warehouse Email' },

      /* RETURN ADDRESS */
      { key: 'return_address', label: 'Return Address' },
      { key: 'return_city', label: 'Return City' },
      { key: 'return_state', label: 'Return State' },
      { key: 'return_pin', label: 'Return PIN' },
      { key: 'return_country', label: 'Return Country' },

      /* VERIFICATION */
      { key: 'pan_number', label: 'PAN Number' },
      { key: 'aadhaar_number', label: 'Aadhaar Number' },

      /* COMMISSION */
      { key: 'requested_commission_rate', label: 'Requested Commission %' },
    ];

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 font-semibold text-sm border-b pb-2">
          <div>Field</div>
          <div>Current Value</div>
          <div>Requested Value</div>
        </div>

        {fields.map(field => {
          const current = currentData[field.key];
          const requested = requestedData[field.key];

          const changed = current !== requested;

          return (
            <div
              key={field.key}
              className={`grid grid-cols-3 gap-4 p-3 rounded-lg border
              ${changed ? "border-yellow-300 bg-yellow-50" : "border-gray-200"}
              `}
            >
              <div className="font-medium text-sm">
                {field.label}
              </div>

              <div className="text-sm bg-gray-50 p-2 rounded">
                {current || "-"}
              </div>

              <div className={`text-sm p-2 rounded ${changed ? "bg-green-50 text-green-800 font-semibold" : "bg-gray-50"}`}>
                {requested || "-"}
              </div>

            </div>
          );
        })}
      </div>
    );
  };

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  }


  function getStatusBadge(status, type = 'default') {
    const variants = {
      ACTIVE: 'success',
      SUSPENDED: 'destructive',
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  }

  if (loading) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground animate-pulse">Loading seller details...</p>
      </div>

    );
  }

  if (error) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Seller Not Found</h2>
        <p className="text-muted-foreground mb-8">{error}</p>

      </div>

    );
  }

  if (!sellerData) {
    return null;
  }

  const { seller, summary, revenue, commissions, products, orders, risk_metrics, activity_timeline } = sellerData;

  return (

    <div className="w-full px-6 py-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">

          <h1 className="text-3xl font-bold">Seller Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(seller.account_status)}
          {getStatusBadge(seller.onboarding_status)}
        </div>
      </div>

      {/* Seller Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" /> Seller Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Seller ID</p>
              <p className="font-semibold">{seller.seller_id || seller.user_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-semibold">{seller.business_name || seller.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                {seller.email}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-semibold">{seller.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-semibold flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(seller.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="font-semibold flex items-center">
                <Package className="h-4 w-4 mr-1" />
                {summary.total_products_added}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="font-semibold">{summary.total_orders}</p>
            </div>
            <div className="flex flex-col items-end" >
              <p className="text-sm text-muted-foreground">Net Earnings</p>
              <p className="font-semibold">{formatCurrency(summary.seller_net_earnings)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max md:w-full md:grid md:grid-cols-7">          <TabsTrigger value="overview" className="data-[state=active]:text-primary">Overview</TabsTrigger>
            <TabsTrigger value="verification" className="data-[state=active]:text-primary">Verification</TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:text-primary">Revenue</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:text-primary">Products</TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:text-primary">Orders</TabsTrigger>
            <TabsTrigger value="commissions" className="data-[state=active]:text-primary">Commissions</TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:text-primary">Risks</TabsTrigger>
          </TabsList>
        </div>
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Gross Revenue</span>
                  <span className="font-semibold">{formatCurrency(summary.gross_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Earnings</span>
                  <span className="font-semibold">{formatCurrency(summary.seller_net_earnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items Sold</span>
                  <span className="font-semibold">{summary.total_items_sold}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admin Commission</span>
                  <span className="font-semibold">{formatCurrency(summary.total_admin_commission)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Avg Order Value</span>
                  <span className="font-semibold">{formatCurrency(summary.average_order_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cancelled Orders</span>
                  <span className="font-semibold text-red-600">{summary.cancelled_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Shipments</span>
                  <span className="font-semibold text-yellow-600">{summary.pending_shipments}</span>
                </div>
                <div className="flex justify-between">
                  <span>Commission Rate</span>
                  <span className="font-semibold">{summary.commission_percentage}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Seller Name</span>
                  <span className="font-semibold">{seller.full_name || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Phone</span>
                  <span className="font-semibold">{seller.phone || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Gender</span>
                  <span className="font-semibold capitalize text-primary">{seller.gender || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Date of Birth</span>
                  <span className="font-semibold">{seller.date_of_birth ? formatDate(seller.date_of_birth) : 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Location</span>
                  <span className="font-semibold">{seller.business_location || seller.location || 'Not set'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Verification Details Tab */}
        <TabsContent value="verification">
          <div className="space-y-6">
            {/* Approval Status and Actions */}
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Onboarding Status
                  </CardTitle>
                  {renderWarehouseStatus()}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(sellerData?.seller_info?.approval_status || 'PENDING')}
                      {sellerData?.seller_info?.approval_status === 'PENDING' && (
                        <span className="text-sm text-muted-foreground">
                          Requested on: {formatDate(sellerData?.seller_info?.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {sellerData?.seller_info?.approval_status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setApproveDialogOpen(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setRejectDialogOpen(true)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Commission Rate Display - UPDATED */}
                <div className="bg-muted p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium text-muted-foreground">Active Commission Rate</p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {/* Prioritize the actual active commission, fallback to requested */}
                    {summary.commission_percentage || sellerData?.seller_info?.requested_commission_rate || 10}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {summary.commission_percentage
                      ? "This is the current live rate for this seller."
                      : "This is the rate requested during onboarding."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Warehouse Information (Multi-Warehouse Support) */}
            <Card>
              <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  Pickup Locations & Warehouses
                </CardTitle>
                <Badge variant="outline">{warehouses.length} Locations</Badge>
              </CardHeader>
              <CardContent className="pt-6">
                {warehouses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No individual warehouses found for this seller.
                    {sellerData?.seller_warehouse && (
                      <div className="mt-4 p-4 bg-muted rounded text-left">
                        <p className="text-xs font-bold uppercase mb-2">Legacy Warehouse Data:</p>
                        <p className="text-sm">{sellerData.seller_warehouse.address}</p>
                        <p className="text-sm">{sellerData.seller_warehouse.city}, {sellerData.seller_warehouse.pincode}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {warehouses.map((w) => (
                      <div key={w.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold">{w.pickup_location_name}</h4>
                              <Badge variant={w.warehouse_created ? "success" : "warning"}>
                                {w.warehouse_created ? "Synced" : "Pending Sync"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {w.address}, {w.city}, {w.state} - {w.pincode}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                              <span>Phone: {w.phone}</span>
                              <span>Email: {w.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncWarehouse(w.id)}
                              disabled={syncingWarehouse === w.id || syncingWarehouse === true}
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${syncingWarehouse === w.id ? 'animate-spin' : ''}`} />
                              {w.warehouse_created ? 'Re-sync' : 'Sync to Delhivery'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Update Requests */}
            {onboardingRequests.filter(req => req.request_type === 'PROFILE_UPDATE').length > 0 && (
              <Card>
                <CardHeader className="border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Profile Update Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {onboardingRequests
                    .filter(req => req.request_type === 'PROFILE_UPDATE')
                    .map(request => (
                      <div key={request.id} className="mb-6 p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-medium">Profile Update Request</p>
                            <p className="text-sm text-muted-foreground">
                              Submitted: {formatDate(request.created_at)}
                            </p>
                          </div>
                          {getStatusBadge(request.approval_status)}
                        </div>

                        {request.approval_status === 'PENDING' && (
                          <div className="flex gap-2 mb-4">
                            <Button
                              size="sm"
                              onClick={() => handleApprove()}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve Update
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectDialogOpen(true)}
                            >
                              Reject Update
                            </Button>
                          </div>
                        )}

                        {renderOnboardingComparison(request)}
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Banking Information Card */}
            <Card>
              <CardHeader className="  border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Banking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Bank Name</label>
                    <p className="text-base   p-3 rounded">{sellerData?.seller_info?.bank_name || seller?.bank_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Account Number</label>
                    <p className="text-base    p-3 rounded font-mono text-sm break-all">{sellerData?.seller_info?.bank_account_number || seller?.bank_account_number || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">IFSC Code</label>
                    <p className="text-base  p-3 rounded font-mono">{sellerData?.seller_info?.bank_ifsc || seller?.bank_ifsc || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Documents Card */}
            <Card>
              <CardHeader className="  border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Verification Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">PAN Number</label>
                    <div className="flex items-center gap-2">
                      <p className="text-base  p-3 rounded flex-1 font-mono">{sellerData?.seller_info?.pan_number || seller?.pan_number || 'N/A'}</p>
                      {(sellerData?.seller_info?.pan_number || seller?.pan_number) && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Format: ABCDE1234F (10 characters)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Aadhaar Number</label>
                    <div className="flex items-center gap-2">
                      <p className="text-base   p-3 rounded flex-1 font-mono">{sellerData?.seller_info?.aadhaar_number || seller?.aadhaar_number || 'N/A'}</p>
                      {(sellerData?.seller_info?.aadhaar_number || seller?.aadhaar_number) && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">12-digit number</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">GST Number</label>
                    <div className="flex items-center gap-2">
                      <p className="text-base  p-3 rounded flex-1 font-mono">{seller?.gst_number || 'N/A'}</p>
                      {seller?.gst_number && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">KYC Document</label>
                    <div className="flex items-center gap-2">
                      {seller?.govt_id_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full flex items-center justify-center gap-2"
                          onClick={() => window.open(seller.govt_id_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                          View {seller.govt_id_type || 'ID Document'}
                        </Button>
                      ) : (
                        <p className="text-base p-3 rounded bg-muted text-muted-foreground w-full text-center">No Document Uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Onboarding Status</label>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(sellerData?.seller_info?.approval_status || seller?.onboarding_status)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Account Status</label>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(sellerData?.seller_info?.account_status || seller?.account_status)}
                    </div>
                  </div>
                  {(sellerData?.seller_info?.verified_at || seller?.verified_at) && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Verification Date</label>
                      <p className="text-base  p-3 rounded flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(sellerData?.seller_info?.verified_at || seller?.verified_at)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="revenue">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Format */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenue.revenue_by_format?.map((format) => (
                    <div key={format.format} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{format.format}</p>
                        <p className="text-sm text-muted-foreground">{format.orders_count} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(format.revenue)}</p>
                        <p className="text-sm text-muted-foreground">{format.items_sold} items</p>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground text-center py-8">No revenue data</p>}
                </div>
              </CardContent>
            </Card>

            {/* Top Product & Daily Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Top Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenue.top_selling_product && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Top Selling Product</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-bold text-primary hover:underline"
                        onClick={() => navigate(`/admin/inventory/${revenue.top_selling_product.product_id}`)}
                      >
                        {revenue.top_selling_product.product_title}
                      </Button>
                      <div className="text-sm space-y-1 mt-1">
                        <div className="flex justify-between">
                          <span>Units Sold</span>
                          <span>{revenue.top_selling_product.quantity_sold}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Revenue</span>
                          <span>{formatCurrency(revenue.top_selling_product.revenue_generated)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Recent Daily Revenue</p>
                  {revenue.daily_revenue?.slice(0, 5).map((day) => (
                    <div key={day.date} className="flex justify-between text-sm py-1">
                      <span>{formatDate(day.date)}</span>
                      <span className="font-semibold">{formatCurrency(day.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Products ({products.all_products?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.all_products?.slice(0, 10).map((product) => (
                    <TableRow key={product.product_id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-bold text-primary hover:underline truncate max-w-full"
                          onClick={() => navigate(`/admin/inventory/${product.product_id}`)}
                        >
                          {product.title}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.format}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(product.selling_price)}</TableCell>
                      <TableCell>
                        <span className={product.stock < (products.low_stock_threshold || 10) ? 'text-destructive font-semibold' : 'font-semibold'}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>{product.total_sold}</TableCell>
                      <TableCell>{formatCurrency(product.revenue_generated)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/admin/inventory/${product.product_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground h-24">
                          No products found
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders ({orders?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.slice(0, 10).map((order) => (
                    <TableRow key={order.order_id}>
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-bold text-primary hover:underline"
                          onClick={() => navigate(`/admin/orders/${order.order_id}/details`)}
                        >
                          #{order.order_id}
                        </Button>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{order.customer_name}</TableCell>
                      <TableCell>{formatDate(order.order_date)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.order_status === 'DELIVERED' ? 'success' :
                            order.order_status === 'CANCELLED' ? 'destructive' : 'outline'
                        }>
                          {order.order_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.items_count}</TableCell>
                      <TableCell>{formatCurrency(order.order_total)}</TableCell>
                      <TableCell>{formatCurrency(order.seller_payout)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/admin/orders/${order.order_id}/details`)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground h-24">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commission Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Commission Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center"><IndianRupee className="h-4 w-4 mr-2" /> Total Paid</span>
                  <span className="font-semibold text-lg">{formatCurrency(commissions.summary?.total_commission_paid)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg Commission Rate</span>
                  <span className="font-semibold">{parseFloat(commissions.summary?.avg_commission_percentage || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Admin Net Profit</span>
                  <span className="font-semibold">{formatCurrency(commissions.summary?.admin_net_profit_total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Commission Orders</span>
                  <span className="font-semibold">{commissions.commission_orders?.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Trends & Recent */}
            <Card>
              <CardHeader>
                <CardTitle>Commission Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {commissions.commission_trends?.slice(0, 6).map((trend) => (
                  <div key={trend.month} className="flex justify-between items-center p-3 border rounded-lg">
                    <span>{trend.month}</span>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(trend.total_commission)}</p>
                      <p className="text-sm text-muted-foreground">{trend.order_count} orders</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Metrics & Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cancellation Rate</p>
                  <Badge variant={risk_metrics.cancellation_rate > 20 ? 'destructive' : 'success'}>
                    {risk_metrics.cancellation_rate}%
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Return Rate</p>
                  <Badge variant={risk_metrics.return_rate > 10 ? 'destructive' : 'success'}>
                    {risk_metrics.return_rate}%
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Revenue Volatility</p>
                  <p className="font-semibold">{risk_metrics.revenue_volatility > 0 ? '+' : ''}{risk_metrics.revenue_volatility}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Risk Flags</p>
                  <Badge variant="destructive">{risk_metrics.risk_flags?.length || 0}</Badge>
                </div>
              </div>

              {risk_metrics.risk_flags?.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="font-semibold flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Flags
                  </p>
                  <div className="space-y-2">
                    {risk_metrics.risk_flags.map((flag, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        <span className="text-sm">{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {activity_timeline.slice(0, 6).map((activity, idx) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Activity className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{activity.event}</p>
                        <p className="text-xs text-muted-foreground">{activity.details}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Seller Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="commission_rate">Commission Rate (%)</Label>
              <Input
                id="commission_rate"
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="Enter commission rate"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Platform standard: 10%. Range: 1-30%
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Approving this seller will:
              </p>
              <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                <li>Grant seller access to the platform</li>
                <li>Set their commission rate</li>
                <li>Attempt to create Delhivery warehouse</li>
                <li>Send approval notification</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Seller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Seller Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Rejection Reason *</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejection..."
                className="mt-1"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be communicated to the seller
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-800">
                Rejecting this seller will:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                <li>Deny seller access to the platform</li>
                <li>Send rejection notification with reason</li>
                <li>Allow seller to reapply if needed</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}