import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/config/api';
import { motion } from 'framer-motion';
import { User, Mail, MapPin, Save, Upload, Camera, ArrowLeft, LogOut, Phone, Calendar, Store, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/index.js';
import { resolvePhotoUrl } from '@/utils/url';
import { delhiveryService } from '@/services/delhivery.service';

export default function SellerProfile() {
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
        profile_image_url: '',
        // Seller business info
        business_name: '',
        business_location: '',
        city: '',
        pin: '',
        // Warehouse sync status
        warehouse_synced: false,
        warehouse_id: null,
        gst_number: '',
        pan_number: ''
    });
    const [profileImage, setProfileImage] = useState(null);
    const [previewImage, setPreviewImage] = useState('');

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'SELLER') {
            navigate('/login');
            return;
        }

        fetchProfile();
    }, [isAuthenticated, user]);

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
                    profile_image_url: data.profile_image_url || '',
                    address: data.address || '',
                    location: data.location || '',
                    // Seller business info
                    business_name: data.seller_info?.business_name || '',
                    business_location: data.seller_info?.business_location || '',
                    city: data.seller_warehouse?.city || '',
                    pin: data.seller_warehouse?.pincode || '',
                    // Warehouse sync status
                    warehouse_synced: data.seller_warehouse?.warehouse_created || false,
                    warehouse_id: data.seller_warehouse?.id || null,
                    gst_number: data.seller_info?.gst_number || '',
                    pan_number: data.seller_info?.pan_number || ''
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setUploading(true);

        try {
            const formData = new FormData();
            if (profileData.name) formData.append('name', profileData.name);
            if (profileData.phone) formData.append('phone', profileData.phone);
            if (profileData.gender) formData.append('gender', profileData.gender);
            if (profileData.date_of_birth) formData.append('date_of_birth', profileData.date_of_birth);
            if (profileData.address) formData.append('address', profileData.address);
            if (profileData.location) formData.append('location', profileData.location);
            if (profileImage) {
                formData.append('profile_image', profileImage);
            }

            const res = await api.put('/api/users/me', formData);

            if (res.data.success) {
                toast({
                    title: 'Success',
                    description: 'Seller profile updated successfully',
                });

                // Update local state with the returned data
                const updatedUser = res.data.data;
                if (updatedUser) {
                    setProfileData(prev => ({
                        ...prev,
                        name: updatedUser.name || prev.name,
                        email: updatedUser.email || prev.email,
                        phone: updatedUser.phone || prev.phone,
                        gender: updatedUser.gender || prev.gender,
                        date_of_birth: updatedUser.date_of_birth ? updatedUser.date_of_birth.split('T')[0] : prev.date_of_birth,
                        profile_image_url: updatedUser.profile_image_url || prev.profile_image_url,
                        address: updatedUser.address_line1 || prev.address,
                        location: updatedUser.location || prev.location
                    }));
                    if (updatedUser.profile_image_url) {
                        setPreviewImage(resolvePhotoUrl(updatedUser.profile_image_url));
                    }
                }

                await refreshUser();
                setProfileImage(null);

                // After successful profile update, sync with Delhivery if warehouse exists
                if (profileData.warehouse_id && (profileData.business_name || profileData.phone || profileData.business_location)) {
                    try {
                        const delhiveryData = {
                            name: profileData.business_name || profileData.name,
                            phone: profileData.phone.replace(/\D/g, ''), // Remove any non-digits
                            address: profileData.business_location || `${profileData.address}, ${profileData.location}`,
                            city: profileData.city,
                            pin: profileData.pin,
                            email: profileData.email
                        };

                        await delhiveryService.editClientWarehouse(delhiveryData);

                        toast({
                            title: 'Warehouse Updated',
                            description: 'Your delivery warehouse information has been updated with Delhivery.',
                        });
                    } catch (delhiveryError) {
                        console.error('Delhivery warehouse update failed:', delhiveryError);
                        toast({
                            title: 'Warehouse Sync Warning',
                            description: 'Profile updated but warehouse sync failed. Admin will resolve this.',
                            variant: 'destructive',
                        });
                    }
                }
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

    return (
        <Layout>
            <div className="container-custom py-16 px-3 md:px-0 overflow-x-hidden">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/seller')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Store className="h-8 w-8 text-primary" />
                            Seller Profile
                        </h1>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-lg border p-4 md:p-8 shadow-sm"
                    >
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Profile Image */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="relative">
                                    <div className="h-32 w-32 rounded-full overflow-hidden bg-muted border-4 border-primary shadow-inner">
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
                                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
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
                                    Upload your seller profile picture
                                </p>
                            </div>

                            {/* Name */}
                            <div>
                                <Label htmlFor="name" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Seller Name *
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleChange}
                                    required
                                    className="mt-1"
                                    placeholder="Enter your name or business name"
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
                                    placeholder="Enter your contact number"
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
                                    className="mt-1 bg-muted font-medium"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Login email cannot be changed
                                </p>
                            </div>

                            {/* Location / Region */}
                            <div>
                                <Label htmlFor="location" className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Location / Region
                                </Label>
                                <Input
                                    id="location"
                                    name="location"
                                    value={profileData.location}
                                    onChange={handleChange}
                                    className="mt-1"
                                    placeholder="e.g. New Delhi, India"
                                />
                            </div>

                            {/* Business Verification (Read-only) */}
                            <div className="pt-6 border-t">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Business Verification Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">GST Number</Label>
                                        <div className="mt-1 p-3 bg-muted rounded font-mono font-bold">
                                            {profileData.gst_number || 'Not Provided'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">PAN Number</Label>
                                        <div className="mt-1 p-3 bg-muted rounded font-mono font-bold">
                                            {profileData.pan_number || 'Not Provided'}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Verification details are managed by administrators and cannot be changed directly.
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 pt-6">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="md:flex-1 w-full md:w-auto"
                                    disabled={loading || uploading}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {loading || uploading ? 'Saving...' : 'Save Seller Profile'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    className="w-full md:w-auto"
                                    onClick={() => navigate('/seller')}
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