import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Mail, Calendar, ShoppingCart, IndianRupee, Activity,
  AlertTriangle, MapPin, Eye
} from 'lucide-react';
import { adminService } from "@/index";
import { formatDate } from '@/lib/utils';


export default function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  async function loadUserDetails() {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getUserDetails(userId);
      setUserDetails(response.data);
    } catch (err) {
      console.error('Failed to load user details:', err);
      setError('Failed to load user details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground animate-pulse">Loading user details...</p>
      </div>

    );
  }

  if (error || !userDetails) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-8">{error || "The requested user details could not be retrieved."}</p>

      </div>

    );
  }

  const { user, summary, orders, financials, activity_timeline, risk_metrics, seller_info, reviews, default_address } = userDetails;

  return (

    <div className="w-full max-w-full px-6 py-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">

          <h1 className="text-3xl font-bold">User Details</h1>
        </div>
        <Badge variant={user.is_active ? 'success' : 'destructive'}>
          {user.is_active ? 'Active' : 'Disabled'}
        </Badge>
      </div>

      {/* User Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> User Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-auto">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-semibold">#{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-semibold">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                {user.email}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-sm text-muted-foreground">Role</p>
              <div className="mt-1 ">
                <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'SELLER' ? 'secondary' : 'outline'}>
                  {user.role}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email Verified</p>
              <Badge variant={user.is_email_verified ? 'success' : 'warning'}>
                {user.is_email_verified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="font-semibold flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(user.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Age</p>
              <p className="font-semibold">{summary.account_age_days} days</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="font-semibold flex items-center">
                <ShoppingCart className="h-4 w-4 mr-1" />
                {summary.total_orders}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 min-h-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max md:w-full md:grid md:grid-cols-6">          <TabsTrigger value="overview" className="data-[state=active]:text-primary">Overview</TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:text-primary">Profile</TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:text-primary">Orders</TabsTrigger>
            <TabsTrigger value="financials" className="data-[state=active]:text-primary">Financials</TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:text-primary">Timeline</TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:text-primary">Risk & Flags</TabsTrigger>
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
                  <span>Total Spent</span>
                  <span className="font-semibold">₹{financials.total_spent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Order Value</span>
                  <span className="font-semibold">₹{financials.avg_order_value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items Purchased</span>
                  <span className="font-semibold">{financials.total_items_purchased}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reviews Posted</span>
                  <span className="font-semibold">{summary.total_reviews}</span>
                </div>
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Delivered</span>
                  <span className="font-semibold text-green-600">{summary.delivered_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cancelled</span>
                  <span className="font-semibold text-red-600">{financials.cancelled_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="font-semibold">
                    {summary.total_orders > 0 ? ((summary.delivered_orders / summary.total_orders) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Format Preference */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Format Preference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Ebooks</span>
                  <span className="font-semibold">{financials.ebook_vs_physical_ratio.ebook}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Physical</span>
                  <span className="font-semibold">{financials.ebook_vs_physical_ratio.physical}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 gap-6">
            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  {user.profile_image_url ? (
                    <img src={user.profile_image_url} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
                  ) : (
                    <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-1 text-center sm:text-left pt-2">
                    <h3 className="text-xl font-bold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start">
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      {user.email}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="font-medium">{user.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date of Birth</p>
                    <p className="font-medium">{formatDate(user.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gender</p>
                    <p className="font-medium capitalize">{user.gender || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Location</p>
                    <p className="font-medium flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {user.location || 'Not set'}
                    </p>
                  </div>
                </div>

                {(default_address || user.address) && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Full Address</p>
                    <p className="text-sm leading-relaxed">
                      {default_address ? (
                        <>
                          {default_address.address_line1}
                          {default_address.address_line2 && `, ${default_address.address_line2}`}
                          <br />
                          {default_address.city}, {default_address.state} - {default_address.postal_code}
                          {default_address.country && <><br />{default_address.country}</>}
                        </>
                      ) : (
                        user.address
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seller Info */}
            {seller_info && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-semibold">{seller_info.business_name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Business Location</p>
                      <p className="font-semibold">{seller_info.business_location || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Approval Status</p>
                      <Badge variant={seller_info.approval_status === 'APPROVED' ? 'success' : 'warning'}>
                        {seller_info.approval_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History ({orders.length} orders)</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No orders found</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-bold text-primary hover:underline text-base"
                            onClick={() => navigate(`/admin/orders/${order.id}/details`)}
                          >
                            Order #{order.id}
                          </Button>
                          <p className="text-sm text-muted-foreground">{formatDate(order.order_date)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Badge variant={order.order_status === 'DELIVERED' ? 'success' : 'outline'}>
                              {order.order_status}
                            </Badge>
                            <p className="font-semibold mt-1">₹{order.total_amount}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => navigate(`/admin/orders/${order.id}/details`)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                              <span>{item.product_title}</span>
                              <Badge variant="outline" className="ml-2 text-xs">{item.format}</Badge>
                            </div>
                            <div className="text-right">
                              <span>{item.quantity} × ₹{item.price}</span>
                              {item.seller_name && <p className="text-xs text-muted-foreground">Seller: {item.seller_name}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center"><IndianRupee className="h-4 w-4 mr-2" /> Total Spent</span>
                  <span className="font-semibold text-lg">₹{financials.total_spent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Order Value</span>
                  <span className="font-semibold">₹{financials.avg_order_value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Items Purchased</span>
                  <span className="font-semibold">{financials.total_items_purchased}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Orders</span>
                  <span className="font-semibold">{financials.total_orders}</span>
                </div>
              </CardContent>
            </Card>

            {/* Order Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Order Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Cancelled Orders</span>
                  <span className="font-semibold text-red-600">{financials.cancelled_orders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Refunded Amount</span>
                  <span className="font-semibold">₹{financials.refunded_value.toFixed(2)}</span>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Format Preference</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Ebooks</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="bg-accent h-2 rounded-full" style={{ width: `${financials.ebook_vs_physical_ratio.ebook}%` }}></div>
                        </div>
                        <span className="text-sm">{financials.ebook_vs_physical_ratio.ebook}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Physical</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${financials.ebook_vs_physical_ratio.physical}%` }}></div>
                        </div>
                        <span className="text-sm">{financials.ebook_vs_physical_ratio.physical}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity_timeline.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No activity found</p>
              ) : (
                activity_timeline.map((activity, idx) => (
                  <div key={idx} className="flex items-start space-x-4">
                    <Activity className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(activity.date)} {new Date(activity.date).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk & Flags Tab */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Metrics & Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(risk_metrics || {}).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No risk metrics found</p>
              ) : (
                Object.entries(risk_metrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-semibold">{String(value)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

  );
}