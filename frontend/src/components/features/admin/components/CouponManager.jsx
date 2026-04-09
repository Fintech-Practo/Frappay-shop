import { useState, useEffect } from "react";
import {
  Ticket,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Tag,
  Info,
  RefreshCcw,
  Power,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminService } from "@/index";
import { formatDate } from "@/lib/utils";


export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  // 🔽 NEW STATES (ADD HERE)
const [searchCode, setSearchCode] = useState("");
const [usageData, setUsageData] = useState([]);
const [usageLoading, setUsageLoading] = useState(false);
  const [form, setForm] = useState({
    
    code: "",
    description: "",
    discount_type: "flat",
    discount_value: "",
    min_order_value: "0",
    max_discount: "",
    expiry_date: "",
    usage_limit: "100",
    per_user_limit: "1",
    start_date: new Date().toISOString().split("T")[0],
    is_welcome: false,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllCoupons();
      setCoupons(data);
    } catch (err) {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };
  const handleCreate = async (e) => {
  e.preventDefault();

  // ✅ Step 1a: Validate expiry date
  if (form.expiry_date) {
    const today = new Date();
    const expiry = new Date(form.expiry_date);
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3);

    if (expiry > threeMonthsLater || expiry < today) {
      toast.error("Expiry date must be within 3 months from today");
      return; // stop form submission
    }
  }

  const payload = {
    ...form,
    discount_value: parseFloat(form.discount_value),
    min_order_value: parseFloat(form.min_order_value || 0),
    max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
    usage_limit: parseInt(form.usage_limit || 100),
    per_user_limit: parseInt(form.per_user_limit || 1),
    expiry_date: form.expiry_date || null,
    start_date: form.start_date,
    is_welcome: !!form.is_welcome,
  };

  try {
    await adminService.createCoupon(payload);
    toast.success("Coupon created successfully");

    setOpenDialog(false);

    // reset form
    setForm({
      code: "",
      description: "",
      discount_type: "flat",
      discount_value: "",
      min_order_value: "0",
      max_discount: "",
      expiry_date: "",
      usage_limit: "100",
      per_user_limit: "1",
      start_date: new Date().toISOString().split("T")[0],
      is_welcome: false,
    });

    loadCoupons();
  } catch (err) {
    toast.error(err.response?.data?.error || "Failed to create coupon");
  }
};
  const handleSearchUsage = async () => {
  if (!searchCode) {
    toast.error("Enter coupon code");
    return;
  }

  setUsageLoading(true);
  try {
    const data = await adminService.getCouponUsageDetails(searchCode);
    setUsageData(data);
  } catch (err) {
    toast.error("Failed to fetch usage details");
  } finally {
    setUsageLoading(false);
  }
};

  const handleToggle = async (id) => {
    try {
      await adminService.toggleCouponStatus(id);
      toast.success("Coupon status updated");
      loadCoupons();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };
  

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Coupon & Promotion Engine
          </h1>
          <p className="text-muted-foreground">
            Manage discount codes and promotional offers
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>
                Define the rules for your discount code here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code (Uppercase)</Label>
                <Input
                  id="code"
                  placeholder="WELCOME10"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Input
                  id="description"
                  placeholder="Special festive offer"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={(val) =>
                      setForm({ ...form, discount_type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    min="0"
                    max={
                      form.discount_type === "percentage" ? "100" : undefined
                    }
                    placeholder={form.discount_type === "flat" ? "₹" : "%"}
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm({ ...form, discount_value: e.target.value })
                    }
                    onWheel={(e) => e.target.blur()}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Order Value</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.min_order_value}
                    onChange={(e) =>
                      setForm({ ...form, min_order_value: e.target.value })
                    }
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Discount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={form.max_discount}
                    onChange={(e) =>
                      setForm({ ...form, max_discount: e.target.value })
                    }
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                    className="mt-1 dark:[color-scheme:dark]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) =>
                      setForm({ ...form, expiry_date: e.target.value })
                    }
                    className="mt-1 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usage Limit (Global)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Global limit"
                    value={form.usage_limit}
                    onChange={(e) =>
                      setForm({ ...form, usage_limit: e.target.value })
                    }
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per User Limit</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Per user limit"
                    value={form.per_user_limit}
                    onChange={(e) =>
                      setForm({ ...form, per_user_limit: e.target.value })
                    }
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="is_welcome"
                  checked={form.is_welcome}
                  onChange={(e) =>
                    setForm({ ...form, is_welcome: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <Label htmlFor="is_welcome" className="cursor-pointer">
                  Mark as Welcome Coupon (Auto-applied for new users)
                </Label>
              </div>

              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full">
                  Save Coupon
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Active Coupons
          </CardTitle>
          <CardDescription>
            All generated promotional codes and their status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCcw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Tag className="h-10 w-10 opacity-20" />
                        <p>No coupons found. Create your first one!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-bold font-mono text-primary">
                        <div className="flex flex-col gap-1">
                          {coupon.code}
                          {coupon.is_welcome ? (
                            <Badge
                              variant="outline"
                              className="w-fit text-[9px] bg-primary/10 text-foreground border-border"
                            >
                              WELCOME
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                       <TableCell className="text-sm">
                        <Badge variant="outline">
                          {coupon.total_used ?? coupon.used_count ?? 0} used
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {coupon.discount_type === "flat"
                            ? `₹${coupon.discount_value}`
                            : `${coupon.discount_value}%`}
                        </Badge>
                        {coupon.max_discount && (
                          <span className="text-[10px] block text-muted-foreground">
                            Max ₹{coupon.max_discount}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        ₹{coupon.min_order_value || 0}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(coupon.expiry_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={coupon.is_active ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {coupon.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={
                            coupon.is_active
                              ? "text-destructive"
                              : "text-primary"
                          }
                          onClick={() => handleToggle(coupon.id)}
                          title={coupon.is_active ? "Deactivate" : "Activate"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* ================= COUPON USAGE DETAILS ================= */}
<Card>
  <CardHeader>
    <CardTitle>Coupon Usage Details</CardTitle>
    <CardDescription>
      Search a coupon to view detailed usage
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">

    {/* 🔍 SEARCH BAR */}
    <div className="flex gap-2">
      <Input
        placeholder="Enter Coupon Code (e.g. WELCOME10)"
        value={searchCode}
        onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
      />
      <Button onClick={ handleSearchUsage}>search</Button>
    </div>

    {/* 📊 TABLE */}
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>User Name</TableHead>
            <TableHead>Discount Used</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {usageLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
                Loading...
              </TableCell>
            </TableRow>
          ) : usageData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
                No usage data found
              </TableCell>
            </TableRow>
          ) : (
            usageData.map((item) => (
              <TableRow key={item.order_id}>
                <TableCell>{item.order_id}</TableCell>
                <TableCell>{item.user_name}</TableCell>
                <TableCell>₹{item.discount_value}</TableCell>
                <TableCell>{formatDate(item.used_at)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Coupon Usage Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground">
            <p>
              • Codes are case-insensitive when applied by users but stored
              uppercase.
            </p>
            <p>
              • Percentage discounts can have an optional "Max Discount" cap.
            </p>
            <p>
              • Expired coupons will automatically stop working even if marked
              active.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}