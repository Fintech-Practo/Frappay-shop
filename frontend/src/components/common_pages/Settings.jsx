import { useState } from 'react';
import { Layout } from '@/index.js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/config/api';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  LogOut,
  Trash2
} from 'lucide-react';

export default function Settings({ insideDashboard = false }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ---------------- PROFILE ---------------- */
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  /* ---------------- PASSWORD ---------------- */
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [showOtpField, setShowOtpField] = useState(false);

  const { login, signup, loginSuccess, requestOTP, addPassword, changePassword: changePass, refreshUser } = useAuth();


  /* ---------------- HANDLERS ---------------- */

  const updateProfile = async () => {
    try {
      await api.put('/api/users/me', { name: profile.name });
      toast({ title: 'Profile Updated', description: 'Your profile has been updated.' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update profile',
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    // If user already has a password, require current password to change
    if (user?.has_password) {
      if (!passwords.currentPassword) {
        toast({ title: 'Error', description: 'Please enter your current password to change it', variant: 'destructive' });
        return;
      }
    }

    // If user does not have a password yet, redirect to set-password page
    // (we allow setting password directly for authenticated OAuth users)
    if (!user?.has_password && !showOtpField) {
      navigate('/set-password');
      return;
    }

    try {
      let result;
      if (!user.has_password) {
        result = await addPassword(passwords.newPassword, passwords.otp);
      } else {
        result = await changePass(passwords.currentPassword, passwords.newPassword);
      }

      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
        setShowOtpField(false);
        refreshUser(); // Update has_password state
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
    }
  };


  const deleteAccount = async () => {
    // Open confirmation modal instead
    setShowDeleteModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentVerified, setCurrentVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      // axios delete with body: use data
      await api.delete('/api/users/me', { data: { password: deletePassword } });
      toast({ title: 'Account Deleted', description: 'Your account has been deleted.' });
      setShowDeleteModal(false);
      logout();
      navigate('/');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to delete account', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
const Wrapper = ({ children }) =>
    insideDashboard ? children : <Layout>{children}</Layout>;
  return (
   
 <Wrapper>
       <div className={insideDashboard ? "space-y-6" : "container-custom py-8 max-w-4xl space-y-6"}>

        <div>
         {!insideDashboard && (
          <Button onClick={() => navigate(-1)}>
            ← Back
          </Button>
 )}

          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and security
          </p>
        </div>


        {/* PROFILE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile.email} disabled />
            </div>
            <Button onClick={updateProfile}>Save Changes</Button>
          </CardContent>
        </Card>

        {/* PASSWORD */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            {/* LEFT SIDE */}
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Security
              </CardTitle>

              <CardDescription className="mt-1">
                {user?.has_password
                  ? 'Change your password'
                  : 'Add a password for email login'}
              </CardDescription>
            </div>

            {/* RIGHT SIDE */}
            <button
              className="text-sm text-primary hover:underline mt-1"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </button>
          </CardHeader>
          <CardContent className="space-y-4">

            {user?.has_password && (
              <div>
                <Label>Current password</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter your current password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    disabled={currentVerified}
                  />
                  {!currentVerified ? (
                    <Button onClick={async () => {
                      if (!passwords.currentPassword) {
                        toast({ title: 'Error', description: 'Please enter your current password', variant: 'destructive' });
                        return;
                      }
                      try {
                        setVerifying(true);
                        await api.post('/api/users/me/verify-password', { password: passwords.currentPassword });
                        setCurrentVerified(true);
                        toast({ title: 'Verified', description: 'Current password verified. You can now set a new password.' });
                      } catch (err) {
                        toast({ title: 'Error', description: err.response?.data?.message || 'Password verification failed', variant: 'destructive' });
                      } finally {
                        setVerifying(false);
                      }
                    }} disabled={verifying}>{verifying ? 'Verifying...' : 'Verify'}</Button>
                  ) : (
                    <Button variant="ghost" onClick={() => { setCurrentVerified(false); setPasswords({ ...passwords, currentPassword: '' }); }}>Change</Button>
                  )}
                </div>
              </div>
            )}

            {(!user?.has_password && showOtpField) && (
              <div className="space-y-2">
                <Label className="text-primary">Verification Code</Label>
                <Input
                  placeholder="Enter 6-digit OTP"
                  value={passwords.otp}
                  onChange={(e) => setPasswords({ ...passwords, otp: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label>New password</Label>
              <Input
                type="password"
                placeholder="At least 8 characters, include upper, lower, number"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>

            <div>
              <Label>Confirm new password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>

            <Button onClick={async () => {
              // If user has password, require verification first
              if (user?.has_password && !currentVerified) {
                toast({ title: 'Error', description: 'Please verify your current password first', variant: 'destructive' });
                return;
              }
              await handleUpdatePassword();
              // reset verification after change
              setCurrentVerified(false);
            }}>
              {user?.has_password ? 'Update Password' : showOtpField ? 'Verify & Add Password' : 'Add Password'}
            </Button>
          </CardContent>
        </Card>


        {/* DANGER ZONE */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <Button variant="destructive" onClick={deleteAccount}>
              Delete Account
            </Button>
          </CardContent>
        </Card>

        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-background/40 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-destructive mb-2">Dangerous Action</h3>
              <p className="text-sm mb-4">This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?</p>
              {user?.has_password && (
                <div className="mb-4">
                  <Label>Enter your current password to confirm</Label>
                  <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Cancel</Button>
                <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteLoading}>{deleteLoading ? 'Deleting...' : 'Delete Account'}</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Wrapper>
  );
}