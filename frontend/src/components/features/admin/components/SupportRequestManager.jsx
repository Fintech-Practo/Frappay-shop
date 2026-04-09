import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, MessageSquare, User, Mail, Calendar, CheckCircle, Clock } from 'lucide-react';
import { adminService } from "@/index";
import { formatDate } from '@/lib/utils';


export default function SupportRequestManager() {
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const [resolution, setResolution] = useState('');
    const [status, setStatus] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (selectedRequest) {
            setResolution(selectedRequest.resolution || '');
            setStatus(selectedRequest.status);
        }
    }, [selectedRequest]);

    useEffect(() => {
    fetchRequests();
}, [statusFilter, roleFilter]);

    async function fetchRequests(query = searchQuery) {
        try {
            setLoading(true);
            const filters = {};
            if (statusFilter !== 'ALL') filters.status = statusFilter;
             if (roleFilter !== 'ALL') filters.role = roleFilter;
            if (query && query.trim()) filters.search = query.trim();

            const data = await adminService.getSupportTickets(filters);
            if (data.success) {
                setRequests(data.data);
            } else if (Array.isArray(data)) {
                setRequests(data);
            }
        } catch (err) {
            console.error("Failed to load requests", err.response?.data?.message || err);
            toast({
                title: "Error",
                description: "Failed to load support requests",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    const handleSearch = (e) => {
        e.preventDefault();
        fetchRequests(searchQuery);
    };

    async function handleUpdate() {
        if (!selectedRequest) return;

        try {
            setUpdating(true);
            const res = await adminService.updateTicket(selectedRequest.id, {
                status,
                resolution
            });

            if (res.success || res.id) { // Handle simplified response
                toast({ title: "Updated", description: "Request updated successfully" });
                const updated = res.data || res;
                // Update local state
                setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updated : r));
                setSelectedRequest(updated);
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to update request",
                variant: "destructive"
            });
        } finally {
            setUpdating(false);
        }
    }

    const getStatusColor = (s) => {
        switch (s) {
            case 'OPEN': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
            case 'IN_PROGRESS': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
            case 'RESOLVED': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
            case 'CLOSED': return 'bg-muted text-muted-foreground hover:bg-muted/80';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="h-[calc(100vh-120px)] grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Left Panel: List */}
            <Card className="md:col-span-1 flex flex-col h-full overflow-hidden">
                <CardHeader className="py-4 px-6 border-b space-y-4">
                   <CardTitle className="text-lg flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
        <span>Support Requests</span>
        <Badge variant="secondary">{requests.length}</Badge>
    </div>

    {/* ✅ Role Filter Dropdown */}
    <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="SELLER">Seller</SelectItem>
        </SelectContent>
    </Select>
</CardTitle>

                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Search user, email..."
                            className="flex-1 px-3 py-1.5 text-sm border border-border bg-background rounded-md focus:ring-1 focus:ring-primary outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button type="submit" size="sm" variant="secondary">Go</Button>
                    </form>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-1.5">
                        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                            <Badge
                                key={s}
                                variant={statusFilter === s ? "default" : "outline"}
                                className="cursor-pointer hover:bg-muted"
                                onClick={() => setStatusFilter(s)}
                            >
                                {s.replace('_', ' ')}
                            </Badge>
                        ))}
                    </div>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : requests.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No requests found</div>
                    ) : (
                        requests.map(req => (
                            <div
                                key={req.id}
                                onClick={() => setSelectedRequest(req)}
                                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${selectedRequest?.id === req.id ? 'bg-muted border-primary' : 'bg-card border-border'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-sm line-clamp-1">{req.subject || 'No Subject'}</h4>
                                    <Badge className={`text-[10px] px-1 py-0 ${getStatusColor(req.status)}`}>{req.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{req.message}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span className="truncate">{req.email}</span>
                                    <span className="mx-1">•</span>
                                    <span>{formatDate(req.created_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Right Panel: Detail */}
            <Card className="md:col-span-2 flex flex-col h-full overflow-hidden">
                {selectedRequest ? (
                    <>
                        <CardHeader className="py-4 px-6 border-b bg-muted/30">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-xl mb-1">{selectedRequest.subject || 'Support Request'}</CardTitle>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Mail className="h-4 w-4" />
                                            {selectedRequest.email}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {formatDate(selectedRequest.created_at)} {new Date(selectedRequest.created_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                <Badge className={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Subject & Message */}
                            <div className="space-y-4">
                                <div className="bg-card p-4 rounded-lg border border-border space-y-4">
                                    <div>
                                        <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Subject</h3>
                                        <p className="text-base font-medium text-foreground border-b border-border pb-2">
                                            {selectedRequest.subject || 'No Subject'}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            Message / Description
                                        </h3>
                                        <div className="bg-muted/50 p-3 rounded-md text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                            {selectedRequest.message}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resolution / Admin Action */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Resolution & Status
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium mb-1.5 block text-foreground">Status</label>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger className="bg-background border-border">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="w-48 bg-background border border-border shadow-lg">
                                                <SelectItem value="OPEN">Open</SelectItem>
                                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                                                <SelectItem value="CLOSED">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium mb-1.5 block text-foreground">Resolution Note (Visible to Admin??)</label>
                                    <Textarea
                                        value={resolution}
                                        onChange={(e) => setResolution(e.target.value)}
                                        placeholder="Enter resolution details..."
                                        className="min-h-[100px] bg-background border-border text-foreground"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        * Currently internal internal use or future reference
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={handleUpdate} disabled={updating}>
                                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Save Changes
                                    </Button>
                                </div>
                            </div>

                        </CardContent>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                        <p>Select a request to view details</p>
                    </div>
                )}
            </Card>
        </div>
    );
}