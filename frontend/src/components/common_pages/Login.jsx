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
import ThemeToggle from '@/components/ui/ThemeToggle';
import { BRAND_LOGO, BRAND_NAME, BRAND_SHORT_NAME } from '@/config/brand';
import { Checkbox } from '@/components/ui/checkbox';
export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState('customer');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  axios.defaults.baseURL = API_BASE_URL;

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
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
    onError: (oauthError) => {
      console.error("Google Login Failed:", oauthError);
      setError("Google Login failed");
    }
  });

  const [authMode, setAuthMode] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [registrationStep, setRegistrationStep] = useState(1);

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

    //  BLOCK SIGNUP WITHOUT CONSENT
    if (!agreedToTerms) {
      setError("Please agree to Privacy Policy and Terms of Service");
      setLoading(false);
      return;
    }

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

  return (
    <div className="min-h-screen flex flex-col overflow-hidden font-sans lg:flex-row">
      <div className="order-2 flex min-h-screen flex-col justify-between bg-secondary p-8 lg:order-1 lg:min-h-full lg:w-1/2 lg:p-16">
        <div className="mb-8 hidden lg:block">
          <Link to="/">
            <img src={BRAND_LOGO} alt={`${BRAND_NAME} logo`} className="h-20 w-auto" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-xl"
        >
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Commerce that feels <br />
            <span className="text-primary italic">fast, trusted, and modern</span>
          </h2>
          <p className="mb-12 text-lg text-muted-foreground">
            {BRAND_NAME} brings together smooth shopping, secure checkout, and seller-ready workflows in one production-ready storefront.
          </p>

          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Checkout</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brand Ready</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">1 Hub</div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Orders</div>
            </div>
          </div>

          <div className="mt-16 rounded-3xl border border-border bg-card/80 p-6 shadow-xl">
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Why teams choose {BRAND_SHORT_NAME}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Secure payments', 'Designed to build confidence at checkout'],
                ['Seller operations', 'Manage listings, logistics, and order flow'],
                ['Cleaner branding', 'A polished experience across light and dark mode'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <p className="mt-10 text-center text-xs text-muted-foreground lg:text-left">
          © 2026 {BRAND_NAME}. All rights reserved.
        </p>
      </div>

      <div className="relative order-1 flex flex-1 flex-col items-center justify-center bg-primary p-6 pt-24 lg:order-2 lg:p-12 lg:pt-12">
        <div className="absolute right-6 top-6 z-20 hidden lg:block">
          <div className="scale-125 md:scale-110 [&>button]:border-0 [&>button]:bg-transparent">
            <ThemeToggle />
          </div>
        </div>

        <div className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-border bg-secondary py-2 dark:bg-card dark:border-border lg:hidden">
          <Link to="/" className="ml-3 block">
            <img
              src={BRAND_LOGO}
              alt={`${BRAND_NAME} logo`}
              className="h-16 w-auto drop-shadow-2xl"
            />
          </Link>
          <div className="mr-3">
            <ThemeToggle />
          </div>
        </div>

        <div className="absolute right-0 top-0 h-64 w-64 -mr-32 -mt-32 rounded-full bg-background/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-secondary p-8 shadow-2xl sm:p-10"
        >
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold">
              {isLogin ? 'Welcome back!' : 'Create an account'}
            </h1>
            <p className="text-sm">
              {isLogin ? `Sign in to continue to ${BRAND_NAME}` : `Join ${BRAND_NAME} today`}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive dark:bg-white">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              {error}
            </div>
          )}

          <form onSubmit={registrationStep === 1 && !isLogin ? handleStartRegistration : handleSubmit} className="space-y-4">
            {!isLogin && registrationStep === 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="ml-1 font-semibold">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-xl border-border pl-11 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            )}

            {(isLogin || (!isLogin && registrationStep === 1)) && (
              <div className="space-y-4">
                {registrationStep === 1 && (
                  <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('email'); setIdentifier(''); setError(''); }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${authMode === 'email' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('phone'); setIdentifier(''); setError(''); }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${authMode === 'phone' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                      Phone
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="ml-1 font-semibold">
                    {authMode === 'email' ? 'Email Address' : 'Phone Number'}
                  </Label>
                  <div className="relative">
                    {authMode === 'email' ? (
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      className={`${authMode === 'email' ? 'pl-11' : 'pl-12'} h-12 rounded-xl border-border focus:ring-primary`}
                      required
                      disabled={!isLogin && registrationStep > 1}
                    />
                  </div>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="space-y-1.5">
                <div className="ml-1 flex items-center justify-between">
                  <Label htmlFor="password" title="password" className="font-semibold">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-border pl-11 pr-11 focus:ring-primary"
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

            {!isLogin && registrationStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="otp" className="font-semibold">Verification Code</Label>
                  <button type="button" onClick={handleStartRegistration} className="text-xs font-bold text-primary hover:underline">
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
                  className="h-14 rounded-xl border-border text-center text-2xl font-bold tracking-[0.5em]"
                  maxLength={6}
                  required
                />
                <p className="text-center text-xs italic text-muted-foreground">
                  We've sent a code {authMode === 'email' ? 'to' : 'via SMS to'} {identifier}
                </p>
              </div>
            )}

            {!isLogin && registrationStep === 3 && (
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set Password (Min 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-border pl-11"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-xl border-border pl-11"
                    required
                  />
                </div>

                <div className="flex items-start space-x-3 mt-4">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(val) => setAgreedToTerms(!!val)}
                  />

                  <Label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <Link to="/privacyPolicy" className="text-primary font-semibold hover:underline">
                      Privacy Policy
                    </Link>{" "}
                    &{" "}
                    <Link to="/termsOfService" className="text-primary font-semibold hover:underline">
                      Terms of Service
                    </Link>
                  </Label>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end pr-1">
                <Link to="/forgot-password" title="Forgot Password" className="text-xs font-bold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-xl bg-primary font-bold shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                  disabled={
                    loading ||
                    (!isLogin &&
                      registrationStep === 3 &&
                      !agreedToTerms)
                  }
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
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="bg-secondary px-4">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-xl border-border font-semibold"
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

            <p className="text-center text-sm">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setRegistrationStep(1);
                  setError('');
                }}
                className="ml-1 font-bold text-primary hover:underline"
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
