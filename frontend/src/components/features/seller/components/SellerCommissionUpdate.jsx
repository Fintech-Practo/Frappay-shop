import { useState, useEffect } from 'react';
import api from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { AlertCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SellerCommissionUpdate() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentRate, setCurrentRate] = useState(10);
    const [requestedRate, setRequestedRate] = useState('');
    const [latestRequest, setLatestRequest] = useState(null);
    const [editing, setEditing] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/seller/dashboard');

            if (res.data.success) {
                const data = res.data.data;
                setCurrentRate(data.seller_profile?.commission_rate || data.seller_profile?.requested_commission_rate || 10);
                setLatestRequest(data.latest_commission_request || null);
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to load commission data',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmitCommissionRequest = async () => {
        if (!requestedRate || requestedRate < 1 || requestedRate > 30) {
            toast({
                title: 'Invalid Rate',
                description: 'Commission rate must be between 1% and 30%',
                variant: 'destructive'
            });
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post('/api/seller/commission/request', {
                requested_percentage: parseFloat(requestedRate)
            });

            if (res.data.success) {
                toast({
                    title: 'Request Submitted',
                    description: 'Your commission rate change request has been sent for admin approval'
                });
                setEditing(false);
                setRequestedRate('');
                await loadData();
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to submit commission request',
                variant: 'destructive'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="py-12 text-center">Loading commission settings…</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Commission Rate Update
                </CardTitle>
                <CardDescription>
                    Request changes to your commission rate for admin approval
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Current Rate Display */}
                <div className="bg-secondary p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium text-foreground">Current Commission Rate</Label>
                            <p className="text-2xl font-bold text-primary mt-1">{currentRate}%</p>
                            <p className="text-xs text-muted-foreground mt-1">This is your active rate applied to all sales</p>
                        </div>
                        <div className="text-right">
                            <Badge className="bg-primary/10 text-foreground">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Pending Request Alert */}
                {latestRequest?.status === 'PENDING' && (
                    <div className="p-4 rounded-lg bg-secondary border border-border flex gap-3">
                        <Clock className="h-5 w-5 text-accent flex-shrink-0" />
                        <div>
                            <p className="font-medium text-foreground">Request Pending Approval</p>
                            <p className="text-sm text-muted-foreground">
                                You requested a rate change to {latestRequest.requested_rate}% on {formatDate(latestRequest.created_at)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Rejected Request Alert */}
                {latestRequest?.status === 'REJECTED' && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        <div>
                            <p className="font-medium text-destructive">Request Rejected</p>
                            <p className="text-sm text-muted-foreground">
                                Your request for {latestRequest.requested_rate}% was rejected.
                                {latestRequest.admin_remarks && ` Reason: ${latestRequest.admin_remarks}`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Commission Rate Request Form */}
                {!editing && !latestRequest?.status === 'PENDING' ? (
                    <div className="text-center py-6">
                        <Button
                            onClick={() => setEditing(true)}
                            disabled={latestRequest?.status === 'PENDING'}
                        >
                            Request Rate Change
                        </Button>
                    </div>
                ) : editing && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="new-rate">Requested Commission Rate (%)</Label>
                            <Input
                                id="new-rate"
                                type="number"
                                min="1"
                                max="30"
                                step="0.5"
                                value={requestedRate}
                                onChange={(e) => setRequestedRate(e.target.value)}
                                placeholder="Enter new rate (1-30%)"
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Platform range: 1% to 30%. Changes require admin approval.
                            </p>
                        </div>

                        <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                <strong>Note:</strong> Commission rate changes apply to all products without custom overrides.
                                Admin approval is required for rate changes.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSubmitCommissionRequest}
                                disabled={submitting || !requestedRate}
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditing(false);
                                    setRequestedRate('');
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}