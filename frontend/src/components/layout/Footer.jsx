// import { Link } from 'react-router-dom';
// import {
//   BookOpen,
//   Facebook,
//   Twitter,
//   Instagram,
//   Youtube,
//   Mail,
//   Phone,
//   MapPin
// } from 'lucide-react';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import logo from '@/assets/Logo.png';
// import { useSiteSettings } from '@/context/SiteSettingsContext';

// export default function Footer() {
//   const { site_logo, contact_email, contact_phone, footer_links } = useSiteSettings();
//   const handleFooterClick = (e) => {

//     const link = e.target.closest("a");

//     if (!link) return;
//   }


//   return (
//     <footer className="bg-primary text-primary-foreground">

//       {/* Main footer */}
//       <div className="container-custom py-12">
//         <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
//           {/* Brand */}
//           <div className="col-span-2 md:col-span-1">
//             <Link to="/" className="flex items-center gap-2 mb-4">
//               <img
//                 src={site_logo || logo}
//                 alt="Books & Copies Logo"
//                 className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 object-contain"
//               />
//             </Link>
//             <p className="text-primary-foreground/70 text-sm mb-4">
//               Your one-stop destination for books, e-books, and stationery.
//               Serving both individual readers and businesses.
//             </p>
//             <div className="space-y-2 text-sm text-primary-foreground/70">
//               <div className="flex items-center gap-2">
//                 <Mail className="h-4 w-4" />
//                 <span>{contact_email || 'support@booksandcopy.com'}</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Phone className="h-4 w-4" />
//                 <span>{contact_phone || '+91 8062180677'}</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <MapPin className="h-4 w-4" />
//                 <span>Odisha, India</span>
//               </div>
//             </div>
//           </div>

//           {/* Links */}
//           <div>
//             <h4 className="font-semibold mb-4">Company</h4>
//             <ul className="space-y-2">
//               {footer_links?.company?.map((link) => (
//                 <li key={link.name}>
//                   <Link
//                     to={link.href}
//                     className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
//                   >
//                     {link.name}
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <div>
//             <h4 className="font-semibold mb-4">Support</h4>
//             <ul className="space-y-2">
//               {footer_links?.support?.map((link) => (
//                 <li key={link.name}>
//                   <Link
//                     to={link.href}
//                     className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
//                   >
//                     {link.name}
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <div>
//             <h4 className="font-semibold mb-4">Legal</h4>
//             <ul className="space-y-2">
//               {footer_links?.legal?.map((link) => (
//                 <li key={link.name}>
//                   <Link
//                     to={link.href}
//                     className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
//                   >
//                     {link.name}
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <div>
//             <h4 className="font-semibold mb-4">Categories</h4>
//             <ul className="space-y-2">
//               {footer_links?.categories?.map((link) => (
//                 <li key={link.name}>
//                   <Link
//                     to={link.href}
//                     className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
//                   >
//                     {link.name}
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         </div>
//       </div>

//       {/* Bottom bar */}
//       <div className="border-t border-primary-foreground/10">
//         <div className="container-custom py-6">
//           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
//             <p className="text-sm text-primary-foreground/70">
//               © 2026 Books & Copies. All rights reserved.
//             </p>
//             <div className="flex items-center gap-4">
//               <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
//                 <Facebook className="h-5 w-5" />
//               </a>
//               <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
//                 <Twitter className="h-5 w-5" />
//               </a>
//               <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
//                 <Instagram className="h-5 w-5" />
//               </a>
//               <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
//                 <Youtube className="h-5 w-5" />
//               </a>
//             </div>
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
//   }
import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin
} from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { useAuth } from "@/context/AuthContext";

const headingClass =
  "text-xs font-semibold uppercase tracking-wider text-white mb-2";

const hoverClass =
  "text-xs text-primary-foreground/80 hover:text-white transition-colors leading-snug";

