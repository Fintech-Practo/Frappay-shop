// import { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Check, Plus, ChevronDown, Sparkles } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { useAuth } from '@/context/AuthContext';
// import { usePreferences } from '@/context/PreferenceContext';
// import { useNavigate } from 'react-router-dom';

// const PREFERENCE_OPTIONS = {
//   productType: [
//     { id: 'BOOK', label: 'Books', icon: '📚', color: 'from-blue-400 to-blue-600' },
//     { id: 'NOTEBOOK', label: 'Notebooks', icon: '📓', color: 'from-purple-400 to-purple-600' },
//     { id: 'STATIONERY', label: 'Stationery', icon: '✏️', color: 'from-pink-400 to-pink-600' }
//   ],
//   format: [
//     { id: 'PHYSICAL', label: 'Physical', icon: '📦', color: 'from-amber-400 to-amber-600' },
//     { id: 'EBOOK', label: 'E-Book', icon: '💻', color: 'from-green-400 to-green-600' }
//   ],
//   purpose: [
//     { id: 'STUDY', label: 'Study', icon: '🎓', color: 'from-indigo-400 to-indigo-600' },
//     { id: 'EXAM', label: 'Exam', icon: '📝', color: 'from-red-400 to-red-600' },
//     { id: 'LEISURE', label: 'Leisure', icon: '📖', color: 'from-cyan-400 to-cyan-600' },
//     { id: 'BUSINESS', label: 'Business', icon: '💼', color: 'from-slate-400 to-slate-600' }
//   ],
//   language: [
//     { id: 'en', label: 'English', icon: '🇬🇧', color: 'from-blue-400 to-blue-600' },
//     { id: 'hi', label: 'Hindi', icon: '🇮🇳', color: 'from-orange-400 to-orange-600' },
//     { id: 'es', label: 'Spanish', icon: '🇪🇸', color: 'from-red-400 to-red-600' },
//     { id: 'fr', label: 'French', icon: '🇫🇷', color: 'from-blue-400 to-blue-600' },
//     { id: 'de', label: 'German', icon: '🇩🇪', color: 'from-gray-400 to-gray-600' },
//     { id: 'ja', label: 'Japanese', icon: '🇯🇵', color: 'from-red-400 to-red-600' },
//     { id: 'zh', label: 'Chinese', icon: '🇨🇳', color: 'from-red-400 to-red-600' }
//   ]
// };

// const PreferenceTag = ({ item, isSelected, onClick, disabled = false }) => {
//   return (
//     <motion.button
//       whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
//       whileTap={!disabled ? { scale: 0.95 } : {}}
//       onClick={onClick}
//       disabled={disabled}
//       className={`relative px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
//         isSelected
//           ? `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-blue-500/20`
//           : disabled
//           ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
//           : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
//       }`}
//     >
//       <span className="text-lg">{item.icon}</span>
//       <span className="hidden sm:inline">{item.label}</span>
//       {isSelected && (
//         <motion.div
//           initial={{ scale: 0, rotate: -45 }}
//           animate={{ scale: 1, rotate: 0 }}
//           transition={{ type: 'spring', stiffness: 200, damping: 15 }}
//           className="ml-1"
//         >
//           <Check size={18} className="font-bold" />
//         </motion.div>
//       )}
//     </motion.button>
//   );
// };

// export default function PreferenceDisplay() {
//   const { isAuthenticated, user } = useAuth();
//   const { preferences, loading } = usePreferences();
//   const navigate = useNavigate();
//   const [expandedSection, setExpandedSection] = useState('productType');

//   if (!isAuthenticated) {
//     return (
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200 shadow-sm"
//       >
//         <div className="text-center space-y-4">
//           <div className="flex items-center justify-center gap-2 mb-2">
//             <Sparkles className="text-blue-600" size={24} />
//             <h3 className="text-2xl font-bold text-gray-900">Personalize Your Experience</h3>
//             <Sparkles className="text-blue-600" size={24} />
//           </div>
//           <p className="text-gray-600">
//             Sign in to get personalized book recommendations based on your preferences
//           </p>
//           <Button 
//             onClick={() => navigate('/login')}
//             className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-8 text-white font-semibold"
//           >
//             Sign In
//           </Button>
//         </div>
//       </motion.div>
//     );
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-12">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   const sections = [
//     { key: 'productType', label: 'Product Interests', options: PREFERENCE_OPTIONS.productType },
//     { key: 'format', label: 'Format Preference', options: PREFERENCE_OPTIONS.format },
//     { key: 'purpose', label: 'Purpose', options: PREFERENCE_OPTIONS.purpose },
//     { key: 'language', label: 'Languages', options: PREFERENCE_OPTIONS.language }
//   ];

//   const isCompleted = preferences?.is_completed || false;
//   const selectedPrefs = preferences?.preferences || {};

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       className="space-y-6"
//     >
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
//         <div className="flex-1">
//           <div className="flex items-center gap-3 mb-1">
//             <h2 className="text-xl font-semibold text-gray-900">Your Preferences</h2>
//             {isCompleted && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
//               <Check size={14} /> Complete
//             </span>}
//           </div>
//           <p className="text-sm text-gray-600">
//             {isCompleted ? 'Personalized recommendations ready' : 'Add a few preferences for better suggestions'}
//           </p>
//         </div>
//         {!isCompleted && (
//           <Button 
//             onClick={() => navigate('/preferences-onboarding')}
//             className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 whitespace-nowrap"
//           >
//             <Plus size={18} className="mr-2" />
//             Complete Setup
//           </Button>
//         )}
//       </div>

