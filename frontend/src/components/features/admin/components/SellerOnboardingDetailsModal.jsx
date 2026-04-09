import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CreditCard, FileText, User, AlertCircle, CheckCircle, Clock, MapPin, Truck, Download, ExternalLink } from 'lucide-react';
import { adminService } from "@/index";
import { formatDate } from '@/lib/utils';


export default function SellerOnboardingDetailsModal({ isOpen, onClose, userId, onApprove, onReject }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [finalCommissionRate, setFinalCommissionRate] = useState(10);
    const [isCommissionOverridden, setIsCommissionOverridden] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchDetails();
        }
    }, [isOpen, userId]);

    const fetchDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getOnboardingDetails(userId);
            setDetails(data);
            if (data?.requested_commission_rate != null) {
                setFinalCommissionRate(data.requested_commission_rate);
            }
        } catch (err) {
            setError('Failed to load seller details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (window.confirm('Approve this seller application? The user will be notified via email.')) {
            setApproving(true);
            try {
                await adminService.approveOnboarding(userId, finalCommissionRate);
                onApprove?.();
                onClose();
            } catch (err) {
                alert('Failed to approve: ' + err.message);
            } finally {
                setApproving(false);
            }
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        if (window.confirm('Reject this seller application?')) {
            setRejecting(true);
            try {
                await adminService.rejectOnboarding(userId, rejectReason);
                onReject?.();
                onClose();
            } catch (err) {
                alert('Failed to reject: ' + err.message);
            } finally {
                setRejecting(false);
            }
        }
    };

    const getStatusIcon = () => {
        if (!details) return null;
        switch (details.approval_status) {
            case 'APPROVED':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'REJECTED':
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            default:
                return <Clock className="h-5 w-5 text-yellow-600" />;
        }
    };

    const getStatusColor = () => {
        if (!details) return 'bg-muted';
        switch (details.approval_status) {
            case 'APPROVED':
                return 'bg-green-100 dark:bg-green-900/30 border-l-4 border-green-600';
            case 'REJECTED':
                return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-600';
            default:
                return 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-600';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="bg-muted -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold text-foreground">
                                Seller Onboarding Application
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1">
                                Review and manage the seller application below
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading seller details...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-red-900">Error Loading Details</h3>
                                <p className="text-red-700 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                ) : details ? (
                    <div className="space-y-6 py-6 px-6">
                        {/* Status Header */}
                        <div className={`rounded-lg p-6 ${getStatusColor()}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon()}
                                    <div>
                                        <h3 className="font-semibold text-foreground text-lg">{details.business_name}</h3>
                                        <p className="text-sm text-muted-foreground mt-0.5">User ID: {details.user_id} • {details.user_email}</p>
                                    </div>
                                </div>
                                <Badge variant={details.approval_status === 'PENDING' ? 'warning' : details.approval_status === 'APPROVED' ? 'success' : 'destructive'} className="text-sm py-2 px-3">
                                    {details.approval_status || 'PENDING'}
                                </Badge>
                            </div>
                        </div>

                        {/* Business Information Card */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-muted border-b border-border pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Business Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Business Name</label>
                                        <p className="text-base text-foreground bg-muted p-3 rounded">{details.business_name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Business Location</label>
                                        <div className="text-base text-foreground bg-muted p-3 rounded">{details.business_location}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Proposed Commission Rate (%)</label>
                                        <div className="text-base font-bold text-primary bg-primary/5 p-3 rounded border border-primary/20 flex items-center justify-between">
                                            {details.requested_commission_rate || 10}%
                                            <Badge variant="outline" className="ml-2 font-normal text-xs">Requested</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Address Information */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-muted border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    Business Address
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="pt-6">
                                <div className="grid md:grid-cols-2 gap-6">

                                    <div>
                                        <label className="text-sm font-medium text-foreground">City</label>
                                        <p className="bg-muted p-3 rounded">
                                            {details.city || "—"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-foreground">PIN Code</label>
                                        <p className="bg-muted p-3 rounded">
                                            {details.pin || "—"}
                                        </p>
                                    </div>

                                </div>
                            </CardContent>
                        </Card>

                        {/* Warehouse Information */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-muted border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Truck className="h-5 w-5 text-primary"/>
                                    Warehouse Details
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="pt-6">

                                <div className="grid md:grid-cols-2 gap-6">

                                    <div>
                                        <label className="text-sm font-medium">Warehouse Name</label>
                                        <p className="bg-muted p-3 rounded">{details.warehouse_name || "—"}</p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Warehouse Phone</label>
                                        <p className="bg-muted p-3 rounded">{details.warehouse_phone || "—"}</p>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium">Warehouse Address</label>
                                        <p className="bg-muted p-3 rounded">{details.warehouse_address || "—"}</p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Warehouse City</label>
                                        <p className="bg-muted p-3 rounded">{details.warehouse_city || "—"}</p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Warehouse PIN</label>
                                        <p className="bg-muted p-3 rounded">{details.warehouse_pin || "—"}</p>
                                    </div>

                                </div>

                            </CardContent>
                        </Card>

                        {/* Return Address */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-muted border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="h-5 w-5 text-primary"/>
                                    Return Address
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="pt-6">

                                <div className="grid md:grid-cols-2 gap-6">

                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium">Return Address</label>
                                        <p className="bg-muted p-3 rounded">{details.return_address || "—"}</p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Return City</label>
                                        <p className="bg-muted p-3 rounded">{details.return_city || "—"}</p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Return State</label>
                                        <p className="bg-muted p-3 rounded">{details.return_state || "—"}</p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Return PIN</label>
                                        <p className="bg-muted p-3 rounded">{details.return_pin || "—"}</p>
                                    </div>

                                </div>

                            </CardContent>
                        </Card>

                        {/* Banking Information Card */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-muted border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <CreditCard className="h-5 w-5 text-primary" />
                                    Banking Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
                                        <p className="text-base text-muted-foreground bg-muted p-3 rounded">{details.bank_name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
                                        <p className="text-base text-muted-foreground bg-muted p-3 rounded font-mono">{details.bank_account_number}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-foreground mb-1">IFSC Code</label>
                                        <p className="text-base text-muted-foreground bg-muted p-3 rounded font-mono">{details.bank_ifsc}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Verification Documents & KYC Card */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-muted border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-primary" />
                                    KYC & Verification
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">GST Number</label>
                                        <p className="text-base text-foreground bg-muted p-3 rounded font-mono font-bold">{details.gst_number || "NOT PROVIDED"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">KYC Status</label>
                                        <div className="flex items-center gap-2 pt-2">
                                            <Badge variant={details.kyc_status === 'approved' ? 'success' : details.kyc_status === 'rejected' ? 'destructive' : 'warning'} className="capitalize px-4 py-1">
                                                {details.kyc_status || 'Pending'}
                                            </Badge>
                                            {details.is_kyc_verified && <CheckCircle className="h-5 w-5 text-green-500" />}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Government ID ({details.govt_id_type?.toUpperCase() || "ID"})</label>
                                        <p className="text-base text-foreground bg-muted p-3 rounded font-mono">{details.govt_id_number || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">ID Document Proof</label>
                                        {details.govt_id_url ? (
                                            <div className="flex gap-2 pt-1">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="flex items-center gap-2"
                                                    asChild
                                                >
                                                    <a href={details.govt_id_url} target="_blank" rel="noreferrer">
                                                        <ExternalLink className="h-4 w-4" /> View Document
                                                    </a>
                                                </Button>
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="flex items-center gap-2"
                                                    asChild
                                                >
                                                    <a href={details.govt_id_url} download>
                                                        <Download className="h-4 w-4" /> Download
                                                    </a>
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-red-500 bg-red-50 p-3 rounded flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" /> No document uploaded
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* User Information Card */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-muted border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <User className="h-5 w-5 text-primary" />
                                    User Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                                        <p className="text-base text-muted-foreground bg-muted p-3 rounded">{details.user_name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
                                        <p className="text-base text-muted-foreground bg-muted p-3 rounded break-all">{details.user_email}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-forground mb-1">Application Submitted</label>
                                        <p className="text-base text-muted-foreground bg-muted p-3 rounded">{formatDate(details.created_at)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rejection Reason (if rejected) */}
                        {details.approval_status === 'REJECTED' && details.rejection_reason && (
                            <Card className="border-0 shadow-sm bg-primary border-l-4 border-border">
                                <CardContent className="pt-6">
                                    <div className="flex gap-3">
                                        <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-primary">Rejection Reason</h4>
                                            <p className="text-red-800 text-sm mt-2">{details.rejection_reason}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Rejection Reason Form */}
                        {showRejectForm && (
                            <Card className="border-0 shadow-sm bg-muted">
                                <CardHeader className="border-b pb-4">
                                    <CardTitle className="text-lg">Rejection Reason</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <label className="block">
                                        <span className="text-sm font-medium text-foreground block mb-2">Please provide a detailed reason for rejection *</span>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Explain why you're rejecting this application. The applicant will receive this feedback."
                                            className="w-full px-4 py-3 border border-border bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                            rows={4}
                                        />
                                    </label>
                                </CardContent>
                            </Card>
                        )}
                        {/* Approval Action Form (Commission Confirmation) */}
                        {details.approval_status === 'PENDING' && !showRejectForm && (
                            <Card className="border-primary/20 bg-primary/5 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                        Finalize Commission Rate
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Set Applicable Rate</span>
                                                <span className="text-sm font-bold text-primary">{finalCommissionRate}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="30"
                                                step="0.5"
                                                value={finalCommissionRate}
                                                onChange={(e) => {
                                                    setFinalCommissionRate(parseFloat(e.target.value));
                                                    setIsCommissionOverridden(true);
                                                }}
                                                className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="text-xs text-muted-foreground border-l pl-4 hidden sm:block">
                                            This rate will be used for all orders processed by this seller.
                                            The platform default is 10%.
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ) : null}

                <DialogFooter className="bg-muted border-t px-6 py-4 flex gap-2">
                    {details && details.approval_status === 'PENDING' && (
                        <>
                            {!showRejectForm ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowRejectForm(true)}
                                        className="border-red-500 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                                    >
                                        Reject Application
                                    </Button>
                                    <Button
                                        onClick={handleApprove}
                                        disabled={approving}
                                        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                                    >
                                        {approving ? 'Approving...' : 'Approve Seller'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowRejectForm(false);
                                            setRejectReason('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleReject}
                                        disabled={rejecting || !rejectReason.trim()}
                                        className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white"
                                    >
                                        {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}