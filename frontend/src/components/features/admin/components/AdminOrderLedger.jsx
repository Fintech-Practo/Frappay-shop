import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, Download, Search, Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import { adminService } from '@/index.js';
import { formatDate } from '@/lib/utils';
import AdminPagination from './AdminPagination';

export default function AdminOrderLedger() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    seller_name: ""
  });


  useEffect(() => {
    loadLedger();
  }, [pagination.page]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadLedger();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.seller_name]);

  async function loadLedger() {
    try {
      setLoading(true);
      const res = await adminService.getOrderLedger(pagination.page, pagination.limit, filters);
      // Backend returns { success: true, data: { data: [], pagination: {} } }
      // adminService returns res.data
      if (res.success && res.data) {
        setData(res.data.data || []);
        setPagination(prev => ({
          ...prev,
          ...res.data.pagination
        }));
      }
    } catch (err) {
      console.error('Failed to load order ledger:', err);
    } finally {
      setLoading(false);
    }
  }
  async function handleExport() {
  try {
    setExporting(true);

    const res = await adminService.exportOrderLedger(filters);

    const rows =
  res?.data?.data ||
  res?.data ||
  [];
    const headers = [
      "Order ID",
      "Seller Name",
      "Order Date",
      "Total Paid",
      "Payment Method",
      "Ship Cost",
      "COD Fee",
      "Shipping Margin",
      "Platform Fee",
      "Coupon Discount",
      "Reward Discount",
      "Seller Payout",
      "Net Profit"
    ];

    const csv = [
      headers.join(","),
      ...rows.map(row => [
        row.id,
        row.seller_names || "",
        new Date(row.created_at).toLocaleDateString(),
        row.total_payable_amount || 0,
        row.payment_method || "",
        row.base_cost || 0,
        row.cod_charges || 0,
        row.shipping_margin || 0,
        row.platform_fee || 0,
        row.coupon_discount || 0,
        row.reward_discount || 0,
        row.seller_payout_total || 0,
        row.net_profit || 0
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `order_ledger_${new Date().toISOString().split("T")[0]}.csv`);

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Export failed:", err);
  } finally {
    setExporting(false);
  }
}
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Financial Ledger</h1>
          <p className="text-muted-foreground">Comprehensive financial breakdown for all platform orders.</p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2" disabled={exporting}>
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full max-w-sm mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by seller name..."
              className="pl-8 pr-3 py-2 w-full border rounded-md text-sm"
              value={filters.seller_name}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  seller_name: e.target.value,
                }))
              }
            />
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr className="border-b border-border/50 bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Order ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Seller Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Order Date</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Total Paid</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-32">Mode</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Ship Cost</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">COD Fee</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-32">Margin/Fee</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Discounts</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Seller Payout</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="px-4 py-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          Loading records...
                        </div>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="px-4 py-8 text-center text-muted-foreground">
                        No financial records found.
                      </td>
                    </tr>
                  ) : (
                    data.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-primary">#{row.id}</td>
                        <td className="px-4 py-3">
                          <div className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[150px]">
                            {row.seller_names || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">{new Date(row.created_at).toLocaleDateString()}</div>
                          <div className="text-[10px] text-muted-foreground italic">
                            {row.shipped_at && <span>Dispatched: {new Date(row.shipped_at).toLocaleDateString()}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          ₹{Number(row.total_payable_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={row.payment_method?.toUpperCase() === 'ONLINE' ? 'default' : 'secondary'} className="text-[10px]">
                            {row.payment_method?.toUpperCase() || 'COD'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          ₹{Number(row.base_cost || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          ₹{Number(row.cod_charges || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-[10px] space-y-0.5">
                            <div className="flex justify-between gap-1 text-success"><span>M:</span> ₹{Number(row.shipping_margin || 0).toFixed(2)}</div>
                            <div className="flex justify-between gap-1 text-primary"><span>P:</span> ₹{Number(row.platform_fee || 0).toFixed(2)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-[10px] text-danger/70 space-y-0.5">
                            <div className="flex justify-between gap-1"><span>C:</span> <span>-₹{Number(row.coupon_discount || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between gap-1"><span>R:</span> <span>-₹{Number(row.reward_discount || 0).toFixed(2)}</span></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          ₹{Number(row.seller_payout_total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-primary font-bold">
                          ₹{Number(row.net_profit || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <AdminPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
