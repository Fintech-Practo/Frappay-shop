import React, { useState, useEffect } from 'react';
import api from '@/config/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SellerProfileHistory() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/seller/dashboard');
            
            if (res.data.success) {
                // Use latest_update_request from dashboard data
                const latestRequest = res.data.data.latest_update_request;
                setRequests(latestRequest ? [latestRequest] : []);
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to load profile history',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getStatusBadge = (status) => {
        const variants = {
            PENDING: 'warning',
            APPROVED: 'success',
            REJECTED: 'destructive'
        };

        const icons = {
            PENDING: <Clock className="w-3 h-3 mr-1" />,
            APPROVED: <CheckCircle className="w-3 h-3 mr-1" />,
            REJECTED: <XCircle className="w-3 h-3 mr-1" />
        };

        return (
            <Badge variant={variants[status] || 'secondary'}>
                {icons[status]}
                {status}
            </Badge>
        );
    };

    // Local formatDate replaced by global utility.

    const renderRequestDetails = (request) => {
        if (!request.data_json) return null;

        // Parse data_json if it's a string
        const data = typeof request.data_json === 'string' ? JSON.parse(request.data_json) : request.data_json;

        const fields = [
            { key: 'business_name', label: 'Business Name' },
            { key: 'business_location', label: 'Business Location' },
            { key: 'city', label: 'City' },
            { key: 'pin', label: 'PIN Code' },
            { key: 'bank_name', label: 'Bank Name' },
            { key: 'bank_account_number', label: 'Account Number' },
            { key: 'bank_ifsc', label: 'IFSC Code' },
            { key: 'warehouse_name', label: 'Warehouse Name' },
            { key: 'warehouse_phone', label: 'Warehouse Phone' },
            { key: 'warehouse_address', label: 'Warehouse Address' },
            { key: 'warehouse_city', label: 'Warehouse City' },
            { key: 'warehouse_pin', label: 'Warehouse PIN' },
            { key: 'warehouse_email', label: 'Warehouse Email' },
            { key: 'return_address', label: 'Return Address' },
            { key: 'return_city', label: 'Return City' },
            { key: 'return_state', label: 'Return State' },
            { key: 'return_pin', label: 'Return PIN' },
        ];

        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fields.map(field => {
                        const value = data[field.key];
                        if (!value) return null; // Only show fields with values
                        return (
                            <div key={field.key} className="grid grid-cols-1 gap-2 p-3 border rounded">
                                <div className="font-medium text-sm">{field.label}</div>
                                <div className="text-sm bg-muted p-2 rounded break-all">
                                    {value || '-'}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {request.admin_remarks && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-sm text-blue-900">Admin Remarks</p>
                        <p className="text-sm text-blue-800 mt-1">{request.admin_remarks}</p>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="py-12 text-center">Loading profile history…</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Update History</CardTitle>
                <CardDescription>
                    View your profile update requests and their status
                </CardDescription>
            </CardHeader>

            <CardContent>
                {requests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No profile update requests found
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Compact Table */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.slice(0, 5).map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="text-sm">
                                                {formatDate(request.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {request.request_type === 'PROFILE_UPDATE' ? 'Profile' : 'Initial'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(request.status)}
                                            </TableCell>
                                            <TableCell>
                                                <Dialog open={detailsOpen && selectedRequest?.id === request.id} onOpenChange={(open) => {
                                                    setDetailsOpen(open);
                                                    if (!open) setSelectedRequest(null);
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedRequest(request)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2">
                                                                <AlertCircle className="h-5 w-5" />
                                                                Profile Update Request Details
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded">
                                                                <div>
                                                                    <p className="text-sm font-medium">Request ID</p>
                                                                    <p className="text-sm">#{request.id}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium">Submitted</p>
                                                                    <p className="text-sm">{formatDate(request.created_at)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium">Type</p>
                                                                    <p className="text-sm">{request.request_type}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium">Status</p>
                                                                    <div className="mt-1">
                                                                        {getStatusBadge(request.status)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="border-t pt-4">
                                                                <h4 className="font-medium mb-3">Requested Changes</h4>
                                                                {renderRequestDetails(request)}
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {requests.length > 5 && (
                            <div className="text-center pt-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing 5 of {requests.length} requests
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
