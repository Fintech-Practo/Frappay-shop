import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/config/api';

import { Layout } from '@/index.js';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Lock, Mail, ArrowLeft, RefreshCw, CheckCircle2, MessageSquare, XCircle, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState('email'); // 'email' or 'phone'
  const [identifier, setIdentifier] = useState(''); // Holds email or phone
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [step, setStep] = useState('email');

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOTP = async (e) => {
    if (e) e.preventDefault();
    if (!identifier) {
      setError(`Please enter your ${authMode === 'email' ? 'email' : 'phone number'}`);
      return;
    }

    if (authMode === 'phone' && !/^\d{10}$/.test(identifier.replace(/\D/g, ''))) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = authMode === 'email' ? { email: identifier } : { phone: identifier };
      const response = await api.post('/api/auth/password/request-reset', {
        ...payload,
        purpose: 'PASSWORD_RESET'
      });

      setSuccess('Reset code sent successfully!');
      toast({
        title: "OTP Sent",
        description: `A 6-digit code has been sent to your registered ${authMode === 'email' ? 'email' : 'phone number'}.`,
      });
      
      setStep('reset');
      setResendTimer(60); // 60 seconds timer
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in password fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = authMode === 'email' ? { email: identifier } : { phone: identifier };
      const response = await api.post('/api/auth/password/reset', {
        ...payload,
        otp,
        newPassword: password
      });

      toast({
        title: "Success",
        description: "Password reset successfully! Redirecting to login...",
      });
      
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl bg-card border border-border overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="space-y-1 pb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-display font-bold">Verify Identity</CardTitle>
              </div>
              <CardDescription className="text-base">
                {step === 'email' 
                  ? (authMode === 'email' ? 'We will send a security link to your registered email' : 'We will send a security code to your registered mobile number')
                  : `Enter the 6-digit code sent to your ${authMode === 'email' ? 'email' : 'phone'}`}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive flex gap-3 items-center"
                >
                  <XCircle className="h-5 w-5 shrink-0" />
                  {error}
                </motion.div>
              )}

              {success && step === 'reset' && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-sm text-foreground flex gap-3 items-center">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold">OTP Sent!</p>
                    <p className="text-xs text-muted-foreground opacity-80">Check your {authMode === 'email' ? 'email inbox' : 'phone messages'}.</p>
                  </div>
                </div>
              )}

              {step === 'email' ? (
                <form onSubmit={handleRequestOTP} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex p-1 bg-muted/50 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('email'); setIdentifier(''); setError(''); }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${authMode === 'email' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('phone'); setIdentifier(''); setError(''); }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${authMode === 'phone' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                      >
                        Phone
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium tracking-wide">
                        Registered {authMode === 'email' ? 'Email Address' : 'Phone Number'}
                      </label>
                      <div className="relative group">
                        {authMode === 'email' ? (
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        ) : (
                          <div className="absolute left-3 top-3.5 text-xs font-bold text-muted-foreground">+91</div>
                        )}
                        <Input
                          type={authMode === 'email' ? 'email' : 'tel'}
                          placeholder={authMode === 'email' ? 'name@example.com' : '00000 00000'}
                          value={identifier}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (authMode === 'phone') {
                              setIdentifier(val.replace(/\D/g, '').slice(0, 10));
                            } else {
                              setIdentifier(val);
                            }
                          }}
                          className={`${authMode === 'email' ? 'pl-10' : 'pl-11'} h-11 bg-background/50 focus:bg-background transition-all rounded-xl`}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sending {authMode === 'email' ? 'Link' : 'Code'}...
                      </div>
                    ) : (authMode === 'email' ? 'Send Reset Link' : 'Send OTP')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-4 flex flex-col items-center">
                    <label className="text-sm font-medium self-start">Verification Code</label>
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(val) => setOtp(val)}
                      disabled={loading}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="rounded-xl border-2 h-14 w-12 text-lg" />
                        <InputOTPSlot index={1} className="rounded-xl border-2 h-14 w-12 text-lg" />
                        <InputOTPSlot index={2} className="rounded-xl border-2 h-14 w-12 text-lg" />
                        <InputOTPSlot index={3} className="rounded-xl border-2 h-14 w-12 text-lg" />
                        <InputOTPSlot index={4} className="rounded-xl border-2 h-14 w-12 text-lg" />
                        <InputOTPSlot index={5} className="rounded-xl border-2 h-14 w-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                    
                    <div className="flex justify-between w-full items-center px-1">
                      <button
                        type="button"
                        onClick={() => handleRequestOTP()}
                        disabled={loading || resendTimer > 0}
                        className="text-xs font-semibold text-primary disabled:text-muted-foreground hover:underline transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className={cn("h-3 w-3", resendTimer > 0 && "opacity-50")} />
                        Resend Code {resendTimer > 0 && `(in ${resendTimer}s)`}
                      </button>
                      <p className="text-[11px] text-muted-foreground">Expires in 10 minutes</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Password</label>
                      <Input
                        type="password"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 bg-background/50 focus:bg-background rounded-xl"
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Confirm Password</label>
                      <Input
                        type="password"
                        placeholder="Re-type password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 bg-background/50 focus:bg-background rounded-xl"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold transition-all"
                  >
                    {loading ? 'Processing...' : 'Reset Password'}
                  </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setOtp('');
                        setPassword('');
                        setConfirmPassword('');
                        setError('');
                      }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      Use a different {authMode === 'email' ? 'email address' : 'phone number'}
                    </button>
                </form>
              )}

              <div className="pt-4 border-t border-border mt-4">
                <Button
                  variant="ghost"
                  className="w-full text-sm hover:bg-muted transition-colors rounded-xl"
                  onClick={() => navigate('/login')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Secure Login
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Shield className="h-3 w-3" />
              Secure 256-bit SSL encrypted connection
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}