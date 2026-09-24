import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Flower2,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'About Rebecca', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'FAQs', href: '/faq' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <div className="mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-[1320px] md:mt-5 md:w-[calc(100%-3rem)]">
        <div className="glass flex items-center justify-between rounded-full border-[#FAF6F0]/60 px-4 py-3 md:px-6">
          <Link href="/" onClick={() => setMenuOpen(false)} data-testid="link-brand" className="focus-ring flex items-center gap-3 rounded-full">
            <span className="flex h-9 w-9 items-center justify-center"><img src="/rd-trauma-healing-logo.png" alt="" aria-hidden="true" className="h-full w-full object-contain" /></span>
            <span className="leading-none">
              <span className="block font-serif text-[17px] tracking-[-.04em] text-[#2C3339]">RD Trauma Healing</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.2em] text-[#2C3339]/60">with Rebecca Dakin</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} className={`focus-ring rounded-full px-1.5 py-2 text-[12px] font-medium transition-colors ${location === item.href ? 'text-[#7D6485]' : 'text-[#2C3339]/65 hover:text-[#7D6485]'}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/contact" data-testid="link-header-contact" className="focus-ring hidden items-center gap-2 rounded-full bg-[#2C3339] px-5 py-3 text-[11px] font-bold uppercase tracking-[.12em] !text-[#FAF6F0] transition-transform hover:-translate-y-0.5 sm:flex">
            <span className="!text-[#FAF6F0]">Book a gentle chat</span> <ArrowRight size={14} />
          </Link>
          <button type="button" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((open) => !open)} data-testid="button-mobile-menu" className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[#2C3339]/15 text-[#7D6485] sm:hidden">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mt-2 rounded-[1.4rem] border border-[#2C3339]/10 bg-[#FAF6F0] p-3 shadow-xl sm:hidden" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} data-testid={`link-mobile-${item.label.toLowerCase().replaceAll(' ', '-')}`} className={`focus-ring block rounded-xl px-4 py-3 text-sm ${location === item.href ? 'bg-[#A8B79A]/35 text-[#7D6485]' : 'text-[#2C3339] hover:bg-[#A8B79A]/20'}`}>
                {item.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setMenuOpen(false)} data-testid="link-mobile-contact" className="mt-2 flex items-center justify-between rounded-xl bg-[#2C3339] px-4 py-3 text-xs font-bold uppercase tracking-[.12em] !text-[#FAF6F0]">Book a gentle chat <ArrowRight size={15} /></Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#2C3339] px-5 pb-8 pt-16 text-[#FAF6F0] md:px-10">
      <div className="mx-auto max-w-[1160px]">
        <div className="grid gap-12 pb-16 md:grid-cols-[1.3fr_.7fr_.85fr]">
          <div>
            <Link href="/" data-testid="link-footer-brand" className="focus-ring inline-flex items-center gap-3 rounded-full"><span className="flex h-9 w-9 items-center justify-center"><img src="/rd-trauma-healing-logo.png" alt="" aria-hidden="true" className="h-full w-full object-contain" /></span><span className="font-serif text-xl">RD Trauma Healing</span></Link>
            <p className="mt-6 max-w-[330px] text-sm leading-[1.8] text-[#FAF6F0]/60">A calm, collaborative space for making sense of what happened and finding your way back to yourself.</p>
          </div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#C9A876]">Explore</p><div className="mt-5 space-y-3 text-sm text-[#FAF6F0]/70">{navItems.slice(1, 5).map((item) => <Link key={item.href} href={item.href} data-testid={`link-footer-${item.href.slice(1)}`} className="focus-ring block rounded-sm hover:text-[#A8B79A]">{item.label}</Link>)}</div></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#C9A876]">Get in touch</p><div className="mt-5 space-y-3 text-sm text-[#FAF6F0]/70"><a href="mailto:hello@example.com" data-testid="link-footer-email" className="focus-ring block rounded-sm hover:text-[#A8B79A]">hello@example.com</a><span className="block text-[10px] uppercase tracking-[.1em] text-[#FAF6F0]/40">Email is a placeholder</span><span className="block">Bristol, UK · online worldwide</span></div></div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-[#FAF6F0]/15 pt-6 text-[10px] uppercase tracking-[.12em] text-[#FAF6F0]/40 sm:flex-row"><span>© 2026 RD Trauma Healing</span><span>Privacy · Terms · This is not an emergency service</span></div>
      </div>
    </footer>
  );
}