//       {/* Preference Sections */}
//       <div className="grid gap-6">
//         {sections.map((section, idx) => {
//           const selectedItems = selectedPrefs[section.key] || [];
//           const hasSelection = selectedItems.length > 0;

//           return (
//             <motion.div
//               key={section.key}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: idx * 0.1 }}
//               className="bg-white rounded-3xl p-6 border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300"
//             >
//               <button
//                 onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
//                 className="w-full text-left"
//               >
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
//                       <span className="text-lg">{section.options[0]?.icon}</span>
//                     </div>
//                     <h3 className="text-lg font-bold text-gray-900">{section.label}</h3>
//                   </div>
//                   <div className="flex items-center gap-3">
//                     {hasSelection && (
//                       <motion.span 
//                         initial={{ scale: 0 }}
//                         animate={{ scale: 1 }}
//                         className="text-sm bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-3 py-1 rounded-full font-bold"
//                       >
//                         {selectedItems.length}/{section.options.length}
//                       </motion.span>
//                     )}
//                     <motion.div
//                       animate={{ rotate: expandedSection === section.key ? 180 : 0 }}
//                       transition={{ duration: 0.3 }}
//                     >
//                       <ChevronDown size={22} className="text-gray-600" />
//                     </motion.div>
//                   </div>
//                 </div>
//               </button>

//               {/* Display selected items always */}
//               {hasSelection && (
//                 <motion.div 
//                   initial={{ opacity: 0, y: -10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   className="mt-5"
//                 >
//                   <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
//                     <span className="inline-block w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></span>
//                     SELECTED FOR YOU
//                   </p>
//                   <div className="flex flex-wrap gap-2">
//                     <AnimatePresence>
//                       {selectedItems.map(itemId => {
//                         const item = section.options.find(opt => opt.id === itemId);
//                         return item ? (
//                           <motion.div
//                             key={itemId}
//                             initial={{ opacity: 0, scale: 0.8 }}
//                             animate={{ opacity: 1, scale: 1 }}
//                             exit={{ opacity: 0, scale: 0.8 }}
//                           >
//                             <PreferenceTag
//                               item={item}
//                               isSelected={true}
//                               onClick={() => {}}
//                             />
//                           </motion.div>
//                         ) : null;
//                       })}
//                     </AnimatePresence>
//                   </div>
//                 </motion.div>
//               )}

//               {/* Show expand/collapse for unselected items */}
//               <AnimatePresence>
//                 {expandedSection === section.key && (
//                   <motion.div
//                     initial={{ opacity: 0, height: 0 }}
//                     animate={{ opacity: 1, height: 'auto' }}
//                     exit={{ opacity: 0, height: 0 }}
//                     className="mt-5 pt-5 border-t border-gray-100"
//                   >
//                     {hasSelection && (
//                       <>
//                         <p className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-2">
//                           <span className="inline-block w-2 h-2 bg-gray-300 rounded-full"></span>
//                           EXPLORE MORE
//                         </p>
//                         <div className="flex flex-wrap gap-2">
//                           {section.options
//                             .filter(opt => !selectedItems.includes(opt.id))
//                             .map(item => (
//                               <motion.div
//                                 key={item.id}
//                                 initial={{ opacity: 0 }}
//                                 animate={{ opacity: 1 }}
//                                 exit={{ opacity: 0 }}
//                               >
//                                 <PreferenceTag
//                                   item={item}
//                                   isSelected={false}
//                                   onClick={() => navigate('/preferences-onboarding')}
//                                   disabled={!isCompleted}
//                                 />
//                               </motion.div>
//                             ))}
//                         </div>
//                       </>
//                     )}

//                   {!hasSelection && (
//                     <motion.div 
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       className="py-8 text-center"
//                     >
//                       <div className="text-5xl mb-4">🎯</div>
//                       <h4 className="text-lg font-semibold text-gray-900 mb-2">Add Your First Preference</h4>
//                       <p className="text-gray-600 mb-5">Get personalized recommendations based on your interests</p>
//                       <Button 
//                         onClick={() => navigate('/preferences-onboarding')}
//                         className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
//                         size="sm"
//                       >
//                         <Plus size={16} className="mr-2" />
//                         Get Started
//                       </Button>
//                     </motion.div>
//                   )}
//                 </motion.div>
//               )}
//               </AnimatePresence>

//               {/* Show collapse hint for unselected */}
//               {expandedSection !== section.key && !hasSelection && (
//                 <motion.div 
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   className="mt-4 text-center text-gray-500 text-sm font-medium"
//                 >
//                   ℹ️ Click to add preferences
//                 </motion.div>
//               )}
//             </motion.div>
//           );
//         })}
//       </div>

//       {/* Call to Action if not completed */}
//       {!isCompleted && (
//         <motion.div
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2 }}
//           className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200"
//         >
//           <div className="flex items-center gap-3">
//             <Sparkles className="text-blue-500" size={18} />
//             <div>
//               <div className="text-sm font-medium text-gray-900">Complete your preferences</div>
//               <div className="text-xs text-gray-500">Helps us recommend items you'll love</div>
//             </div>
//           </div>
//           <Button 
//             onClick={() => navigate('/preferences-onboarding')}
//             className="bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm px-4 py-1 rounded-md"
//           >
//             Add Preferences
//           </Button>
//         </motion.div>
//       )}
//     </motion.div>
//   );
// }