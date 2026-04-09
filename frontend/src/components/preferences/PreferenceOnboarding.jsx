// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { motion } from 'framer-motion';
// import {
//   BookOpen,
//   Zap,
//   CheckCircle2,
//   ChevronRight,
//   Home,
//   Book,
//   Notebook,
//   Sparkles,
//   Sun,
//   Moon,
//   Bell,
//   Mail,
//   MessageSquare,
//   Gift,
//   IndianRupee,
//   Target,
//   Globe,
//   Palette
// } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Label } from '@/components/ui/label';
// import { Checkbox } from '@/components/ui/checkbox';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Input } from '@/components/ui/input';
// import { useToast } from '@/components/ui/use-toast';
// import { useAuth } from '@/context/AuthContext';
// import api from '@/config/api';

// const PRODUCT_TYPES = [
//   { id: 'BOOK', label: 'Books', icon: Book, color: 'from-blue-500 to-blue-600' },
//   { id: 'NOTEBOOK', label: 'Notebooks', icon: Notebook, color: 'from-purple-500 to-purple-600' },
//   { id: 'STATIONERY', label: 'Stationery', icon: Sparkles, color: 'from-pink-500 to-pink-600' },
// ];

// const FORMATS = [
//   { id: 'PHYSICAL', label: 'Physical Books', icon: Book },
//   { id: 'EBOOK', label: 'E-Books', icon: Sparkles },
// ];

// const PURPOSES = [
//   { id: 'STUDY', label: 'Study', icon: Zap },
//   { id: 'EXAM', label: 'Exam Prep', icon: Target },
//   { id: 'LEISURE', label: 'Leisure Reading', icon: Sparkles },
//   { id: 'BUSINESS', label: 'Business', icon: Zap },
// ];

// const LANGUAGES = [
//   { id: 'en', label: 'English' },
//   { id: 'hi', label: 'Hindi' },
//   { id: 'es', label: 'Spanish' },
//   { id: 'fr', label: 'French' },
// ];

// const THEME_OPTIONS = [
//   { id: 'light', label: 'Light', icon: Sun },
//   { id: 'dark', label: 'Dark', icon: Moon },
//   { id: 'auto', label: 'Auto', icon: Palette },
// ];

// export default function PreferenceOnboarding() {
//   const navigate = useNavigate();
//   const { toast } = useToast();
//   const { isAuthenticated, user } = useAuth();

//   const [step, setStep] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [preferences, setPreferences] = useState({
//     preferred_types: [],
//     preferred_formats: [],
//     purpose: [],
//     budget_min: '',
//     budget_max: '',
//     language: 'en',
//     theme: 'auto',
//     notifications: {
//       email_notifications: true,
//       push_notifications: true,
//       newsletter: false,
//       marketing_emails: false,
//       recommendations: true,
//     },
//   });

//   // Redirect if not authenticated
//   useEffect(() => {
//     if (!isAuthenticated) {
//       navigate('/login');
//       return;
//     }

//     // Check if preferences already completed
//     checkPreferenceStatus();
//   }, [isAuthenticated]);

//   const checkPreferenceStatus = async () => {
//     try {
//       const res = await api.get('/api/preferences/status');
//       if (res.data.success && res.data.data.is_completed) {
//         // Already completed, redirect to dashboard
//         navigate('/dashboard');
//       }
//     } catch (error) {
//       // It's okay if status endpoint returns 404 (no preferences yet) — silently ignore
//       if (error.response?.status && error.response.status !== 404) {
//         console.error('Error checking preference status:', error);
//       }
//     }
//   };

//   const toggleType = (typeId) => {
//     setPreferences(prev => ({
//       ...prev,
//       preferred_types: prev.preferred_types.includes(typeId)
//         ? prev.preferred_types.filter(id => id !== typeId)
//         : [...prev.preferred_types, typeId]
//     }));
//   };

//   const toggleFormat = (formatId) => {
//     setPreferences(prev => ({
//       ...prev,
//       preferred_formats: prev.preferred_formats.includes(formatId)
//         ? prev.preferred_formats.filter(id => id !== formatId)
//         : [...prev.preferred_formats, formatId]
//     }));
//   };

//   const togglePurpose = (purposeId) => {
//     setPreferences(prev => ({
//       ...prev,
//       purpose: prev.purpose.includes(purposeId)
//         ? prev.purpose.filter(id => id !== purposeId)
//         : [...prev.purpose, purposeId]
//     }));
//   };

//   const toggleNotification = (key) => {
//     setPreferences(prev => ({
//       ...prev,
//       notifications: {
//         ...prev.notifications,
//         [key]: !prev.notifications[key]
//       }
//     }));
//   };

