import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
  import {Layout } from '@/index.js';

export default function SetPassword() {
  const { toast } = useToast();
  const { addPassword, requestOTP, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sendOtp = async () => {
    if (!user?.email) {
      toast({ title: 'Error', description: 'No email available for this account', variant: 'destructive' });
      return;
    }
    setSendingOtp(true);
    const res = await requestOTP(user.email, 'ADD_PASSWORD');
    setSendingOtp(false);
    if (res.success) {
      toast({ title: 'OTP Sent', description: 'Check your email for the 6-digit code' });
    } else {
      toast({ title: 'Error', description: res.message || 'Failed to send OTP', variant: 'destructive' });
    }
  };


  const handleSubmit = async () => {
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    // If user entered an OTP, send it; otherwise call addPassword without OTP (allowed for verified OAuth users)
    const res = form.otp ? await addPassword(form.newPassword, form.otp) : await addPassword(form.newPassword);
    setSubmitting(false);

    if (res.success) {
      toast({ title: 'Success', description: res.message });
      navigate('/settings');
    } else {
      toast({ title: 'Error', description: res.message || 'Failed to add password', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="container-custom py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Add a password</CardTitle>
            <CardDescription>Set a password for email login. An OTP will be sent to your email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>

            <div>
              <Label>Verification Code (OTP)</Label>
              <Input value={form.otp} onChange={(e) => setForm(prev => ({ ...prev, otp: e.target.value }))} placeholder="6-digit code" />
            </div>

            <div>
              <Label>New password</Label>
              <Input type="password" value={form.newPassword} onChange={(e) => setForm(prev => ({ ...prev, newPassword: e.target.value }))} placeholder="At least 8 characters" />
            </div>

            <div>
              <Label>Confirm new password</Label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <Button onClick={sendOtp} disabled={sendingOtp} className="flex-1">{sendingOtp ? 'Sending...' : 'Send OTP'}</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">{submitting ? 'Saving...' : 'Set Password'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}