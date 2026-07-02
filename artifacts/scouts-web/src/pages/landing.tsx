import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Heart, Users, Target, Shield,
  ArrowRight, ChevronDown, Menu, X,
  MapPin, Phone, Mail, Clock,
  Star, Camera, Mountain, TreePine,
  Tent, Cross, HandHeart, Quote,
  Sparkles, ChevronUp, Eye,
  Trophy, Compass, Flame,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import logoImg from "@/assets/scoutPic/avatars-logo.jpg";
import campImg from "@/assets/scoutPic/camp.jpg";
import gallery1Img from "@/assets/scoutPic/gallery1.jpg";
import gallery2Img from "@/assets/scoutPic/gallery2.jpg";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Values", href: "#values" },
  { label: "Activities", href: "#activities" },
  { label: "Contact", href: "#contact" },
];

const values = [
  {
    title: "Faith",
    icon: Cross,
    description:
      "Rooted in Christian values, guiding every step of our journey with trust in God and respect for all creation.",
    color: "from-amber-500/20 to-orange-500/10",
    borderColor: "border-amber-500/30",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
  {
    title: "Brotherhood",
    icon: Heart,
    description:
      "United as one family, building lifelong bonds of friendship, mutual respect, and unwavering support for one another.",
    color: "from-rose-500/20 to-pink-500/10",
    borderColor: "border-rose-500/30",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600",
  },
  {
    title: "Service",
    icon: HandHeart,
    description:
      "Always ready to serve our community and country, putting others before ourselves through meaningful action.",
    color: "from-emerald-500/20 to-green-500/10",
    borderColor: "border-emerald-500/30",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    title: "Discipline",
    icon: Flame,
    description:
      "Forged through commitment and perseverance, building character through structure, dedication, and self-mastery.",
    color: "from-blue-500/20 to-indigo-500/10",
    borderColor: "border-blue-500/30",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
  },
];

const activities = [
  {
    image: campImg,
    label: "Camps",
    sublabel: "Wilderness & Survival",
    span: "md:col-span-2 md:row-span-2",
  },
  {
    image: gallery1Img,
    label: "Leadership",
    sublabel: "Character Building",
    span: "",
  },
  {
    image: gallery2Img,
    label: "Community Service",
    sublabel: "Giving Back",
    span: "",
  },
  {
    image: campImg,
    label: "Adventures",
    sublabel: "Exploration & Discovery",
    span: "md:col-span-2",
  },
];

function AnimatedCounter({
  target,
  suffix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

function FadeInSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-3xl"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -30, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-amber-600/8 to-orange-600/4 blur-3xl"
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 40, -30, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-gradient-to-br from-amber-400/8 to-yellow-400/4 blur-3xl"
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 40, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-lg shadow-black/5"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-amber-500/30 group-hover:ring-amber-500/60 transition-all duration-300">
              <img
                src={logoImg}
                alt="Saint George Scouts"
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className={cn(
                "text-lg font-semibold tracking-tight transition-colors duration-300",
                scrolled ? "text-amber-900 dark:text-amber-100" : "text-white"
              )}
            >
              St. George Scouts
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-amber-500 after:transition-all after:duration-300 hover:after:w-full",
                  scrolled
                    ? "text-amber-900/80 dark:text-amber-100/80 hover:text-amber-900 dark:hover:text-amber-100"
                    : "text-white/80 hover:text-white"
                )}
              >
                {link.label}
              </a>
            ))}
            <ThemeToggle
              className={cn(
                scrolled
                  ? "text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            />
            <Link href="/login">
              <Button
                variant={scrolled ? "default" : "outline"}
                className={cn(
                  "rounded-full px-6 font-medium transition-all duration-300",
                  !scrolled &&
                    "border-white/40 text-white hover:bg-white hover:text-amber-900"
                )}
              >
                Member Login
              </Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "md:hidden p-2 rounded-lg transition-colors",
              scrolled ? "text-amber-900 dark:text-amber-100" : "text-white"
            )}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-amber-100 dark:border-amber-800 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-amber-900/80 dark:text-amber-100/80 hover:text-amber-900 dark:hover:text-amber-100 font-medium text-sm py-2"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center gap-3">
                <ThemeToggle className="text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800" />
                <Link href="/login" className="flex-1">
                  <Button className="w-full rounded-full" onClick={() => setMobileOpen(false)}>
                    Member Login
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={campImg}
          alt="Scouts in nature"
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 to-transparent" />
      </div>

      <FloatingOrbs />

      {/* Decorative elements */}
      <motion.div
        className="absolute top-24 left-8 w-20 h-20 border border-amber-500/20 rounded-full"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-32 right-12 w-32 h-32 border border-amber-400/10 rounded-full"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-4 h-4 bg-amber-400/30 rounded-full"
        animate={{
          y: [-10, 10, -10],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Logo badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/20">
            <img
              src={logoImg}
              alt="Saint George Scouts"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-amber-300/90 font-medium text-sm tracking-widest uppercase">
            Saint George Heliopolis
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-white leading-tight mb-6"
        >
          Saint George
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-300">
            Heliopolis Scouts
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl md:text-2xl text-amber-100/90 font-light mb-4 tracking-wide"
        >
          Building Leaders Through Faith, Service, and Adventure
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          For decades, our scout group has been shaping young hearts and minds —
          instilling values of faith, leadership, and community service through
          unforgettable outdoor experiences and meaningful fellowship.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a href="#activities">
            <Button
              size="lg"
              className="rounded-full px-8 py-7 text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Explore Activities
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <Link href="/login">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 py-7 text-base font-semibold border-white/30 text-white hover:bg-white hover:text-amber-900 transition-all duration-300 hover:-translate-y-0.5"
            >
              Join Us
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-colors"
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.a>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 dark:from-amber-950/30 via-white dark:via-gray-950 to-white dark:to-gray-950 pointer-events-none" />
      <FloatingOrbs />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <FadeInSection>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/10">
                <img
                  src={gallery1Img}
                  alt="Scout activities"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="absolute -bottom-4 -right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-amber-900/10 p-5 border border-amber-100 dark:border-amber-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-900">40+</p>
                    <p className="text-xs text-amber-700/70">Years of Excellence</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </FadeInSection>

          {/* Text */}
          <FadeInSection delay={0.2}>
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-semibold tracking-wider uppercase mb-6">
                About Us
              </span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-6 leading-tight">
                Shaping Leaders
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                  Since Our Founding
                </span>
              </h2>
              <div className="space-y-4 text-amber-800/70 dark:text-amber-200/70 leading-relaxed">
                <p className="text-lg">
                  Saint George Heliopolis Scouts is more than an organization — we are
                  a family built on faith, tradition, and a shared commitment to
                  building a better world.
                </p>
                <p>
                  For over four decades, we have guided young people through a journey
                  of self-discovery, leadership development, and community engagement.
                  Our program combines the timeless values of scouting with modern
                  approaches to youth development, creating an environment where every
                  member can thrive.
                </p>
                <p>
                  From wilderness expeditions to community service projects, from
                  leadership workshops to cultural exchanges, we provide opportunities
                  that challenge, inspire, and transform.
                </p>
              </div>

              <div className="flex flex-wrap gap-6 mt-8">
                {[
                  { label: "Active Members", value: "500+" },
                  { label: "Annual Events", value: "30+" },
                  { label: "Community Projects", value: "100+" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stat.value}</p>
                    <p className="text-xs text-amber-700/60 dark:text-amber-300/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}

function ValuesSection() {
  return (
    <section id="values" className="relative py-24 md:py-32 bg-amber-900 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>
      <FloatingOrbs />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <FadeInSection className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-800/50 text-amber-300 text-xs font-semibold tracking-wider uppercase mb-6">
            Our Foundation
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
            Core Values
          </h2>
          <p className="text-amber-200/70 max-w-2xl mx-auto text-lg">
            These four pillars form the foundation of everything we do, guiding our
            members toward becoming responsible leaders and compassionate human beings.
          </p>
        </FadeInSection>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <FadeInSection key={value.title} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "group relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 h-full cursor-default overflow-hidden",
                    "hover:bg-white/10 hover:border-white/20 transition-all duration-500"
                  )}
                >
                  {/* Hover glow */}
                  <div
                    className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br pointer-events-none",
                      value.color
                    )}
                  />

                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg",
                        value.iconBg,
                        value.iconColor
                      )}
                    >
                      <Icon className="w-7 h-7" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-200 transition-colors">
                      {value.title}
                    </h3>

                    {/* Description */}
                    <p className="text-amber-200/60 text-sm leading-relaxed group-hover:text-amber-200/80 transition-colors">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              </FadeInSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ActivitiesSection() {
  return (
    <section id="activities" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white dark:from-gray-950 via-amber-50/30 dark:via-amber-950/20 to-white dark:to-gray-950 pointer-events-none" />
      <FloatingOrbs />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-semibold tracking-wider uppercase mb-6">
            Our Programs
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-4">
            Activities & Adventures
          </h2>
          <p className="text-amber-800/60 dark:text-amber-200/60 max-w-2xl mx-auto text-lg">
            From wilderness expeditions to community service, every activity is
            designed to build character, develop skills, and create lasting memories.
          </p>
        </FadeInSection>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-4 gap-4 auto-rows-[200px]">
          {activities.map((item, index) => (
            <FadeInSection key={index} delay={index * 0.1}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "relative rounded-2xl overflow-hidden group cursor-pointer h-full",
                  item.span
                )}
              >
                <img
                  src={item.image}
                  alt={item.label}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-500/90 text-white text-xs font-semibold mb-2">
                    {item.label}
                  </span>
                  <p className="text-white/70 text-sm">{item.sublabel}</p>
                </div>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { icon: Users, target: 500, suffix: "+", label: "Members" },
    { icon: Tent, target: 120, suffix: "+", label: "Camps" },
    { icon: Star, target: 300, suffix: "+", label: "Activities" },
    { icon: Clock, target: 43, suffix: "", label: "Years of Service" },
  ];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900" />
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 75% 50%, white 1.5px, transparent 1.5px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <FadeInSection key={stat.label} delay={index * 0.15}>
                <div className="text-center group">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300"
                  >
                    <Icon className="w-7 h-7 text-amber-300" />
                  </motion.div>
                  <p className="text-4xl md:text-5xl font-bold text-white mb-1">
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  </p>
                  <p className="text-amber-200/60 text-sm tracking-wide">{stat.label}</p>
                </div>
              </FadeInSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MissionBanner() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={gallery2Img}
          alt="Scouts in action"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/95 via-amber-900/85 to-amber-900/90" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/20" />
      </div>

      <FloatingOrbs />

      <div className="relative max-w-5xl mx-auto px-4 text-center">
        <FadeInSection>
          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8"
          >
            <Quote className="w-16 h-16 text-amber-400/40 mx-auto" />
          </motion.div>

          <blockquote className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-8">
            &ldquo;Always Ready to Serve{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">
              God, Country,
            </span>{" "}
            and Others&rdquo;
          </blockquote>

          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: 80 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-1 bg-gradient-to-r from-amber-500 to-orange-500 mx-auto rounded-full mb-6"
          />

          <p className="text-amber-200/60 text-lg max-w-2xl mx-auto">
            This motto has been the guiding light of scouting worldwide for over a
            century — a timeless call to duty, honor, and selfless service.
          </p>
        </FadeInSection>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 dark:from-amber-950/30 via-white dark:via-gray-950 to-amber-50 dark:to-amber-950/30" />
      <FloatingOrbs />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <FadeInSection>
          {/* Decorative rings */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-amber-300/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-amber-400/20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                <Compass className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-4xl md:text-6xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-6 leading-tight">
            Join the Next Generation
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
              of Leaders
            </span>
          </h2>

          <p className="text-lg text-amber-800/60 dark:text-amber-200/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every great journey begins with a single step. Take yours today and
            discover the adventure, fellowship, and purpose that awaits you in the
            scouting movement.
          </p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Link href="/login">
              <Button
                size="lg"
                className="rounded-full px-10 py-7 text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300"
              >
                Become a Scout
                <Sparkles className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </FadeInSection>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="relative bg-amber-950 text-amber-200/70">
      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-amber-500/30">
                <img
                  src={logoImg}
                  alt="Saint George Scouts"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-lg font-semibold text-white">
                St. George Scouts
              </span>
            </div>
            <p className="text-sm leading-relaxed text-amber-300/50 mb-6">
              Building leaders through faith, service, and adventure for generations.
              Part of the worldwide scouting movement.
            </p>
            <div className="flex gap-3">
              {[Heart, Users, Star, Compass].map((Icon, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -2 }}
                  className="w-9 h-9 rounded-full bg-amber-800/50 border border-amber-700/30 flex items-center justify-center cursor-pointer hover:bg-amber-700/50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-amber-300/70" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: "About Us", href: "#about" },
                { label: "Our Values", href: "#values" },
                { label: "Activities", href: "#activities" },
                { label: "Member Login", href: "/login" },
                { label: "Contact Us", href: "#contact" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-amber-300 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              {[
                { icon: MapPin, text: "Heliopolis, Cairo, Egypt" },
                { icon: Phone, text: "+20 100 000 0000" },
                { icon: Mail, text: "info@saintgeorgescouts.org" },
                { icon: Clock, text: "Sat–Thu: 9:00 AM – 8:00 PM" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Newsletter / CTA */}
          <div>
            <h4 className="text-white font-semibold mb-4">Stay Connected</h4>
            <p className="text-sm text-amber-300/50 mb-4">
              Follow us on social media for the latest updates, events, and stories
              from our scouting community.
            </p>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full rounded-full border-amber-700/50 text-amber-300 hover:bg-amber-800 hover:text-amber-200 transition-all"
              >
                Join Our Community
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-amber-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-amber-300/40">
            &copy; {new Date().getFullYear()} Saint George Heliopolis Scouts. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-amber-300/40">
            <a href="#" className="hover:text-amber-300 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-amber-300 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30 flex items-center justify-center hover:shadow-amber-500/50 transition-shadow"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <ValuesSection />
      <ActivitiesSection />
      <StatsSection />
      <MissionBanner />
      <CTASection />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