//   const handleSkip = () => {
//     // Save empty preferences to mark as completed
//     savePreferences();
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (step < 4) {
//       setStep(step + 1);
//       return;
//     }

//     savePreferences();
//   };

//   const savePreferences = async () => {
//     setLoading(true);
//     try {
//       // Remove empty budget values
//       const prefsToSave = {
//         ...preferences,
//         budget_min: preferences.budget_min ? parseInt(preferences.budget_min) : undefined,
//         budget_max: preferences.budget_max ? parseInt(preferences.budget_max) : undefined,
//       };

//       // Remove undefined values
//       Object.keys(prefsToSave).forEach(key => {
//         if (prefsToSave[key] === undefined || prefsToSave[key] === '') {
//           delete prefsToSave[key];
//         }
//       });

//       const res = await api.post('/api/preferences/me', {
//         preferences: prefsToSave
//       });

//       if (res.data.success) {
//         toast({
//           title: 'Success!',
//           description: 'Your preferences have been saved',
//           variant: 'default',
//         });
//         navigate('/dashboard');
//       }
//     } catch (error) {
//       console.error('Error saving preferences:', error);
//       const errorMsg = error.response?.data?.message || 'Failed to save preferences';
//       toast({
//         title: 'Error',
//         description: errorMsg,
//         variant: 'destructive',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const containerVariants = {
//     hidden: { opacity: 0 },
//     visible: {
//       opacity: 1,
//       transition: {
//         staggerChildren: 0.1,
//         delayChildren: 0.2,
//       },
//     },
//   };

//   const itemVariants = {
//     hidden: { opacity: 0, y: 20 },
//     visible: {
//       opacity: 1,
//       y: 0,
//       transition: { duration: 0.5 },
//     },
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
//       {/* Header */}
//       <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
//         <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
//           <button
//             onClick={() => navigate('/dashboard')}
//             className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
//           >
//             <Home className="h-4 w-4" />
//             Skip for now
//           </button>
//           <div className="flex items-center gap-2">
//             {[1, 2, 3, 4].map((s) => (
//               <div
//                 key={s}
//                 className={`h-2 w-8 rounded-full transition-all ${
//                   s <= step ? 'bg-primary' : 'bg-muted'
//                 }`}
//               />
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="max-w-5xl mx-auto px-4 py-12">
//         <motion.div
//           key={step}
//           variants={containerVariants}
//           initial="hidden"
//           animate="visible"
//           className="space-y-8"
//         >
//           {/* Step Indicator */}
//           <motion.div variants={itemVariants} className="text-center">
//             <h1 className="font-display text-4xl font-bold mb-2">
//               {step === 1 && "What do you like to read?"}
//               {step === 2 && "How do you prefer to read?"}
//               {step === 3 && "Let's personalize your experience"}
//               {step === 4 && "Final touches"}
//             </h1>
//             <p className="text-muted-foreground">
//               {step === 1 && "Help us understand your reading preferences"}
//               {step === 2 && "Choose your preferred format"}
//               {step === 3 && "Set your budget and language"}
//               {step === 4 && "Notification and theme preferences"}
//             </p>
//           </motion.div>

//           {/* Step 1: Product Types & Purpose */}
//           {step === 1 && (
//             <motion.div variants={itemVariants} className="space-y-8">
//               {/* Product Types */}
//               <div className="space-y-4">
//                 <h2 className="text-xl font-semibold">What products interest you?</h2>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   {PRODUCT_TYPES.map(type => (
//                     <motion.button
//                       key={type.id}
//                       whileHover={{ scale: 1.05 }}
//                       whileTap={{ scale: 0.95 }}
//                       onClick={() => toggleType(type.id)}
//                       className={`p-6 rounded-xl border-2 transition-all text-left ${
//                         preferences.preferred_types.includes(type.id)
//                           ? 'border-primary bg-primary/5'
//                           : 'border-border hover:border-primary/50'
//                       }`}
//                     >
//                       <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-4`}>
//                         <type.icon className="h-6 w-6" />
//                       </div>
//                       <h3 className="font-semibold">{type.label}</h3>
//                       <p className="text-sm text-muted-foreground mt-1">
//                         {type.id === 'BOOK' && 'Fiction, non-fiction, textbooks'}
//                         {type.id === 'NOTEBOOK' && 'Study & writing notebooks'}
//                         {type.id === 'STATIONERY' && 'Pens, pencils, supplies'}
//                       </p>
//                       {preferences.preferred_types.includes(type.id) && (
//                         <CheckCircle2 className="h-5 w-5 text-primary mt-4" />
//                       )}
//                     </motion.button>
//                   ))}
//                 </div>
//               </div>

//               {/* Purpose */}
//               <div className="space-y-4">
//                 <h2 className="text-xl font-semibold">What's your primary purpose?</h2>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//                   {PURPOSES.map(purpose => (
//                     <motion.button
//                       key={purpose.id}
//                       whileHover={{ scale: 1.05 }}
//                       whileTap={{ scale: 0.95 }}
//                       onClick={() => togglePurpose(purpose.id)}
//                       className={`p-4 rounded-lg border-2 transition-all text-center ${
//                         preferences.purpose.includes(purpose.id)
//                           ? 'border-primary bg-primary/5'
//                           : 'border-border hover:border-primary/50'
//                       }`}
//                     >
//                       <purpose.icon className={`h-6 w-6 mx-auto mb-2 ${
//                         preferences.purpose.includes(purpose.id)
//                           ? 'text-primary'
//                           : 'text-muted-foreground'
//                       }`} />
//                       <span className="text-sm font-medium">{purpose.label}</span>
//                     </motion.button>
//                   ))}
//                 </div>
//               </div>
//             </motion.div>
//           )}

//           {/* Step 2: Formats */}
//           {step === 2 && (
//             <motion.div variants={itemVariants} className="space-y-8">
//               <div className="space-y-4">
//                 <h2 className="text-xl font-semibold">Which formats do you prefer?</h2>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {FORMATS.map(format => (
//                     <motion.button
//                       key={format.id}
//                       whileHover={{ scale: 1.05 }}
//                       whileTap={{ scale: 0.95 }}
//                       onClick={() => toggleFormat(format.id)}
//                       className={`p-8 rounded-xl border-2 transition-all text-center ${
//                         preferences.preferred_formats.includes(format.id)
//                           ? 'border-primary bg-primary/5'
//                           : 'border-border hover:border-primary/50'
//                       }`}
//                     >
//                       <format.icon className={`h-12 w-12 mx-auto mb-4 ${
//                         preferences.preferred_formats.includes(format.id)
//                           ? 'text-primary'
//                           : 'text-muted-foreground'
//                       }`} />
//                       <h3 className="font-semibold text-lg">{format.label}</h3>
//                       {preferences.preferred_formats.includes(format.id) && (
//                         <CheckCircle2 className="h-5 w-5 text-primary mt-4 mx-auto" />
//                       )}
//                     </motion.button>
//                   ))}
//                 </div>
//               </div>

//               {/* Additional Info */}
//               <div className="bg-accent/50 border border-accent p-6 rounded-lg">
//                 <p className="text-sm text-muted-foreground">
//                   💡 You can change these preferences anytime in your settings
//                 </p>
//               </div>
//             </motion.div>
//           )}

//           {/* Step 3: Budget & Language */}
//           {step === 3 && (
//             <motion.div variants={itemVariants} className="space-y-8">
//               {/* Budget */}
//               <div className="space-y-4">
//                 <h2 className="text-xl font-semibold flex items-center gap-2">
//                   <IndianRupee className="h-5 w-5" />
//                   What's your budget range?
//                 </h2>
//                 <p className="text-sm text-muted-foreground">Leave empty if no preference</p>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <Label htmlFor="budget_min">Minimum (₹)</Label>
//                     <Input
//                       id="budget_min"
//                       type="number"
//                       placeholder="0"
//                       value={preferences.budget_min}
//                       onChange={(e) => setPreferences({
//                         ...preferences,
//                         budget_min: e.target.value
//                       })}
//                       className="mt-2"
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="budget_max">Maximum (₹)</Label>
//                     <Input
//                       id="budget_max"
//                       type="number"
//                       placeholder="10000"
//                       value={preferences.budget_max}
//                       onChange={(e) => setPreferences({
//                         ...preferences,
//                         budget_max: e.target.value
//                       })}
//                       className="mt-2"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* Language */}
//               <div className="space-y-4">
//                 <h2 className="text-xl font-semibold flex items-center gap-2">
//                   <Globe className="h-5 w-5" />
//                   Preferred language
//                 </h2>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//                   {LANGUAGES.map(lang => (
//                     <motion.label
//                       key={lang.id}
//                       whileHover={{ scale: 1.02 }}
//                       className={`p-4 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${
//                         preferences.language === lang.id
//                           ? 'border-primary bg-primary/5'
//                           : 'border-border hover:border-primary/50'
//                       }`}
//                     >
//                       <RadioGroup value={preferences.language}>
//                         <RadioGroupItem
//                           value={lang.id}
//                           id={lang.id}
//                           onClick={() => setPreferences({
//                             ...preferences,
//                             language: lang.id
//                           })}
//                         />
//                       </RadioGroup>
//                       <span className="ml-2 font-medium">{lang.label}</span>
//                     </motion.label>
//                   ))}
//                 </div>
//               </div>
//             </motion.div>
//           )}

//           {/* Step 4: Notifications & Theme */}
//           {step === 4 && (
//             <motion.div variants={itemVariants} className="space-y-8">
//               {/* Theme */}
//               <div className="space-y-4">
//                 <h2 className="text-xl font-semibold">Theme preference</h2>
//                 <div className="grid grid-cols-3 gap-3">
//                   {THEME_OPTIONS.map(theme => (
//                     <motion.button
//                       key={theme.id}
//                       whileHover={{ scale: 1.05 }}
//                       whileTap={{ scale: 0.95 }}
//                       onClick={() => setPreferences({
//                         ...preferences,
//                         theme: theme.id
//                       })}
//                       className={`p-4 rounded-lg border-2 transition-all text-center ${
//                         preferences.theme === theme.id
//                           ? 'border-primary bg-primary/5'
//                           : 'border-border hover:border-primary/50'
//                       }`}
//                     >
//                       <theme.icon className={`h-6 w-6 mx-auto mb-2 ${
//                         preferences.theme === theme.id
//                           ? 'text-primary'
//                           : 'text-muted-foreground'
//                       }`} />
//                       <span className="text-sm font-medium">{theme.label}</span>
//                     </motion.button>
//                   ))}
//                 </div>
//               </div>

//               {/* Notifications */}
//               <div className="space-y-4">
//                 <h2 className="text-xl font-semibold flex items-center gap-2">
//                   <Bell className="h-5 w-5" />
//                   Notification preferences
//                 </h2>
//                 <div className="space-y-3">
//                   {[
//                     {
//                       key: 'email_notifications',
//                       label: 'Email notifications',
//                       icon: Mail,
//                       desc: 'Order updates and account notifications'
//                     },
//                     {
//                       key: 'push_notifications',
//                       label: 'Push notifications',
//                       icon: MessageSquare,
//                       desc: 'Real-time alerts and messages'
//                     },
//                     {
//                       key: 'recommendations',
//                       label: 'Personalized recommendations',
//                       icon: Sparkles,
//                       desc: 'Books tailored to your preferences'
//                     },
//                     {
//                       key: 'newsletter',
//                       label: 'Weekly newsletter',
//                       icon: Gift,
//                       desc: 'New releases and deals'
//                     },
//                     {
//                       key: 'marketing_emails',
//                       label: 'Marketing emails',
//                       icon: Zap,
//                       desc: 'Promotions and special offers'
//                     },
//                   ].map(notif => (
//                     <motion.div
//                       key={notif.key}
//                       whileHover={{ scale: 1.02 }}
//                       className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
//                     >
//                       <div className="flex items-center gap-3">
//                         <notif.icon className="h-5 w-5 text-primary" />
//                         <div>
//                           <p className="font-medium">{notif.label}</p>
//                           <p className="text-sm text-muted-foreground">{notif.desc}</p>
//                         </div>
//                       </div>
//                       <Checkbox
//                         checked={preferences.notifications[notif.key]}
//                         onChange={() => toggleNotification(notif.key)}
//                       />
//                     </motion.div>
//                   ))}
//                 </div>
//               </div>

//               {/* Summary */}
//               <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg">
//                 <p className="text-sm text-muted-foreground">
//                   ✨ All set! You can always update these preferences in your settings
//                 </p>
//               </div>
//             </motion.div>
//           )}

//           {/* Action Buttons */}
//           <motion.div variants={itemVariants} className="flex gap-4 pt-4">
//             {step > 1 && (
//               <Button
//                 variant="outline"
//                 onClick={() => setStep(step - 1)}
//                 disabled={loading}
//                 className="flex-1"
//               >
//                 Back
//               </Button>
//             )}
//             {step < 4 ? (
//               <Button
//                 onClick={handleSubmit}
//                 disabled={loading}
//                 className="flex-1 flex items-center gap-2"
//               >
//                 Next <ChevronRight className="h-4 w-4" />
//               </Button>
//             ) : (
//               <>
//                 <Button
//                   variant="outline"
//                   onClick={handleSkip}
//                   disabled={loading}
//                   className="flex-1"
//                 >
//                   Skip
//                 </Button>
//                 <Button
//                   onClick={handleSubmit}
//                   disabled={loading}
//                   className="flex-1 flex items-center gap-2"
//                 >
//                   {loading ? 'Saving...' : 'Complete Setup'} <CheckCircle2 className="h-4 w-4" />
//                 </Button>
//               </>
//             )}
//           </motion.div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }