import { useState, useEffect, useRef } from 'react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import api from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Upload, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import NoticeBar from '@/components/layout/NoticeBar';

export default function SiteSettings() {
    const siteSettings = useSiteSettings();
    const { fetchSettings, loading: contextLoading, ...initialSettings } = siteSettings;
    const [settings, setSettings] = useState({
        site_logo: '',
        hero_banners: [],
        promo_banners: [],
        contact_email: '',
        contact_phone: ''
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const initialized = useRef(false);

    useEffect(() => {
        // Only initialize once when context finishes loading
        if (!contextLoading && !initialized.current) {
            initialized.current = true;
            setSettings({
                site_logo: initialSettings.site_logo || '',
                hero_banners: initialSettings.hero_banners || [],
                promo_banners: initialSettings.promo_banners || [],
                contact_email: initialSettings.contact_email || '',
                contact_phone: initialSettings.contact_phone || '',
                maintenance_mode: initialSettings.maintenance_mode || { enabled: false, message: 'Platform under maintenance' },
                header_notices: initialSettings.header_notices || []
            });
        }
    }, [contextLoading]);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleBannerChange = (index, field, value, type = 'hero') => {
        const key = type === 'hero' ? 'hero_banners' : 'promo_banners';
        const newBanners = [...(settings[key] || [])];
        if (!newBanners[index]) newBanners[index] = {};
        newBanners[index][field] = value;
        handleChange(key, newBanners);
    };

    const addBanner = (type = 'hero') => {
        const key = type === 'hero' ? 'hero_banners' : 'promo_banners';
        const newBanners = [...(settings[key] || [])];
        newBanners.push(type === 'hero' ? {
            id: Date.now(),
            title: 'New Banner',
            description: '',
            bgImage: '',
            btnText: 'Shop Now',
            btnLink: '/products'
        } : {
            title: 'New Promo',
            description: '',
            image: ''
        });
        handleChange(key, newBanners);
    };

    const removeBanner = (index, type = 'hero') => {
        const key = type === 'hero' ? 'hero_banners' : 'promo_banners';
        const newBanners = [...(settings[key] || [])].filter((_, i) => i !== index);
        handleChange(key, newBanners);
    };

    const handleFileUpload = async (e, key, index = null, field = null) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setLoading(true);
            // Upload to generic asset endpoint to get URL
            const res = await api.post('/api/site-settings/upload-asset', formData);

            if (res.data.success) {
                const imageUrl = res.data.data.imageUrl;
                if (index !== null && field !== null) {
                    // Updating a banner field
                    handleBannerChange(index, field, imageUrl, key === 'hero_banners' ? 'hero' : 'promo');
                } else {
                    // Updating a top-level key like site_logo
                    handleChange(key, imageUrl);
                }
                toast({ title: 'Image uploaded', description: 'Don\'t forget to save changes.' });
            }
        } catch (error) {
            console.error('Upload failed', error);
            toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setLoading(true);
            const res = await api.put('/api/site-settings', { settings });
            if (res.data.success) {
                toast({ title: 'Success', description: 'Site settings updated.' });
                fetchSettings(); // Refresh context
            }
        } catch (error) {
            console.error('Save failed', error);
            toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-display">Site Settings</h1>
                <Button onClick={saveSettings} disabled={loading} className="gap-2">
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <Tabs defaultValue="branding" className="w-full">
                <div className="w-full overflow-x-auto">
                    <TabsList className="flex w-max md:w-full md:grid md:grid-cols-6">
                        <TabsTrigger value="branding" className="hover:text-primary data-[state=active]:text-primary">Branding</TabsTrigger>
                        <TabsTrigger value="hero" className="hover:text-primary data-[state=active]:text-primary">Hero Banners</TabsTrigger>
                        <TabsTrigger value="promos" className="hover:text-primary data-[state=active]:text-primary">Promo Banners</TabsTrigger>
                        <TabsTrigger value="contact" className="hover:text-primary data-[state=active]:text-primary">Contact Info</TabsTrigger>
                        <TabsTrigger value="notices" className="hover:text-primary data-[state=active]:text-primary">Notices</TabsTrigger>
                        <TabsTrigger value="maintenance" className="max-w-[200px] truncate hover:text-primary data-[state=active]:text-primary">Maintenance</TabsTrigger>
                    </TabsList>
                </div>

                {/* BRANDING TAB */}
                <TabsContent value="branding">
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding & Logo</CardTitle>
                            <CardDescription>Update your site logo and main identity.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Site Logo</Label>
                                <div className="flex items-center gap-4">
                                    {settings.site_logo && (
                                        <div className="border p-2 rounded-md">
                                            <img src={settings.site_logo} alt="Logo" className="h-16 object-contain" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'site_logo')}
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">Recommended: PNG, Transparent background.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HERO BANNERS TAB */}
                <TabsContent value="hero">
                    <div className="space-y-4">
                        {(settings.hero_banners || []).map((banner, index) => (
                            <Card key={index} className="relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
                                <CardHeader className="pb-2 flex flex-row justify-between items-start">
                                    <div>
                                        <CardTitle>Banner #{index + 1}</CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeBanner(index, 'hero')} className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label>Badge Text</Label>
                                            <Input value={banner.badge || ''} onChange={(e) => handleBannerChange(index, 'badge', e.target.value)} placeholder="e.g. New Arrivals" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Title</Label>
                                            <Input value={banner.title || ''} onChange={(e) => handleBannerChange(index, 'title', e.target.value)} placeholder="Main Title" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Highlight Text</Label>
                                            <Input value={banner.highlight || ''} onChange={(e) => handleBannerChange(index, 'highlight', e.target.value)} placeholder="Highlighted part" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Description</Label>
                                            <Textarea value={banner.description || ''} onChange={(e) => handleBannerChange(index, 'description', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label>Background Image</Label>
                                            <div className="flex gap-2">
                                                <Input value={banner.bgImage || ''} readOnly className="bg-muted" />
                                                <Label htmlFor={`hero-bg-${index}`} className="cursor-pointer">
                                                    <div className="flex items-center justify-center p-2 border rounded-md hover:bg-muted">
                                                        <Upload className="h-4 w-4" />
                                                    </div>
                                                    <Input id={`hero-bg-${index}`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'hero_banners', index, 'bgImage')} />
                                                </Label>
                                            </div>
                                            {banner.bgImage && <img src={banner.bgImage} className="h-20 w-full object-cover rounded mt-2" />}
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Side Image (Optional)</Label>
                                            <div className="flex gap-2">
                                                <Input value={banner.sideImage || ''} readOnly className="bg-muted" />
                                                <Label htmlFor={`hero-side-${index}`} className="cursor-pointer">
                                                    <div className="flex items-center justify-center p-2 border rounded-md hover:bg-muted">
                                                        <Upload className="h-4 w-4" />
                                                    </div>
                                                    <Input id={`hero-side-${index}`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'hero_banners', index, 'sideImage')} />
                                                </Label>
                                            </div>
                                            {banner.sideImage && <img src={banner.sideImage} className="h-20 w-auto object-contain rounded mt-2" />}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button onClick={() => addBanner('hero')} variant="outline" className="w-full border-dashed gap-2 py-8">
                            <Plus className="h-4 w-4" /> Add New Banner
                        </Button>
                    </div>
                </TabsContent>

                {/* PROMO BANNERS TAB */}
                <TabsContent value="promos">
                    <div className="grid md:grid-cols-2 gap-4">
                        {(settings.promo_banners || []).map((promo, index) => (
                            <Card key={index}>
                                <CardHeader className="flex flex-row justify-between pb-2">
                                    <CardTitle className="text-base">Promo #{index + 1}</CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => removeBanner(index, 'promo')} className="text-destructive h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>Title</Label>
                                        <Input value={promo.title || ''} onChange={(e) => handleBannerChange(index, 'title', e.target.value, 'promo')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Description</Label>
                                        <Input value={promo.description || ''} onChange={(e) => handleBannerChange(index, 'description', e.target.value, 'promo')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Image</Label>
                                        <div className="flex gap-2">
                                            <Input value={promo.image || ''} readOnly className="bg-muted h-8 text-xs" />
                                            <Label htmlFor={`promo-img-${index}`} className="cursor-pointer">
                                                <div className="flex items-center justify-center p-2 border rounded-md hover:bg-muted h-8 w-8">
                                                    <Upload className="h-4 w-4" />
                                                </div>
                                                <Input id={`promo-img-${index}`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'promo_banners', index, 'image')} />
                                            </Label>
                                        </div>
                                        {promo.image && <img src={promo.image} className="h-32 w-full object-cover rounded mt-2" />}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button onClick={() => addBanner('promo')} variant="outline" className="md:col-span-2 border-dashed gap-2 py-8">
                            <Plus className="h-4 w-4" /> Add New Promo Badge
                        </Button>
                    </div>
                </TabsContent>

                {/* CONTACT INFO TAB */}
                <TabsContent value="contact">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                            <CardDescription>Visible in footer and support pages.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Support Email</Label>
                                    <Input value={settings.contact_email || ''} onChange={(e) => handleChange('contact_email', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Support Phone</Label>
                                    <Input value={settings.contact_phone || ''} onChange={(e) => handleChange('contact_phone', e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                {/* NOTICES TAB */}
                <TabsContent value="notices">
                    <Card>
                        <CardHeader className="flex flex-col space-y-4 pb-6 border-b">
                            <div className="flex flex-row justify-between items-start w-full">
                                <div>
                                    <CardTitle className="text-2xl font-black tracking-tight text-primary">Header Notices (Marquee)</CardTitle>
                                    <CardDescription className="text-sm font-medium opacity-60">These scrolling messages appear globally at the very top of the site.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">System Live</span>
                                    </div>
                                </div>
                            </div>

                            {/* LIVE PREVIEW SECTION */}
                            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-2xl overflow-hidden relative group">
                                <div className="absolute top-2 right-4 flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Real-time Preview</span>
                                </div>
                                <div className="mt-4 bg-primary text-white h-11 rounded-lg border border-white/10 overflow-hidden flex items-center shadow-inner">
                                    <NoticeBar />
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                    const newNotices = [...(settings.header_notices || [])];
                                    newNotices.unshift({
                                        id: Date.now(),
                                        message: '',
                                        link: '',
                                        is_active: true
                                    });
                                    handleChange('header_notices', newNotices);
                                    toast({ title: 'New Notice Added!', description: 'Start typing to see it in the preview above.' });
                                }}
                                className="w-full border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary py-8 rounded-xl transition-all"
                            >
                                <Plus className="h-6 w-6 mr-2" />
                                <span className="font-black text-lg tracking-tight">ADD NEW ANNOUNCEMENT</span>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-6">
                            {(settings.header_notices || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border-2 border-dashed rounded-2xl opacity-40">
                                    <div className="p-4 bg-background rounded-full shadow-sm mb-4">
                                        <Plus className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="font-bold text-muted-foreground">No notices active yet.</p>
                                    <p className="text-xs text-muted-foreground/60">Your announcements will show up in the ticker at the top of the site.</p>
                                </div>
                            ) : (
                                (settings.header_notices || []).map((notice, index) => (
                                    <div
                                        key={notice.id || index}
                                        className={`group relative flex flex-col md:flex-row items-center gap-6 p-6 border-2 rounded-2xl transition-all duration-300 shadow-sm
                                            ${notice.is_active
                                                ? 'bg-card border-green-500/20 hover:border-green-500/40'
                                                : 'bg-muted/30 border-dashed border-muted-foreground/20 grayscale-[0.3]'
                                            }`}
                                    >
                                        {/* Status Badge */}
                                        <div className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border
                                            ${notice.is_active
                                                ? 'bg-green-500 text-white border-green-600'
                                                : 'bg-slate-500 text-white border-slate-600'
                                            }`}
                                        >
                                            {notice.is_active ? '● Showing Live' : '○ Currently Hidden'}
                                        </div>

                                        <div className="flex-1 space-y-3 w-full">
                                            <Label className="text-[11px] font-black uppercase tracking-wider opacity-60 flex items-center gap-2">
                                                <span>Announcement Message</span>
                                            </Label>
                                            <Input
                                                value={notice.message || ''}
                                                onChange={(e) => {
                                                    const newNotices = [...(settings.header_notices || [])];
                                                    newNotices[index].message = e.target.value;
                                                    handleChange('header_notices', newNotices);
                                                }}
                                                placeholder="Enter the text that will scroll across the top..."
                                                className={`h-12 text-base font-medium shadow-none focus-visible:ring-primary/20 transition-all
                                                    ${notice.is_active ? 'border-primary/20' : 'opacity-60'}`}
                                            />
                                        </div>

                                        <div className="flex-1 space-y-3 w-full">
                                            <Label className="text-[11px] font-black uppercase tracking-wider opacity-60">Redirect URL (Optional)</Label>
                                            <Input
                                                value={notice.link || ''}
                                                onChange={(e) => {
                                                    const newNotices = [...(settings.header_notices || [])];
                                                    newNotices[index].link = e.target.value;
                                                    handleChange('header_notices', newNotices);
                                                }}
                                                placeholder="e.g. /products/sale-2024"
                                                className="h-12 shadow-none focus-visible:ring-primary/20 transition-all"
                                            />
                                        </div>

                                        <div className="flex items-center gap-4 mt-6 md:mt-2 shrink-0">
                                            <div className="flex flex-col items-center gap-2">
                                                <Label className="text-[9px] font-black uppercase tracking-tighter opacity-40">Visibility</Label>
                                                <Button
                                                    variant={notice.is_active ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={`w-36 h-12 rounded-xl font-black text-xs transition-all duration-300
                                                        ${notice.is_active
                                                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                                                            : 'border-2 border-dashed border-border hover:bg-muted'
                                                        }`}
                                                    onClick={() => {
                                                        const newNotices = [...(settings.header_notices || [])];
                                                        newNotices[index].is_active = !notice.is_active;
                                                        handleChange('header_notices', newNotices);
                                                    }}
                                                >
                                                    {notice.is_active ? 'ACTIVE & LIVE' : 'HIDDEN / DRAFT'}
                                                </Button>
                                            </div>

                                            <div className="flex flex-col items-center gap-2">
                                                <Label className="text-[9px] font-black uppercase tracking-tighter opacity-40">Delete</Label>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => {
                                                        const newNotices = [...(settings.header_notices || [])].filter((_, i) => i !== index);
                                                        handleChange('header_notices', newNotices);
                                                    }}
                                                    className="w-12 h-12 rounded-xl shadow-lg shadow-destructive/10 hover:scale-105 transition-transform"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MAINTENANCE MODE TAB */}
                <TabsContent value="maintenance">
                    <Card className={settings.maintenance_mode?.enabled ? "border-destructive/50" : ""}>
                        <CardHeader>
                            <CardTitle className={settings.maintenance_mode?.enabled ? "text-destructive" : ""}>
                                Maintenance Mode
                            </CardTitle>
                            <CardDescription>
                                When enabled, all non-admin users will be blocked from accessing the site and APIs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-md">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Enable Maintenance Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Instantly locks the site for customers. Admins can still log in and use the dashboard.
                                    </p>
                                </div>
                                <Button
                                    variant={settings.maintenance_mode?.enabled ? "destructive" : "outline"}
                                    onClick={() => {
                                        handleChange('maintenance_mode', {
                                            ...settings.maintenance_mode,
                                            enabled: !settings.maintenance_mode?.enabled
                                        });
                                    }}
                                >
                                    {settings.maintenance_mode?.enabled ? "Mode is ON" : "Turn ON"}
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Maintenance Message (Shown to users)</Label>
                                <Textarea
                                    value={settings.maintenance_mode?.message || ''}
                                    onChange={(e) => {
                                        handleChange('maintenance_mode', {
                                            ...settings.maintenance_mode,
                                            message: e.target.value
                                        });
                                    }}
                                    placeholder="We are currently upgrading our systems. Please check back in a few hours."
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This message will be displayed on the 503 Maintenance error page.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