export function WhatsAppAction() {
  return <a href="https://wa.me/447000000000?text=Hello%20Rebecca%2C%20I%27d%20like%20to%20ask%20about%20therapy." target="_blank" rel="noreferrer" aria-label="Message RD Trauma Healing on WhatsApp, placeholder number" data-testid="link-whatsapp" className="whatsapp-pulse focus-ring fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#7D6485] text-[#FAF6F0] shadow-xl transition-transform hover:-translate-y-1"><MessageCircle size={23} strokeWidth={1.7} /></a>;
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="grain min-h-[100dvh] overflow-clip"><Header /><main>{children}</main><Footer /><WhatsAppAction /></div>;
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .16 }} transition={{ duration: .65, delay, ease: [.2, .8, .2, 1] }} className={className}>{children}</motion.div>;
}

export function PageIntro({ label, title, description }: { label: string; title: ReactNode; description?: string }) {
  return <section className="bg-[#FAF6F0] px-5 pb-16 pt-36 md:px-10 md:pb-24 md:pt-48"><div className="section-wrap"><div className="eyebrow">{label}</div><h1 className="display mt-5 max-w-[820px] text-5xl leading-[1.02] text-[#2C3339] md:text-[6.2rem]">{title}</h1>{description && <p className="mt-7 max-w-[590px] text-lg leading-[1.75] text-[#2C3339]/65">{description}</p>}</div></section>;
}

