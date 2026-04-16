import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { adminService } from "@/index";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatTime } from '@/lib/utils'; // ⭐ ADDEDimport { Button } from "@/components/ui/button";

export default function AuditLogViewer() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        module: '',
        action: '',
        severity: '',
        limit: 50,
        offset: 0
    });

    function formatAuditDetails(log) {
        if (log.message) {
            return log.message;
        }

        if (log.old_values && log.new_values) {
            const changes = [];
            for (const key in log.new_values) {
                if (log.old_values[key] !== log.new_values[key]) {
                    changes.push(`${key} ${log.old_values[key]} → ${log.new_values[key]}`);
                }
            }
            if (changes.length > 0) return changes.join(', ');
        }

        if (log.new_values) {
            return Object.entries(log.new_values)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
        }

        return '-';
    }

    function getSeverityBadge(severity) {
        switch (severity) {
            case 'CRITICAL':
                return <Badge variant="destructive">CRITICAL</Badge>;
            case 'WARNING':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">WARNING</Badge>;
            case 'INFO':
            default:
                return <Badge variant="secondary" className="bg-gray-200 text-gray-800">INFO</Badge>;
        }
    }

    const renderActionLink = (log) => {
        if (!log.entity_id) return null;

        let path = '';
        switch (log.module) {
            case 'SELLER':
                path = `/admin/sellers/${log.entity_id}/details`;
                break;
            case 'ORDER':
                path = `/admin/orders/${log.entity_id}/details`;
                break;
            case 'PRODUCT':
                path = `/admin/inventory/${log.entity_id}`;
                break;
            case 'USER':
                path = `/admin/users/${log.entity_id}/details`;
                break;
            default:
                return null;
        }

        return (
            <Button
                variant="outline"
                size="xs"
                className="h-7 text-[10px] px-2 font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
                onClick={() => navigate(path)}
            >
                View Details
            </Button>
        );
    };

    useEffect(() => {
        loadLogs();
    }, [filters.limit, filters.offset]);

    async function loadLogs() {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (filters.module) queryParams.append('module', filters.module);
            if (filters.action) queryParams.append('action', filters.action);
            if (filters.severity) queryParams.append('severity', filters.severity);
            queryParams.append('limit', filters.limit);
            queryParams.append('offset', filters.offset);

            const res = await adminService.getAuditLogs(queryParams.toString());
            setLogs(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value === "ALL" ? "" : value, offset: 0 }));
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">Audit Logs</h2>

            <div className="flex flex-wrap gap-4 mb-4">
                <Select value={filters.module || "ALL"} onValueChange={(val) => handleFilterChange('module', val)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Module" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[95vw] md:max-w-none">
                        <SelectItem value="ALL">All Modules</SelectItem>
                        <SelectItem value="AUTH">AUTH</SelectItem>
                        <SelectItem value="USER">USER</SelectItem>
                        <SelectItem value="SELLER">SELLER</SelectItem>
                        <SelectItem value="ORDER">ORDER</SelectItem>
                        <SelectItem value="PRODUCT">PRODUCT</SelectItem>
                        <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filters.severity || "ALL"} onValueChange={(val) => handleFilterChange('severity', val)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Severities</SelectItem>
                        <SelectItem value="INFO">INFO</SelectItem>
                        <SelectItem value="WARNING">WARNING</SelectItem>
                        <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    placeholder="Action (e.g. UPDATE_ORDER_STATUS)"
                    value={filters.action}
                    onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                    className="max-w-xs"
                />

                <Button onClick={loadLogs}>Search</Button>
            </div>

            <div className="border rounded-lg overflow-x-auto md:overflow-visible dark:[&::-webkit-scrollbar]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"style={{ scrollbarColor: 'hsl(var(--muted-foreground)) transparent'}}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Module</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">No logs found</TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                         {formatDate(log.created_at)} {formatTime(log.created_at)}                                     </TableCell>
                                    <TableCell>{log.admin_name || `ID: ${log.performed_by || '-'}`}</TableCell>
                                    <TableCell className="font-semibold">{log.module}</TableCell>
                                    <TableCell className="font-medium text-xs">{log.action}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{log.entity_type || 'System'} {log.entity_id ? `#${log.entity_id}` : ''}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {getSeverityBadge(log.severity)}
                                    </TableCell>
                                    <TableCell className="text-sm max-w-xs truncate" title={log.message || "Hover for details"}>
                                        {formatAuditDetails(log)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {renderActionLink(log)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <Button
                    variant="outline"
                    disabled={filters.offset === 0}
                    onClick={() => setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    disabled={logs.length < filters.limit}
                    onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}