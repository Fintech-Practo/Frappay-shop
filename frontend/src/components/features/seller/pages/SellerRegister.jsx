import { useNavigate, Link } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import api from '@/config/api';
import { motion } from 'framer-motion';
import { Building2, MapPin, CreditCard, FileText, User, ArrowLeft, CheckCircle2, AlertCircle, Phone, Mail, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/index.js';
import { delhiveryService } from '@/services/delhivery.service';
import { useState, useEffect } from 'react';

export default function SellerRegister() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const [sellBooks, setSellBooks] = useState(false);
  // Form fields
  const [formData, setFormData] = useState({
    business_name: '',
    business_location: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    pan_number: '',
    aadhaar_number: '',
    gst_number: '',
    govt_id_type: 'aadhaar', // 'aadhaar' or 'pan'
    govt_id_number: '',
    requested_commission_rate: 10,
    // Delhivery/Warehouse Information
    city: '',
    pin: '',
    phone: '',
    warehouse_name: '',
    warehouse_phone: '',
    warehouse_address: '',
    warehouse_city: '',
    warehouse_pin: '',
    warehouse_email: '',
    warehouse_country: 'India',
    // Return Address (for RTO)
    return_address: '',
    return_city: '',
    return_state: '',
    return_pin: '',
    return_country: 'India'
  });

  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if user is already a seller
    if (user?.role === 'SELLER') {
      navigate('/seller');
      return;
    }

    // Fetch onboarding status
    fetchOnboardingStatus();
    fetchKycStatus();
  }, [isAuthenticated, user]);

  const fetchOnboardingStatus = async () => {
    try {
      const res = await api.get('/api/seller/register/status');
      if (res.data.success) {
        setStatus(res.data.data);

        // If already approved, redirect
        if (res.data.data.onboarding?.approval_status === 'APPROVED' || res.data.data.is_seller) {
          navigate('/seller');
        }
      }
    } catch (error) {
      console.error('Failed to fetch onboarding status', error);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const res = await api.get('/api/seller/kyc/status');
      if (res.data.success) {
        setKycStatus(res.data.data);
      }
    } catch (error) {
      // Might not have KYC yet, so 404 is expected
      if (error.response?.status !== 404) {
        console.error('Failed to fetch KYC status', error);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Format PAN (uppercase, no spaces)
    if (name === 'pan_number') {
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase().replace(/\s/g, '')
      }));
      return;
    }

    // Format IFSC (uppercase, no spaces)
    if (name === 'bank_ifsc') {
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase().replace(/\s/g, '')
      }));
      return;
    }

    // Format Aadhaar (numbers only, max 12)
    if (name === 'aadhaar_number') {
      const numbers = value.replace(/\D/g, '').slice(0, 12);
      setFormData(prev => ({
        ...prev,
        [name]: numbers
      }));
      return;
    }

    // Format Phone (numbers only, max 10)
    if (['phone', 'warehouse_phone'].includes(name)) {
      const numbers = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: numbers
      }));
      return;
    }

    // Format PIN (numbers only, max 6)
    if (['pin', 'warehouse_pin', 'return_pin'].includes(name)) {
      const numbers = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({
        ...prev,
        [name]: numbers
      }));
      return;
    }

    // Format Bank Account (numbers only)
    if (name === 'bank_account_number') {
      const numbers = value.replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numbers
      }));
      return;
    }

    // Format GST (uppercase, 15 chars)
    if (name === 'gst_number') {
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase().replace(/\s/g, '').slice(0, 15)
      }));
      return;
    }

    // Format ID Number
    if (name === 'govt_id_number') {
      if (formData.govt_id_type === 'aadhaar') {
        const numbers = value.replace(/\D/g, '').slice(0, 12);
        setFormData(prev => ({ ...prev, [name]: numbers }));
      } else {
        const val = value.toUpperCase().replace(/\s/g, '').slice(0, 10);
        setFormData(prev => ({ ...prev, [name]: val }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
        return;
      }
      if (type === 'aadhaar') {
        setAadhaarFile(file);
      } else if (type === 'pan') {
        setPanFile(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // GST validation (only if selling books)
    if (!sellBooks && !formData.gst_number) {
      setError('GST Number is required when you are NOT selling books.');
      return;
    }
    // Add voter ID type option and file state

    // Validate KYC files
    const hasAadhaar = aadhaarFile || kycStatus?.aadhaar_url;
    const hasPan = panFile || kycStatus?.pan_url;

    if (!hasAadhaar || !hasPan) {
      setError('Please upload both your Aadhaar and PAN card documents.');
      return;
    }

    setLoading(true);

    try {
      // 1. Submit local registration (Onboarding)
      const registrationPayload = {
        ...formData,
        is_books_only: sellBooks
      };
      const res = await api.post('/api/seller/register', registrationPayload);

      if (res.data.success) {
        // 2. Submit KYC details
        await api.post('/api/seller/kyc/submit', {
          gst_number: formData.gst_number,
          is_books_only: sellBooks,
          pan_number: formData.pan_number,
          aadhaar_number: formData.aadhaar_number
        });

        // 3. Upload KYC documents (Aadhaar)
        if (aadhaarFile) {
          const aadhaarFormData = new FormData();
          aadhaarFormData.append('govt_id', aadhaarFile);
          aadhaarFormData.append('govt_id_type', 'aadhaar');

          await api.post('/api/seller/kyc/upload', aadhaarFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        // 4. Upload KYC documents (PAN)
        if (panFile) {
          const panFormData = new FormData();
          panFormData.append('govt_id', panFile);
          panFormData.append('govt_id_type', 'pan');

          await api.post('/api/seller/kyc/upload', panFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        toast({
          title: 'Application Submitted',
          description: 'Your seller application and KYC documents have been submitted for review.',
        });

        // 4. Create Delhivery warehouse
        try {
          const delhiveryData = {
            name: formData.warehouse_name || formData.business_name,
            registered_name: formData.business_name,
            address: formData.warehouse_address || formData.business_location,
            return_address: formData.return_address || formData.business_location,
            city: formData.warehouse_city || formData.city,
            pin: formData.warehouse_pin || formData.pin,
            phone: formData.warehouse_phone || formData.phone,
            email: formData.warehouse_email,
            country: formData.warehouse_country || 'India',
            return_country: formData.return_country || 'India'
          };

          await delhiveryService.createClientWarehouse(delhiveryData);
        } catch (delhiveryError) {
          console.error('Delhivery warehouse creation failed:', delhiveryError);
        }

        await fetchOnboardingStatus();
        await fetchKycStatus();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit application';
      setError(message);

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  // If already submitted, show status
  if (status?.onboarding && status.onboarding.approval_status !== null) {
    const isPending = status.onboarding.approval_status === 'PENDING';
    const isApproved = status.onboarding.approval_status === 'APPROVED';
    const isRejected = status.onboarding.approval_status === 'REJECTED';

    return (
      <Layout>
        <div className="min-h-screen bg-background py-6 sm:py-10 lg:py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 sm:mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>

            <div className="bg-card rounded-lg border p-6 sm:p-8">
              <div className="text-center mb-8">
                {isPending && (
                  <>
                    <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Application Under Review</h1>
                    <p className="text-muted-foreground">
                      Your seller application is being reviewed by our admin team. You will be notified once a decision is made.
                    </p>
                  </>
                )}
                {isApproved && (
                  <>
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Application Approved!</h1>
                    <p className="text-muted-foreground mb-4">
                      Congratulations! Your seller account has been approved. You can now start selling.
                    </p>
                    <Button onClick={() => navigate('/seller')}>
                      Go to Seller Dashboard
                    </Button>
                  </>
                )}
                {isRejected && (
                  <>
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Application Rejected</h1>
                    <p className="text-muted-foreground mb-4">
                      {status.onboarding.rejection_reason || 'Your seller application has been rejected. Please contact support for more information.'}
                    </p>
                    <Button variant="outline" onClick={() => setStatus(null)}>
                      Update Application
                    </Button>
                  </>
                )}
              </div>

              {isPending && (
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Application Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Legal Business Name:</strong> {status.onboarding.business_name}</div>
                    <div><strong>KYC Status:</strong>
                      <Badge variant={kycStatus?.kyc_status === 'approved' ? 'success' : kycStatus?.kyc_status === 'rejected' ? 'destructive' : 'warning'} className="ml-2 capitalize">
                        {kycStatus?.kyc_status || 'Pending Documents'}
                      </Badge>
                    </div>
                    <div><strong>Submitted:</strong> {formatDate(status.onboarding.created_at)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-6 sm:py-10 lg:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 sm:mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border p-6 sm:p-8"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-8 w-8 text-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold">Become a Seller</h1>
              </div>
              <p className="text-muted-foreground">
                Fill out the form below to start selling on Books & Copies. All information is required for verification.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </h2>

                <div>
                  <Label htmlFor="business_name">Legal Business Name *</Label>
                  <Input
                    id="business_name"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    placeholder="Enter your business name"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="business_location">Business Location *</Label>
                  <Input
                    id="business_location"
                    name="business_location"
                    value={formData.business_location}
                    onChange={handleChange}
                    placeholder="Full address of your business"
                    required
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pin">PIN Code *</Label>
                    <Input
                      id="pin"
                      name="pin"
                      value={formData.pin}
                      onChange={handleChange}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Contact Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit primary contact number"
                    maxLength={10}
                    required
                    className="mt-1"
                  />
                </div>

                {/* Warehouse & Shipping Location */}
                <div className="space-y-4 pt-6 border-t font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Warehouse & Shipping Location
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="warehouse_name">Warehouse Name/Store Name *</Label>
                    <Input
                      id="warehouse_name"
                      name="warehouse_name"
                      value={formData.warehouse_name}
                      onChange={handleChange}
                      placeholder="e.g. Main Warehouse"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="warehouse_phone">Warehouse Phone *</Label>
                    <Input
                      id="warehouse_phone"
                      name="warehouse_phone"
                      value={formData.warehouse_phone}
                      onChange={handleChange}
                      placeholder="10-digit phone number"
                      maxLength={10}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="warehouse_address">Warehouse Address *</Label>
                  <Input
                    id="warehouse_address"
                    name="warehouse_address"
                    value={formData.warehouse_address}
                    onChange={handleChange}
                    placeholder="Complete warehouse address"
                    required
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="warehouse_city">Warehouse City *</Label>
                    <Input
                      id="warehouse_city"
                      name="warehouse_city"
                      value={formData.warehouse_city}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="warehouse_pin">Warehouse PIN Code *</Label>
                    <Input
                      id="warehouse_pin"
                      name="warehouse_pin"
                      value={formData.warehouse_pin}
                      onChange={handleChange}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="warehouse_country">Country</Label>
                    <Input
                      id="warehouse_country"
                      name="warehouse_country"
                      value={formData.warehouse_country}
                      onChange={handleChange}
                      placeholder="India"
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="warehouse_email">Warehouse Email *</Label>
                  <Input
                    id="warehouse_email"
                    name="warehouse_email"
                    type="email"
                    value={formData.warehouse_email}
                    onChange={handleChange}
                    placeholder="warehouse@yourbusiness.com"
                    required
                    className="mt-1"
                  />
                </div>

                {/* Return Address */}
                <div className="space-y-4 pt-6 border-t font-semibold flex items-center gap-2">
                  <ArrowLeft className="h-5 w-5 text-primary rotate-180" />
                  Return Address (for RTO)
                </div>

                <div>
                  <Label htmlFor="return_address">Return Address *</Label>
                  <Input
                    id="return_address"
                    name="return_address"
                    value={formData.return_address}
                    onChange={handleChange}
                    placeholder="Address for returned packages"
                    required
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="return_city">Return City *</Label>
                    <Input
                      id="return_city"
                      name="return_city"
                      value={formData.return_city}
                      onChange={handleChange}
                      placeholder="e.g. Delhi"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="return_state">Return State *</Label>
                    <Input
                      id="return_state"
                      name="return_state"
                      value={formData.return_state}
                      onChange={handleChange}
                      placeholder="e.g. Delhi"
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="return_pin">Return PIN Code *</Label>
                    <Input
                      id="return_pin"
                      name="return_pin"
                      value={formData.return_pin}
                      onChange={handleChange}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="return_country">Return Country *</Label>
                    <Input
                      id="return_country"
                      name="return_country"
                      value={formData.return_country}
                      onChange={handleChange}
                      placeholder="India"
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Banking Information
                </h2>

                <div>
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    placeholder="e.g., State Bank of India"
                    required
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_account_number">Account Number *</Label>
                    <Input
                      id="bank_account_number"
                      name="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={handleChange}
                      placeholder="Enter account number"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank_ifsc">IFSC Code *</Label>
                    <Input
                      id="bank_ifsc"
                      name="bank_ifsc"
                      value={formData.bank_ifsc}
                      onChange={handleChange}
                      placeholder="e.g., SBIN0001234"
                      maxLength={11}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Verification Documents & KYC
                </h2>

                <div className="flex items-center justify-between">


                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sellBooks}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSellBooks(true);
                          setFormData(prev => ({ ...prev, gst_number: '' }));
                        } else {
                          setSellBooks(false);
                        }
                      }}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />

                    <Label className="text-sm cursor-pointer">
                      Do you want to sell only books?
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="gst_number">
                    GST Number {!sellBooks && <span className="text-red-500">*</span>}
                  </Label>

                  <Input
                    id="gst_number"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    placeholder="15-character GSTIN"
                    maxLength={15}
                    required={!sellBooks}   // ✅ FIXED
                    // ✅ FIXED
                    className="mt-1"
                  />

                  <p className="text-xs text-muted-foreground mt-1">
                    Example: 29ABCDE1234F2Z5
                  </p>
                </div>

                {/* Heading */}
                <div className="pt-2">
                  <Label className="text-sm font-medium">
                    Government ID Type <span className="text-red-500">*</span>
                  </Label>
                </div>

                {/* Aadhaar + PAN Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

                  {/* Aadhaar Section */}
                  <div className="space-y-3 border rounded-lg p-4">
                    <Label htmlFor="aadhaar_number">Aadhaar Number *</Label>
                    <Input
                      id="aadhaar_number"
                      name="aadhaar_number"
                      value={formData.aadhaar_number}
                      onChange={handleChange}
                      placeholder="12-digit Aadhaar"
                      maxLength={12}
                      required
                      className="mt-1"
                    />

                    <Label>Upload Aadhaar Card *</Label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(e, 'aadhaar')}
                      className="mt-2 w-full border rounded-md p-2 text-sm"
                      required={!kycStatus?.aadhaar_url}
                    />
                    {aadhaarFile && <p className="text-xs text-green-600 mt-1">✓ {aadhaarFile.name}</p>}
                  </div>

                  {/* PAN Section */}
                  <div className="space-y-3 border rounded-lg p-4">
                    <Label htmlFor="pan_number">PAN Number *</Label>
                    <Input
                      id="pan_number"
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleChange}
                      placeholder="10-character PAN"
                      maxLength={10}
                      required
                      className="mt-1"
                    />

                    <Label>Upload PAN Card *</Label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(e, 'pan')}
                      className="mt-2 w-full border rounded-md p-2 text-sm"
                      required={!kycStatus?.pan_url}
                    />
                    {panFile && <p className="text-xs text-green-600 mt-1">✓ {panFile.name}</p>}
                  </div>

                </div>


              </div>

              {/* Platform Agreement — Commission Rate */}
              <div className="space-y-4 border border-primary/20 rounded-lg p-4 bg-primary/5">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className="text-lg">%</span>
                  Platform Agreement
                </h2>
                <p className="text-sm text-muted-foreground">
                  Propose a commission rate for your sales. This rate determines the platform fee
                  deducted from each sale.
                </p>

                <div>
                  <Label htmlFor="requested_commission_rate">Proposed Commission Rate</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      id="requested_commission_rate"
                      type="range"
                      name="requested_commission_rate"
                      min="1"
                      max="30"
                      step="0.5"
                      value={formData.requested_commission_rate}
                      onChange={handleChange}
                      className="flex-1 h-2 accent-primary cursor-pointer"
                    />
                    <div className="flex items-center gap-1 min-w-[60px] justify-center border rounded-md px-3 py-1.5 bg-background font-bold text-primary">
                      <span>{formData.requested_commission_rate}</span>
                      <span className="text-muted-foreground text-xs">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Standard platform commission: <strong>10%</strong>. Sellers may propose
                    a lower rate; the final rate is set by the admin during KYC verification
                    and may differ from your request.
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ <strong>Note:</strong> Your proposed commission rate is subject to Admin
                    approval as part of the KYC process. The platform reserves the right to
                    set a different rate based on your business profile and product category.
                  </p>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Your application will be reviewed by our admin team. You will be notified via email once a decision is made. This process typically takes 1-3 business days.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:flex-1"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}