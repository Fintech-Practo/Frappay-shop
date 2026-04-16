import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '@/config/api';
import { motion } from 'framer-motion';
import { MapPin, Plus, Edit, Trash2, Check, X, ArrowLeft, Home, Building2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Layout } from '@/index.js';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function Addresses({ insideDashboard = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { toast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [coords, setCoords] = useState(null);
  const [formData, setFormData] = useState({
    label: '',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/addresses');
      if (res.data.success) {
        setAddresses(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch addresses', error);
      toast({
        title: 'Error',
        description: 'Failed to load addresses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/api/addresses/${editingId}`, formData);
        toast({
          title: 'Success',
          description: 'Address updated successfully',
        });
      } else {
        await api.post('/api/addresses', formData);
        toast({
          title: 'Success',
          description: 'Address added successfully',
        });
      }

      setDialogOpen(false);
      resetForm();
      await fetchAddresses();
      if (location.state?.from === 'checkout' && sessionId) {
        navigate(`/checkout/physical?sessionId=${sessionId}`);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save address';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await api.delete(`/api/addresses/${id}`);
      toast({
        title: 'Success',
        description: 'Address deleted successfully',
      });
      await fetchAddresses();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete address',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await api.put(`/api/addresses/${id}/set-default`);
      if (res.data.success && res.data.data) {
        // Update local state with the returned addresses
        setAddresses(res.data.data);
      } else {
        // Fallback to fetching addresses
        await fetchAddresses();
      }
      toast({
        title: 'Success',
        description: 'Default address updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to set default address',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (address) => {
    setEditingId(address.id);
    setFormData({
      label: address.label || '',
      full_name: address.full_name || '',
      phone: address.phone || '',
      address_line1: address.address_line1 || '',
      address_line2: address.address_line2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      country: address.country || 'India',
      is_default: address.is_default || false
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      label: '',
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_default: false
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getLabelIcon = (label) => {
    switch (label?.toLowerCase()) {
      case 'home':
        return <Home className="h-4 w-4" />;
      case 'work':
        return <Briefcase className="h-4 w-4" />;
      case 'office':
        return <Building2 className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };


  const handleBack = () => {
    if (location.state?.from === 'checkout' && sessionId) {
      navigate(`/checkout/physical?sessionId=${sessionId}`);
    } else {
      navigate(-1);
    }
  };


  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocoding (OpenStreetMap – FREE, no API key)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );

          const res = await response.json();

          const address = res?.address || {};
          setCoords({ latitude, longitude });
          setFormData((prev) => ({
            ...prev,
            address_line2:
              address.road ||
              address.neighbourhood ||
              address.suburb ||
              '',
            address_line1: address.village || address.town || '',
            city: address.city || address.town || address.village || '',
            state: address.state || '',
            postal_code: address.postcode || '',
            country: address.country || 'India',
          }));

          toast({
            title: 'Location detected',
            description: 'Address filled using current location',
          });
        } catch (err) {
          toast({
            title: 'Error',
            description: 'Failed to fetch address from location',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        console.error('Geolocation error:', error);

        let message = 'Failed to get location';
        if (error.code === 1) {
          message = 'Permission denied. Please allow location access in your browser settings.';
        } else if (error.code === 2) {
          message = 'Position unavailable. Please try again.';
        } else if (error.code === 3) {
          message = 'Request timed out. Please try again.';
        }

        toast({
          title: 'Location Error',
          description: message,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const content = (
    
      <div className="container-custom py-8 md:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
               {!insideDashboard && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              )}
              <h1 className="text-3xl font-bold">My Addresses</h1>
            </div>

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                  <DialogDescription>
                    {editingId ? 'Update your address details below.' : 'Add a new address to your account.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">


                  <div>
                    <Label htmlFor="label" >Label<span className="text-foreground">*</span></Label>

                    <Select
                      value={formData.label}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, label: value }))
                      }
                    >
                      <SelectTrigger className="mt-1  ">
                        <SelectValue placeholder="Select label" />
                      </SelectTrigger>

                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Work">Work</SelectItem>
                        <SelectItem value="Office">Office</SelectItem>
                        {/* <SelectItem value="Other">Other</SelectItem> */}
                      </SelectContent>
                    </Select>
                  </div>


                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number <span className="text-foreground">*</span></Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchCurrentLocation}
                    className="w-full"
                  >
                    📍 Use Current Location
                  </Button>

                  {/* {coords && (
                          <iframe
                            title="map"
                            width="100%"
                            height="250"
                            className="rounded-lg border"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.longitude - 0.01},${coords.latitude - 0.01},${coords.longitude + 0.01},${coords.latitude + 0.01}&layer=mapnik&marker=${coords.latitude},${coords.longitude}`}
                          />
                        )} */}

                  <div>
                    <Label htmlFor="address_line1">Landmark*</Label>
                    <Input
                      id="address_line1"
                      name="address_line1"
                      value={formData.address_line1}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address_line2">Address*</Label>
                    <Input
                      id="address_line2"
                      name="address_line2"
                      value={formData.address_line2}
                      onChange={handleChange}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postal_code">Postal Code *</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      name="is_default"
                      checked={formData.is_default}
                      onChange={handleChange}
                      className="rounded"
                    />
                    <Label htmlFor="is_default">Set as default address</Label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? 'Saving...' : editingId ? 'Update Address' : 'Add Address'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading && addresses.length === 0 ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-16 bg-muted rounded-lg">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No addresses saved</h3>
              <p className="text-muted-foreground mb-4">Add your first address to get started</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {addresses.map((address) => (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-lg border p-6 relative"
                >
                  {Boolean(address.is_default) && (
                    <div className="absolute top-3 right-4">
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Default
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      {getLabelIcon(address.label)}
                    </div>
                    <div className="flex-1">
                      {address.label && (
                        <div className="font-semibold mb-1">{address.label}</div>
                      )}
                      <div className="text-sm space-y-1">
                        <div className="font-medium">{address.full_name}</div>
                        {address.phone && <div>{address.phone}</div>}
                        <div>
                          {address.address_line1}
                          {address.address_line2 && `, ${address.address_line2}`}
                        </div>
                        <div>
                          {address.city}, {address.state} {address.postal_code}
                        </div>
                        <div>{address.country}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-6">
                      {!address.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(address.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(address)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(address.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    
  );
   return insideDashboard ? content : <Layout>{content}</Layout>;
}

