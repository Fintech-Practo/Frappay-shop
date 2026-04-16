import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, Save, Upload, Camera, ArrowLeft, LogOut, Phone, Calendar, CreditCard, Building } from 'lucide-react';
import { userService } from '@/services/user.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/index.js';
import { resolvePhotoUrl } from '@/utils/url';
import { motion } from "framer-motion";
import api from '@/config/api';

export default function Profile() {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: '',
    location: '',
    profile_image_url: ''
  });
  const [bankDetails, setBankDetails] = useState({
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchProfile();
    fetchBankDetails();
  }, [isAuthenticated]);

  const fetchBankDetails = async () => {
    try {
      const res = await userService.getBankDetails();
      if (res.data.success && res.data.data) {
        setBankDetails(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bank details', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/users/me');
      if (res.data.success) {
        const data = res.data.data;
        setProfileData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || '',
          date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
          address: data.address_line1 || data.address || '',
          profile_image_url: data.profile_image_url || ''
        });
        setPreviewImage(resolvePhotoUrl(data.profile_image_url));
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractPincode = (address) => {
    const match = address.match(/\b\d{6}\b/);
    return match ? match[0] : "";
  };

  const getCityState = async (pincode) => {
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();

      if (data[0].Status === "Success") {
        const postOffice = data[0].PostOffice[0];

        return {
          city: postOffice.District,
          state: postOffice.State
        };
      }
    } catch (err) {
      console.error("Pincode fetch failed", err);
    }

    return { city: "", state: "" };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploading(true);

    try {
      let city = "";
      let state = "";
      let postal_code = "";

      // 🔥 Extract pincode
      if (profileData.address) {
        postal_code = extractPincode(profileData.address);

        if (!postal_code) {
          toast({
            title: "Error",
            description: "Please enter a valid address with a 6-digit pincode",
            variant: "destructive"
          });
          setLoading(false);
          setUploading(false);
          return;
        }

        const location = await getCityState(postal_code);
        city = location.city;
        state = location.state;
      } else {
        toast({
          title: "Error",
          description: "Address is required",
          variant: "destructive"
        });
        setLoading(false);
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', profileData.name);
      if (profileData.phone) formData.append('phone', profileData.phone);
      if (profileData.gender) formData.append('gender', profileData.gender);
      if (profileData.date_of_birth) formData.append('date_of_birth', profileData.date_of_birth);

      // 🔥 IMPORTANT: send structured fields
      formData.append('address_line1', profileData.address);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('postal_code', postal_code);

      if (profileData.location) formData.append('location', profileData.location);
      if (profileImage) {
        formData.append('profile_image', profileImage);
      }

      // Don't set Content-Type for FormData - axios will set it automatically with boundary
      const res = await api.put('/api/users/me', formData);

      if (res.data.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
        // Update local state with the returned data
        const updatedUser = res.data.data;
        if (updatedUser) {
          setProfileData({
            name: updatedUser.name || '',
            email: updatedUser.email || '',
            phone: updatedUser.phone || '',
            gender: updatedUser.gender || '',
            date_of_birth: updatedUser.date_of_birth ? updatedUser.date_of_birth.split('T')[0] : '',
            address: updatedUser.address_line1 || updatedUser.address || '',
            profile_image_url: updatedUser.profile_image_url || ''
          });
          setPreviewImage(resolvePhotoUrl(updatedUser.profile_image_url));
        }
        await refreshUser();
        setProfileImage(null);
      } else {
        throw new Error(res.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankSubmit = async () => {
    setLoading(true);
    try {
      const res = await userService.updateBankDetails(bankDetails);
      if (res.data.success) {
        toast({
          title: 'Success',
          description: 'Bank details updated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update bank details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container-custom py-8 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border p-4 sm:p-6 md:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <div className="h-32 w-32 rounded-full overflow-hidden bg-muted border-4 border-primary">
                    {previewImage ? (
                      <img src={previewImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <User className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Click the camera icon to upload a new profile picture
                </p>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleChange}
                  required
                  className="mt-1"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleChange}
                  className="mt-1"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Gender & Date of Birth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Gender
                  </Label>
                  <Select
                    value={profileData.gender}
                    onValueChange={(value) => handleChange({ target: { name: 'gender', value } })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date_of_birth" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date of Birth
                  </Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={profileData.date_of_birth}
                    onChange={handleChange}
                    className="mt-1 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  value={profileData.email}
                  disabled
                  className="mt-1 bg-muted"
                  placeholder="Your email address"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed after registration
                </p>
              </div>

              {/* Address */}
              {/* <div>
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Full Address (with Pincode) *
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  value={profileData.address}
                  onChange={handleChange}
                  required
                  className="mt-1 min-h-[100px]"
                  placeholder="Enter your full address including a 6-digit pincode"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We automatically detect city and state from your pincode
                </p>
              </div> */}

              {/* Bank Details Section */}
              <div className="border-t pt-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Bank Details</h2>
                    <p className="text-sm text-muted-foreground">For automated refund payouts</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">Account Holder Name</Label>
                    <Input
                      id="account_holder_name"
                      name="account_holder_name"
                      value={bankDetails.account_holder_name}
                      onChange={handleBankChange}
                      placeholder="As per bank records"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      name="account_number"
                      value={bankDetails.account_number}
                      onChange={handleBankChange}
                      onFocus={(e) => {
                        if (e.target.value.startsWith('XXXX')) {
                          setBankDetails(prev => ({ ...prev, account_number: '' }));
                        }
                      }}
                      placeholder="Enter your account number"
                      className={bankDetails.account_number.startsWith('XXXX') ? "font-mono" : ""}
                    />
                    {bankDetails.account_number.startsWith('XXXX') && (
                      <p className="text-[10px] text-muted-foreground italic">Click to change account number</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input
                      id="ifsc_code"
                      name="ifsc_code"
                      value={bankDetails.ifsc_code}
                      onChange={handleBankChange}
                      placeholder="e.g. SBIN0001234"
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      name="bank_name"
                      value={bankDetails.bank_name}
                      onChange={handleBankChange}
                      placeholder="e.g. State Bank of India"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBankSubmit}
                    disabled={loading}
                    className="border-primary text-primary hover:bg-primary/5"
                  >
                    Update Bank Details
                  </Button>
                </div>
              </div>


              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:flex-1"
                  disabled={loading || uploading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading || uploading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={logout}
                  className="ml-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