export function DecorativeLotus({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 180 160" aria-hidden="true" className={`botanical-stroke ${className}`}><path strokeWidth="1.2" d="M90 143V91M90 91c-17-33-15-54 0-77 15 23 17 44 0 77ZM90 91c-30-18-45-38-47-62 25 7 41 27 47 62ZM90 91c30-18 45-38 47-62-25 7-41 27-47 62ZM90 143c-25-17-44-28-67-31 17 27 39 36 67 31ZM90 143c25-17 44-28 67-31-17 27-39 36-67 31Z" /></svg>;
}

export function QuoteCard({ quote, cite, dark = false }: { quote: string; cite: string; dark?: boolean }) {
  return <figure className={`rounded-[2rem] p-7 md:p-10 ${dark ? 'bg-[#7D6485] text-[#FAF6F0]' : 'glass text-[#2C3339]'}`}><div className={`font-serif text-6xl leading-none ${dark ? 'text-[#A8B79A]' : 'text-[#C9A876]'}`}>“</div><blockquote className="mt-1 font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1.3]">{quote}</blockquote><figcaption className={`mt-7 text-[10px] font-bold uppercase tracking-[.15em] ${dark ? 'text-[#FAF6F0]/60' : 'text-[#2C3339]/55'}`}>— {cite}</figcaption></figure>;
}

export type Service = { title: string; summary: string; detail: string; icon: LucideIcon; accent: string };

export function ServiceCard({ service, index, onDarkSurface = false }: { service: Service; index: number; onDarkSurface?: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = service.icon;
  return <Reveal delay={index * .06}><article data-card-index={index} className={`rounded-[1.7rem] border border-[#2C3339]/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(44,51,57,.1)] ${service.accent} ${onDarkSurface ? 'home-service-card' : ''}`}><div className="flex items-start justify-between gap-5"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF6F0]/70 text-[#7D6485]"><Icon size={22} strokeWidth={1.5} /></span><span className="font-serif text-sm italic text-[#2C3339]/40">0{index + 1}</span></div><h3 className="display mt-7 text-2xl leading-tight text-[#2C3339]">{service.title}</h3><p className="mt-3 text-sm leading-[1.75] text-[#2C3339]/65">{service.summary}</p><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} data-testid={`button-service-${index}`} className="focus-ring mt-6 flex items-center gap-2 rounded-sm text-[11px] font-bold uppercase tracking-[.12em] text-[#7D6485]">Read more <ChevronDown size={15} className={`faq-chevron ${open ? 'is-open' : ''}`} /></button><div className={`faq-answer ${open ? 'is-open' : ''}`}><div><p className="pt-4 text-sm leading-[1.75] text-[#2C3339]/65">{service.detail}</p></div></div></article></Reveal>;
}

export function BookingWidget() {
  const dates = ['Tue 14', 'Wed 15', 'Thu 16', 'Fri 17'];
  const times = ['10:00', '12:30', '15:00', '17:30'];
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState(times[1]);
  const [booked, setBooked] = useState(false);
  if (booked) return <div className="flex min-h-[430px] flex-col items-center justify-center rounded-[2rem] bg-[#FAF6F0] p-8 text-center shadow-[0_22px_65px_rgba(44,51,57,.1)]"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#A8B79A] text-[#2C3339]"><Check size={28} /></span><h3 className="display mt-6 text-3xl">Your request is ready.</h3><p className="mt-3 max-w-[310px] text-sm leading-[1.7] text-[#2C3339]/65">This booking widget is a placeholder for launch. Rebecca will confirm {date} at {time} by email.</p><button type="button" onClick={() => setBooked(false)} data-testid="button-booking-reset" className="line-link mt-7 text-xs font-bold uppercase tracking-[.12em] text-[#7D6485]">Choose another time</button></div>;
  return <div className="rounded-[2rem] bg-[#FAF6F0] p-6 shadow-[0_22px_65px_rgba(44,51,57,.1)] md:p-8"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7D6485]">Placeholder booking widget</p><h3 className="display mt-2 text-3xl text-[#2C3339]">Choose a gentle beginning</h3></div><CalendarDays size={25} className="text-[#C9A876]" /></div><p className="mt-3 text-sm text-[#2C3339]/60">Select a preferred day and time. Nothing is confirmed until we speak.</p><div className="mt-7"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#2C3339]/55">Sample availability</p><div className="mt-3 grid grid-cols-4 gap-2">{dates.map((item) => <button type="button" key={item} onClick={() => setDate(item)} data-testid={`button-date-${item.replace(' ', '-')}`} className={`focus-ring rounded-xl border p-3 text-center text-xs transition-colors ${date === item ? 'border-[#7D6485] bg-[#7D6485] text-[#FAF6F0]' : 'border-[#2C3339]/10 hover:border-[#7D6485]'}`}><span className="block text-[10px] uppercase opacity-65">{item.split(' ')[0]}</span><span className="mt-1 block font-serif text-lg">{item.split(' ')[1]}</span></button>)}</div></div><div className="mt-7"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#2C3339]/55">Available times</p><div className="mt-3 grid grid-cols-2 gap-2">{times.map((item) => <button type="button" key={item} onClick={() => setTime(item)} data-testid={`button-time-${item.replace(':', '-')}`} className={`focus-ring rounded-xl border px-3 py-3 text-sm transition-colors ${time === item ? 'border-[#A8B79A] bg-[#A8B79A]/35 text-[#2C3339]' : 'border-[#2C3339]/10 hover:border-[#A8B79A]'}`}>{item}</button>)}</div></div><button type="button" onClick={() => setBooked(true)} data-testid="button-booking-request" className="mt-7 flex w-full items-center justify-between rounded-xl bg-[#2C3339] px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-[#FAF6F0] transition-transform hover:-translate-y-0.5">Request {date} at {time} <ArrowUpRight size={16} /></button><p className="mt-4 flex items-center gap-2 text-[10px] text-[#2C3339]/50"><LockKeyhole size={12} /> Placeholder only · no payment or commitment.</p></div>;
}

export const iconSet = { HeartHandshake, Flower2, Sparkles, ShieldCheck, Leaf, Clock3 };