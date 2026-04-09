import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Truck,
  Shield,
  Clock,
  Tablet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { resolvePhotoUrl } from '@/utils/url';

export default function HeroSection() {
  const { hero_banners } = useSiteSettings();
  const [current, setCurrent] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Use hero_banners directly from context (which already handles fallback)
  const activeSlides = hero_banners;

  const slidesLength = activeSlides.length;
  const intervalRef = useRef(null);

  const stopAutoPlay = () => {
    setIsAutoPlay(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const prevSlide = () => {
    stopAutoPlay();
    setCurrent((prev) => (prev === 0 ? slidesLength - 1 : prev - 1));
  };

  const nextSlide = () => {
    stopAutoPlay();
    setCurrent((prev) => (prev + 1) % slidesLength);
  };

  //  Auto-slide (5s) — stops after interaction
  useEffect(() => {
    if (!isAutoPlay) return;

    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slidesLength);
    }, 5000);

    return () => clearInterval(intervalRef.current);
  }, [isAutoPlay]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const slide = activeSlides[current] || activeSlides[0];

  return (
    <section className="relative overflow-hidden text-white group">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${resolvePhotoUrl(slide.bgImage)})` }}
      />
      <div className="absolute inset-0 bg-black/60" />

      {/* Left Button */}
      <button
        onClick={prevSlide}
        className="absolute left-5 top-1/2 -translate-y-1/2 z-20
                   w-11 h-11 rounded-full
                   border border-white/40
                   bg-white/10 backdrop-blur
                   flex items-center justify-center
                   active:scale-90
                   focus:ring-2 focus:ring-accent
                   transition-all duration-200
                   opacity-100 md:opacity-0
                   md:group-hover:opacity-100"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Right Button */}
      <button
        onClick={nextSlide}
        className="absolute right-5 top-1/2 -translate-y-1/2 z-20
                   w-11 h-11 rounded-full
                   border border-white/40
                   bg-white/10 backdrop-blur
                   flex items-center justify-center
                   active:scale-90
                   focus:ring-2 focus:ring-accent
                   transition-all duration-200
                   opacity-100 md:opacity-0
                   md:group-hover:opacity-100"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="container-custom relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 lg:py-24">
          {/* Left Content */}
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 mb-6 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" />
              {slide.badge}
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              {slide.title}
              <span className="block text-accent">{slide.highlight}</span>
            </h1>

            <p className="text-lg text-gray-200 mb-8 max-w-lg mx-auto lg:mx-0">
              {slide.description}
            </p>

            {slide.btnText && (
              <Link to={slide.btnLink}>
                <Button size="lg" className="bg-accent text-white hover:bg-accent/90">
                  {slide.btnText}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </motion.div>
          {/* Right Card */}
          <div className="hidden lg:flex items-center justify-center relative w-80 h-96 mx-auto lg:translate-x-12 ">

            {/* Back floating card  */}
            <motion.div
              aria-hidden
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
      absolute
      w-72 h-80           
      -top-[-30px]         
      -left-0           
      rounded-2xl
      bg-primary
      backdrop-blur-md
      border border-accent/80
      ring-0 ring-accent/15 ring-offset-0 ring-offset-transparent/20
      shadow-[26px_44px_30px_-50px_rgba(0,0,0,0.35)]
      pointer-events-none
    "
            />

            {/* Front main card (STATIC) */}
            <div
              className="
      relative w-72 h-80
      rounded-2xl
      bg-cover bg-center
      border border-accent/100
      ring-1 ring-accent/40 ring-offset-1 ring-offset-transparent/10
      shadow-[0_28px_55px_-22px_rgba(0,0,0,0.9)]
      overflow-hidden
      z-10
    "
              style={{ backgroundImage: `url(${resolvePhotoUrl(slide.sideImage)})` }}
            >
              <div className="absolute inset-0 bg-black/55" />

              <div className="absolute inset-0 flex items-center justify-center">
                {slide.sideType === "features" ? (
                  <div className="flex flex-col gap-5 px-6">
                    <Feature icon={Truck} text="Free Shipping" />
                    <Feature icon={Shield} text="Secure Payments" />
                    <Feature icon={Clock} text="Fast Delivery" />
                    <Feature icon={Tablet} text="Instant E-Books" />
                  </div>
                ) : (
                  <span className="text-2xl font-bold tracking-wide">
                    {slide.sideType === "ebooks" ? "E-Books" : "Shop Now"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                stopAutoPlay();
                setCurrent(idx);
              }}
              className={`w-3 h-3 rounded-full transition-all ${idx === current ? "bg-accent scale-110" : "bg-white/40"
                }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* Feature Row */
function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-6 w-6 text-accent" />
      <span className="font-semibold">{text}</span>
    </div>
  );
}