export default function Footer() {
  const { footer_links } = useSiteSettings();
  const { user, loading } = useAuth();

  return (
    <footer className="bg-primary text-primary-foreground">

      {/* MAIN FOOTER */}
      <div className="container-custom py-6">

        <div className="grid grid-cols-2 md:grid-cols-7 gap-6 items-start">

          {/* PMF + Donate */}
          <div className="flex flex-col items-start gap-2">
            <div className="bg-white p-2 w-[85px] h-[85px] flex items-center justify-center">
              <img
                src="https://practomind.com/wp-content/uploads/PMF-New-Logo1_BG-209x150.png"
                alt="Practomind Foundation"
                className="max-w-full max-h-full"
              />
            </div>

            <a
              href="https://pages.razorpay.com/PMFMP"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-2 py-1 text-xs rounded hover:bg-blue-700 transition"
            >
              DONATE NOW
            </a>
          </div>

          {/* Company */}
          <div>
            <h4 className={headingClass}>Company</h4>
            <ul className="space-y-1">
              {footer_links?.company
                ?.filter(link => link.name !== "Press")
                .map(link => (
                  <li key={link.name}>
                    <Link
                      to={link.name === "Blog" ? "https://practomind.com/blog/" : link.name === "Careers" ? "https://practomind.com/career/" : link.href}
                      className={hoverClass}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className={headingClass}>Legal</h4>
            <ul className="space-y-1">
              {footer_links?.legal
  ?.filter(link => link.name !== "Seller Agreement")
  .map(link => (
    <li key={link.name}>
      <Link to={link.href} className={hoverClass}>
        {link.name}
      </Link>
    </li>
))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className={headingClass}>Support</h4>
            <ul className="space-y-1">
              {!loading && footer_links?.support.map(link => {
                // normalize values
                const name = link.name?.toLowerCase();
                const role = user?.role?.toLowerCase();

                // ❌ hide track order for admin & seller
                if (
                  name?.includes("track") &&
                  (role === "admin" || role === "seller")
                ) {
                  return null;
                }

                return (
                  <li key={link.name}>
                    <Link
                      to={link.name === "Track Order" ? "/track-order" : link.href}
                      className={hoverClass}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Our Brands */}
          <div>
            <h4 className={headingClass}>Our Brands</h4>
            <ul className="space-y-1">
              {[
                ["Revo Workplace", "https://practomind.com/revo-workplace/"],
                ["Brandivity", "https://practomind.com/brandivity-marketing/"],
                ["ABC Studioz", "https://practomind.com/abc-studioz-media/"],
                ["Revo Homes", "https://practomind.com/revo-homes/"],
                ["Startup Box", "https://practomind.com/startup-box/"]
              ].map(([name, href]) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={hoverClass}
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Corporate Office */}
          <div className="text-xs space-y-2">
            <div>
              <p className="font-semibold text-white">Corporate Office</p>
              <p>
                Office No-638, Nexus Esplanade,<br />
                Rasulgarh, Bhubaneswar – 751010
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">Call Us</p>
              <p>+91 8062180677</p>
            </div>

            <div>
              <p className="font-semibold text-white">Email</p>
              <a href="mailto:hello@practomind.com" className="hover:underline">
                hello@practomind.com
              </a>
            </div>
          </div>

          {/* Lets Get Started + 10 Years */}
          <div className="flex flex-col items-start gap-5">
            <h2 className="text-2xl font-bold text-white leading-tight">
              Let’s Get Started,
              <span className="block text-lg text-white/90">
                #SolutionsThatDeliver
              </span>
            </h2>

            <div className="bg-black p-4 rounded-md flex items-center justify-center">
              <img
                src="https://practomind.com/wp-content/uploads/practologo10y_white.png"
                alt="10 Years of PractoMind"
                className="max-h-[120px] w-auto object-contain"
              />
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-primary-foreground/10">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">

            <p className="w-full text-xs text-primary-foreground/80 text-center">
              © {new Date().getFullYear()} Books & Copies. A venture by Practomind Solutions LLP. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <a href="https://www.linkedin.com/company/practomind/" className="hover:text-white">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://www.facebook.com/PractoMind" className="hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://x.com/PractoMindSol/" className="hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M18.244 2H21l-6.6 7.55L22 22h-6.828l-5.356-6.77L3.88 22H1l7.05-8.06L2 2h6.828l4.83 6.11L18.244 2z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/practomind/" className="hover:text-white">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://www.youtube.com/@practomind" className="hover:text-white">
                <Youtube className="h-4 w-4" />
              </a>
            </div>

          </div>
        </div>
      </div>

    </footer>
  );
}