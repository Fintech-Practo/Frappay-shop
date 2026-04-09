import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { useAuth } from "@/context/AuthContext";
import { BRAND_LOGO, BRAND_NAME, BRAND_PHONE, BRAND_TAGLINE } from '@/config/brand';
import { resolvePhotoUrl } from '@/utils/url';

const headingClass =
  "text-xs font-semibold uppercase tracking-wider text-white mb-3";

const hoverClass =
  "text-sm text-slate-300 hover:text-white transition-colors leading-snug";

export default function Footer() {
  const { footer_links, site_logo, contact_email, contact_phone } = useSiteSettings();
  const { user, loading } = useAuth();

  return (
    <footer className="border-t border-border bg-slate-950 text-slate-100">
      <div className="container-custom py-12">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-5">
            <Link
              to="/"
              className="inline-flex rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_20px_60px_-40px_rgba(59,130,246,0.9)] backdrop-blur-sm"
            >
              <img
                src={resolvePhotoUrl(site_logo) || BRAND_LOGO}
                alt={`${BRAND_NAME} logo`}
                className="h-14 w-auto object-contain"
              />
            </Link>

            <div className="space-y-2">
              <p className="text-base font-semibold">{BRAND_NAME}</p>
              <p className="max-w-sm text-sm leading-6 text-slate-300">
                {BRAND_TAGLINE}
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-sky-300" />
                <a href={`mailto:${contact_email}`} className="hover:text-white transition-colors">
                  {contact_email}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-sky-300" />
                <a href={`tel:${contact_phone || BRAND_PHONE}`} className="hover:text-white transition-colors">
                  {contact_phone || BRAND_PHONE}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-sky-300" />
                <span>Odisha, India</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className={headingClass}>Company</h4>
            <ul className="space-y-2">
              {footer_links?.company?.filter(link => link.name !== "Press").map(link => (
                <li key={link.name}>
                  <Link to={link.href} className={hoverClass}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={headingClass}>Legal</h4>
            <ul className="space-y-2">
              {footer_links?.legal?.filter(link => link.name !== "Seller Agreement").map(link => (
                <li key={link.name}>
                  <Link to={link.href} className={hoverClass}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={headingClass}>Support</h4>
            <ul className="space-y-2">
              {!loading && footer_links?.support.map(link => {
                const name = link.name?.toLowerCase();
                const role = user?.role?.toLowerCase();

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

          <div>
            <h4 className={headingClass}>Why Frap Pay Shop</h4>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>Secure payments and dependable order visibility</li>
              <li>Seller-friendly workflows and support tooling</li>
              <li>Fast, mobile-ready shopping experience</li>
              <li>Clean UI built for modern commerce brands</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-custom py-4">
          <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </p>
            <p className="text-xs text-slate-500">
              Crafted for a production-ready Frap Pay Shop experience.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
