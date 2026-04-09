import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService } from "@/index";

export default function SupportTicketBoard() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTickets();
    }, []);

    async function loadTickets() {
        try {
            setLoading(true);
            const res = await adminService.getSupportTickets({ status: 'OPEN' }); // Default view OPEN
            setTickets(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusUpdate(id, newStatus) {
        try {
            await adminService.updateTicket(id, { status: newStatus });
            loadTickets();
        } catch (err) {
            alert('Failed to update ticket');
        }
    }

    const priorityColor = (p) => {
        switch (p) {
            case 'URGENT': return 'destructive';
            case 'HIGH': return 'orange'; // Assuming custom color or use destructive
            case 'MEDIUM': return 'default';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">Support Tickets (Open)</h2>
                <Button onClick={loadTickets} variant="outline" size="sm">Refresh</Button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <p>Loading tickets...</p>
                ) : tickets.length === 0 ? (
                    <p className="text-muted-foreground">No open tickets.</p>
                ) : (
                    tickets.map((ticket) => (
                        <Card key={ticket.id}>
                            <CardContent className="p-4 flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={priorityColor(ticket.priority)}>{ticket.priority}</Badge>
                                        <span className="font-semibold">{ticket.subject}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{ticket.message}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        From: {ticket.email} | {new Date(ticket.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Select onValueChange={(val) => handleStatusUpdate(ticket.id, val)}>
                                        <SelectTrigger className="w-[130px] bg-muted/50 border-border">
                                            <SelectValue placeholder="Update Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                                            <SelectItem value="CLOSED">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}