import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/config/api';
import { Lock, Key, Shield, Send, CheckCircle2 } from 'lucide-react';

export default function SellerPasswordSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [sendingOTP, setSendingOTP] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const [form, setForm] = useState({
        newPassword: '',
        confirmPassword: '',
        otp: ''
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRequestOTP = async () => {
        setSendingOTP(true);
        try {
            const res = await api.post('/api/auth/request-otp', {
                email: user.email,
                purpose: 'CHANGE_PASSWORD'
            });

            if (res.data.success) {
                toast({
                    title: "OTP Sent",
                    description: "Please check your email for the verification code.",
                });
                setOtpSent(true);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to send OTP",
                variant: "destructive"
            });
        } finally {
            setSendingOTP(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (!form.newPassword || !form.confirmPassword || !form.otp) {
            toast({
                title: "Error",
                description: "All fields are required",
                variant: "destructive"
            });
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            toast({
                title: "Error",
                description: "New passwords do not match!",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/api/auth/password/change-otp', {
                newPassword: form.newPassword,
                otp: form.otp
            });

            if (res.data.success) {
                toast({
                    title: "Success",
                    description: "Password updated successfully",
                });
                setForm({
                    newPassword: '',
                    confirmPassword: '',
                    otp: ''
                });
                setOtpSent(false);
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
        <Card className="w-full max-w-none ml-0 border-border bg-card shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Security Settings
                </CardTitle>
                <CardDescription>
                    Update your password. For added security, an email OTP is required.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-6">
                    {/* OTP SECTION */}
                    <div className="bg-secondary/20 p-4 rounded-lg border border-border/50">
                        <div className="flex items-center justify-between mb-4">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Send className="h-4 w-4 text-primary" />
                                Email Verification
                            </Label>
                            {otpSent && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    OTP Sent to {user?.email}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Enter 6-digit OTP"
                                    name="otp"
                                    value={form.otp}
                                    onChange={handleChange}
                                    className="pr-20"
                                    maxLength={6}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRequestOTP}
                                disabled={sendingOTP}
                                className="whitespace-nowrap"
                            >
                                {sendingOTP ? 'Sending...' : otpSent ? 'Resend OTP' : 'Request OTP'}
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            An OTP will be sent to your registered email address to authorize this change.
                        </p>
                    </div>

                    {/* PASSWORD FIELDS */}
                    <div className="space-y-4">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="newPassword"
                                        name="newPassword"
                                        type="password"
                                        className="pl-9"
                                        placeholder="••••••••"
                                        value={form.newPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        className="pl-9"
                                        placeholder="••••••••"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 pt-6">
                    <Button
                        type="submit"
                        disabled={loading || !otpSent}
                        className="btn-primary min-w-[140px]"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
