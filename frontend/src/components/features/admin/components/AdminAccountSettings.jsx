import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Key, Shield, Mail, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/config/api';

export default function AdminAccountSettings() {
    const { user, refreshUser } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || '');

    // Mock Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async () => {
        if (!profileName.trim()) {
            toast({
                title: "Error",
                description: "Name cannot be empty",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', profileName);

            const res = await api.put('/api/users/me', formData);
            if (res.data.success) {
                toast({
                    title: "Success",
                    description: "Profile updated successfully",
                });
                await refreshUser();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update profile",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            toast({
                title: "Error",
                description: "All fields are required",
                variant: "destructive"
            });
            return;
        }

        if (passwords.new !== passwords.confirm) {
            toast({
                title: "Error",
                description: "New passwords do not match!",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/api/auth/password/change', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });

            if (res.data.success) {
                toast({
                    title: "Success",
                    description: "Password updated successfully",
                });
                setPasswords({ current: '', new: '', confirm: '' });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update password",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold text-foreground dark:text-foreground">Account Settings</h2>
                <p className="text-muted-foreground dark:text-muted-foreground">Manage your personal admin profile and security.</p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="profile" className="  hover:text-primary data-[state=active]:text-primary">Profile Details</TabsTrigger>
                    <TabsTrigger value="security" className="  hover:text-primary data-[state=active]:text-primary">Security</TabsTrigger>
                </TabsList>

                {/* PROFILE TAB */}
                <TabsContent value="profile" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Your admin identity details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-20 h-20 bg-primary/20 dark:bg-primary/20 rounded-full flex items-center justify-center text-foreground dark:text-foreground">
                                    <User size={32} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{user?.name || "Admin User"}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <BadgeCheck size={14} className="text-primary" />
                                        <span>Verified Administrator</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            value={profileName}
                                            onChange={(e) => setProfileName(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-foreground" />
                                        <Input
                                            id="email"
                                            defaultValue={user?.email}
                                            className="pl-9 bg-background text-foreground border border-border opacity-100"
                                            readOnly
                                            disabled
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Email cannot be changed securely from here.</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveProfile} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Password & Authentication</CardTitle>
                            <CardDescription>Update your password to keep your account secure.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current">Current Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-foreground" />
                                    <Input
                                        id="current"
                                        name="current"
                                        type="password"
                                        className="pl-9"
                                        value={passwords.current}
                                        onChange={handlePasswordChange}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="new">New Password</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-4 w-4 text-foreground" />
                                        <Input
                                            id="new"
                                            name="new"
                                            type="password"
                                            className="pl-9"
                                            value={passwords.new}
                                            onChange={handlePasswordChange}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm">Confirm New Password</Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-3 h-4 w-4 text-foreground" />
                                        <Input
                                            id="confirm"
                                            name="confirm"
                                            type="password"
                                            className="pl-9"
                                            value={passwords.confirm}
                                            onChange={handlePasswordChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleUpdatePassword} disabled={loading} variant="destructive">
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
