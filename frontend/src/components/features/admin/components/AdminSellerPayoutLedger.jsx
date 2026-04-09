import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { IndianRupee, Download, Search, Filter, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { adminService } from '@/index.js';
import { toast } from 'sonner';
import AdminPagination from './AdminPagination';

export default function AdminSellerPayoutLedger() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    status: '',
    seller_name: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadLedger();
  }, [pagination.page, filters.status]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      loadLedger();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.seller_name]);

  async function loadLedger() {
    try {
      setLoading(true);
      const filterParams = { ...filters };
      if (filterParams.status === 'all') delete filterParams.status;

      const res = await adminService.getPayoutLedger(pagination.page, pagination.limit, filterParams);
      if (res.success && res.data) {
        setData(res.data.data || []);
        setPagination(prev => ({
          ...prev,
          ...res.data.pagination
        }));
      }
    } catch (err) {
      // Avoid toast if backend is down to prevent noise
      if (err.code !== 'ERR_NETWORK') {
        toast.error('Failed to load payout ledger');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const filterParams = { ...filters };
      if (filterParams.status === 'all') delete filterParams.status;
      const blob = await adminService.exportPayoutLedger(filterParams);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `seller_payout_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Export failed');
    }
  }

  const handleUpdate = async (payoutId) => {
    try {
      const updates = editValues[payoutId];
      if (!updates) return;

      const res = await adminService.updatePayout(payoutId, updates);
      if (res.success) {
        toast.success('Payout updated');
        setEditingId(null);
        loadLedger();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const startEditing = (row) => {
    setEditingId(row.id);
    setEditValues({
      ...editValues,
      [row.id]: { status: row.status, transaction_id: row.transaction_id || '' }
    });
  };

  const handleEditChange = (payoutId, field, value) => {
    setEditValues({
      ...editValues,
      [payoutId]: { ...editValues[payoutId], [field]: value }
    });
  };

  const isDue = (dueDate) => {
    if (!dueDate) return false;
    return new Date() >= new Date(dueDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seller Payout Ledger</h1>
          <p className="text-muted-foreground">Manage and track seller payouts with 15-day escrow logic.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Ledger
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">

            {/* LEFT SIDE */}
            <div className="flex items-center gap-4">
               <div className="relative w-56">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search seller..."
                  className="pl-8"
                  value={filters.seller_name}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      seller_name: e.target.value
                    }))
                  }
                />
              </div>

              <div className="w-48">
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => {
                    setFilters({ ...filters, status: v });
                    setPagination({ ...pagination, page: 1 });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="SETTLED">Settled</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="secondary" size="sm" onClick={() => loadLedger()}>
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>

            {/* RIGHT SIDE (NEW DROPDOWN — YOUR CURSOR AREA) */}
            <div className="w-44">
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v)}>
                <SelectTrigger className="h-9 text-xs w-[150px]">
                  <SelectValue placeholder="Sort by Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Latest Due Date</SelectItem>
                  <SelectItem value="asc">Oldest Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {/* <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">ID</th> */}
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID & Seller</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Due Date</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Settled Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transaction ID</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr><td colSpan="7" className="px-4 py-12 text-center text-muted-foreground">Loading payouts...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-12 text-center text-muted-foreground">No payout records found.</td></tr>
                ) : (
                  [...data]
                    .sort((a, b) => {
                      const dateA = new Date(a.due_date || 0);
                      const dateB = new Date(b.due_date || 0);

                      return sortOrder === 'desc'
                        ? dateB - dateA   // latest first
                        : dateA - dateB;  // oldest first
                    })
                    .map((row) => (
                      <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${row.status === 'settled' ? 'bg-success/5' : ''}`}>
                        {/* <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">#{row.id.substring(0, 8)}...</td> */}
                        <td className="px-4 py-3">
                          <div className="font-medium">Order #{row.order_id}</div>
                          <div className="text-[10px] text-primary">{row.seller_name}</div>
                          <div className="text-[9px] text-muted-foreground">Ordered: {new Date(row.order_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.due_date ? (
                            <div className={`flex flex-col items-center gap-0.5 ${isDue(row.due_date) ? 'text-success' : 'text-warning'}`}>
                              <span className="text-xs font-bold">{new Date(row.due_date).toLocaleDateString()}</span>
                              {isDue(row.due_date) ? (
                                <Badge variant="outline" className="text-[8px] bg-success/10 border-success/20 py-0 h-4 uppercase">Ready to Settle</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[8px] bg-warning/10 border-warning/20 py-0 h-4 uppercase">Escrowing</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Waiting for Delivery</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {row.settled_at ? new Date(row.settled_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          ₹{Number(row.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === row.id ? (
                            <Input
                              className="h-8 text-xs w-48"
                              placeholder="Enter Txn ID"
                              value={editValues[row.id]?.transaction_id || ''}
                              onChange={(e) => handleEditChange(row.id, 'transaction_id', e.target.value)}
                            />
                          ) : (
                            <span className="text-[11px] font-mono whitespace-nowrap overflow-hidden text-ellipsis block max-w-[150px]">
                              {row.transaction_id || <span className="text-muted-foreground italic">No ID</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === row.id ? (
                            <Select
                              value={editValues[row.id]?.status}
                              onValueChange={(v) => handleEditChange(row.id, 'status', v)}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="settled">Settled</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={`${row.status === 'settled' ? 'bg-success text-success-foreground' :
                                row.status === 'failed' ? 'bg-danger text-danger-foreground' :
                                  row.status === 'processing' ? 'bg-info text-info-foreground' :
                                    'bg-muted text-muted-foreground'
                              } text-[9px] px-2 py-0.5 uppercase`}>
                              {row.status}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingId === row.id ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="success" className="h-7 px-2" onClick={() => handleUpdate(row.id)}>
                                <Save className="h-3.5 w-3.5 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEditing(row)}>
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t">
            <AdminPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center p-4 bg-muted/50 rounded-lg border border-border/50 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-warning" />
        <p>Payouts marked as <b>"Escrowing"</b> are within the 15-day return window and cannot be settled yet. Once the window passes, they automatically shift to <b>"Ready to Settle"</b>.</p>
      </div>
    </div>
  );
}