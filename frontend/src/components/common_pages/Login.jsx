import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from "@/config/api";
import axios from 'axios';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

import MainLogo from '@/assets/Logo.png';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState('customer');

  axios.defaults.baseURL = API_BASE_URL;

  // Google OAuth Implementation - LOGIC UNTOUCHED
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        console.log("Google Login Success:", tokenResponse);
        const { access_token } = tokenResponse;

        const res = await axios.post(`/api/auth/oauth/google`, {
          token: access_token,
          provider: 'GOOGLE'
        });

        const data = res.data;

        if (res.status === 200 || res.status === 201) {
          loginSuccess(data.data.token, data.data.user);
          navigate('/dashboard');
        } else {
          setError(data.message || "Google Login failed");
        }
      } catch (err) {
        console.error("Google Login Error:", err);
        setError("Google Login failed");
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google Login Failed:", error);
      setError("Google Login failed");
    }
  });

  // Form states
  const [authMode, setAuthMode] = useState('email'); // 'email' or 'phone'
  const [identifier, setIdentifier] = useState(''); // Holds email or phone
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [registrationStep, setRegistrationStep] = useState(1); // 1: Identifier/Name, 2: OTP, 3: Password

  const { login, signup, loginSuccess, requestOTP } = useAuth();
  const navigate = useNavigate();

  const handleStartRegistration = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!identifier) {
      setError(`Please enter your ${authMode === 'email' ? 'email' : 'phone number'}`);
      return;
    }

    if (authMode === 'phone' && !/^\d{10}$/.test(identifier.replace(/\D/g, ''))) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);

    const result = await requestOTP(identifier, "REGISTRATION");
    if (result.success) {
      setRegistrationStep(2);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // LOGIN FLOW
    if (isLogin) {
      const result = await login(identifier, password);

      if (result.success) {
        const role = result?.user?.role?.toUpperCase();
        if (role === "ADMIN") navigate("/admin");
        else if (role === "SELLER") navigate("/seller");
        else navigate("/");
      } else {
        setError(result.message);
      }
      setLoading(false);
      return;
    }

    // SIGNUP FLOW (Final Step)
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const signupData = {
      name,
      password,
      otp,
      role: userType === 'seller' ? 'SELLER' : 'USER'
    };

    if (authMode === 'email') signupData.email = identifier;
    else signupData.phone = identifier;

    const result = await signup(signupData);

    if (result.success) {
      const role = result?.user?.role?.toUpperCase();
      if (role === "SELLER") navigate("/seller");
      else navigate("/dashboard");
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  // UI Support for the new design
  const partners = [
    "https://practomind.com/wp-content/uploads/Logo-ODia.png",
    "https://practomind.com/wp-content/uploads/RevoHomes-Logo-Concept-PM2-1024x181.png",
    "https://practomind.com/wp-content/uploads/Practomind-New-Logo.png",
    "https://practomind.com/wp-content/uploads/Brandivity.png"
  ];

  return (
    <div className="min-h-screen  flex flex-col lg:flex-row  overflow-hidden font-sans">

      {/* Left side - Branding (Updated Design) */}
      <div className="lg:w-1/2 bg-secondary p-8 lg:p-16 flex flex-col justify-between relative order-2 lg:order-1 min-h-screen lg:min-h-full">
        <div className=" hidden lg:block  mb-8">
          <Link to="/" >
            <img src={MainLogo} alt="Logo" className="h-20 w-auto" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-xl"
        >
          <h2 className="font-display text-4xl font-extrabold   leading-tight">
            Your Gateway to <br />
            <span className="text-primary italic">Knowledge & Learning</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Join thousands of readers, students, and businesses who trust
            Books & Copies for their learning needs.
          </p>

          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Books</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">E-Books</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Sellers</div>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">Strategic Partners</h3>
            <div className="flex flex-nowrap lg:flex-wrap gap-6 items-center">
              {partners.map((url, index) => (
                <div key={index} className="h-24 w-24 rounded-full bg-card dark:bg-white border border-border flex items-center justify-center p-3 shadow-sm overflow-hidden">
                  <img src={url} alt="Partner" className="max-h-full max-w-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <p className="text-xs text-muted-foreground  text-center lg:text-left mt-10">
          © 2026 Books & Copies. A venture by Practomind Solutions LLP .All rights reserved.
        </p>
      </div>

      {/* Right side - Form (Updated Design wrapping your existing Logic) */}
      <div className="flex-1 bg-primary flex flex-col items-center justify-center p-6 lg:p-12 pt-24 lg:pt-12 relative order-1 lg:order-2">
        {/* Dark Mode Toggle for Login Page */}
        <div className="absolute top-6 right-6 z-20 hidden lg:block">
          <div className="scale-125 md:scale-110 [&>button]:border-0 [&>button]:bg-transparent">
            <ThemeToggle />
          </div>
        </div>
        <div className="lg:hidden fixed top-0 left-0 w-full bg-secondary dark:bg-card py-2 flex items-center justify-between z-50 border-b border-border dark:border-border">
          <Link to="/" className="block ml-3">
            <img
              src={MainLogo}
              alt="Logo"
              className="h-16 w-auto drop-shadow-2xl"
            />
          </Link>
          <div className="mr-3">
            <ThemeToggle />
          </div>
        </div>
        {/* Background decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-background/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-secondary rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative z-10"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold     mb-2">
              {isLogin ? 'Welcome back!' : 'Create an account'}
            </h1>
            <p className=" text-sm">
              {isLogin ? 'Sign in to continue to your account' : 'Join Books & Copies today'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 dark:bg-white border border-destructive/20 text-destructive text-sm rounded-2xl flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              {error}
            </div>
          )}

          <form onSubmit={registrationStep === 1 && !isLogin ? handleStartRegistration : handleSubmit} className="space-y-4">

            {/* Step 1: Name (Logic Untouched) */}
            {!isLogin && registrationStep === 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="  font-semibold ml-1">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-12   border-border rounded-xl focus:ring-primary"
                    required
                  />
                </div>
              </div>
            )}

            {/* Identifier (Logic Refactored for Email/Phone) */}
            {(isLogin || (!isLogin && registrationStep === 1)) && (
              <div className="space-y-4">
                {registrationStep === 1 && (
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
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="font-semibold ml-1">
                    {authMode === 'email' ? 'Email Address' : 'Phone Number'}
                  </Label>
                  <div className="relative">
                    {authMode === 'email' ? (
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    ) : (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">+91</div>
                    )}
                    <Input
                      id="identifier"
                      type={authMode === 'email' ? 'email' : 'tel'}
                      placeholder={authMode === 'email' ? 'you@example.com' : '00000 00000'}
                      value={identifier}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (authMode === 'phone') {
                          setIdentifier(val.replace(/\D/g, '').slice(0, 10));
                        } else {
                          setIdentifier(val);
                        }
                      }}
                      className={`${authMode === 'email' ? 'pl-11' : 'pl-12'} h-12 border-border rounded-xl focus:ring-primary`}
                      required
                      disabled={!isLogin && registrationStep > 1}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Login Password (Logic Untouched) */}
            {isLogin && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" title="password" className="  font-semibold">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-11 h-12  border-border rounded-xl focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: OTP (Logic Untouched) */}
            {!isLogin && registrationStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="otp" className="font-semibold  ">Verification Code</Label>
                  <button type="button" onClick={handleStartRegistration} className="text-xs text-primary font-bold hover:underline">
                    Resend OTP
                  </button>
                </div>
                <Input
                  id="otp"
                  type="text"
                  placeholder="0 0 0 0 0 0"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (e.target.value.length === 6) setRegistrationStep(3);
                  }}
                  className="text-center text-2xl h-14 tracking-[0.5em] font-bold  border-border rounded-xl"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground text-center italic">
                  We've sent a code {authMode === 'email' ? 'to' : 'via SMS to'} {identifier}
                </p>
              </div>
            )}

            {/* Step 3: Password Configuration (Logic Untouched) */}
            {!isLogin && registrationStep === 3 && (
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4  " />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set Password (Min 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12  border-border rounded-xl"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 " />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-11 h-12  border-border rounded-xl"
                    required
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end pr-1">
                <Link to="/forgot-password" title="Forgot Password" className="text-xs text-primary font-bold hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 bg-primary hover:bg-primary/90  rounded-xl font-bold shadow-lg shadow-primary/20 transition-all"
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : isLogin
                  ? 'Sign In'
                  : registrationStep === 1
                    ? `Verify ${authMode === 'email' ? 'Email' : 'Phone'}`
                    : registrationStep === 2
                      ? 'Check OTP'
                      : 'Complete Registration'}
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                <span className="bg-secondary px-4">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-border hover:  font-semibold  "
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Account
            </Button>

            <p className="text-center text-sm  ">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setRegistrationStep(1);
                  setError('');
                }}
                className="ml-1 text-primary font-bold hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}