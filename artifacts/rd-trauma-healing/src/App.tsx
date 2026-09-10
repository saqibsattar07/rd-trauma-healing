import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Flower2,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

const queryClient = new QueryClient();

const navItems = [
  { label: 'Why this work', href: '#about' },
  { label: 'Ways we can work', href: '#modalities' },
  { label: 'Your first step', href: '#process' },
  { label: 'FAQs', href: '#faq' },
];

const modalities = [
  {
    number: '01',
    title: 'Trauma-informed talking therapy',
    description: 'A steady, collaborative space to understand what happened, make sense of the present, and find choices that feel like yours again.',
    tags: ['One-to-one', 'Online & in-person', '50 minutes'],
    tone: 'sage',
  },
  {
    number: '02',
    title: 'EMDR therapy',
    description: 'When memories feel stuck in your body, EMDR can gently help your nervous system process them without needing to tell every detail all at once.',
    tags: ['Evidence-led', 'At your pace', 'Preparation first'],
    tone: 'lavender',
  },
  {
    number: '03',
    title: 'Somatic support',
    description: 'Notice what your body is communicating, build a sense of safety from the inside, and practise tools that travel with you beyond our sessions.',
    tags: ['Body-aware', 'Practical tools', 'Gentle approach'],
    tone: 'gold',
  },
];

const faqs = [
  {
    question: 'What if I do not know where to begin?',
    answer: 'That is a completely valid place to begin. You do not need a perfect explanation or a diagnosis. In our first conversation, we can simply notice what is feeling hard and what you would like to be different.',
  },
  {
    question: 'I have tried therapy before and it did not help. Is this different?',
    answer: 'It makes sense to feel cautious after an experience that missed the mark. We will talk about what felt unhelpful before, what you need in order to feel safe, and whether my way of working feels like a good fit before you commit to anything.',
  },
  {
    question: 'Do I have to talk about everything that happened?',
    answer: 'No. You stay in charge of what you share, when you share it, and how we work with it. Safety and stabilisation come first. There is no pressure to go further than your nervous system is ready for.',
  },
  {
    question: 'Do you work online or in person?',
    answer: 'I offer secure online sessions and in-person appointments in a quiet, private room in Bristol. We can talk through which setting might support you best during our initial call.',
  },
  {
    question: 'How many sessions will I need?',
    answer: 'There is no meaningful one-size-fits-all answer. Some people come for focused support around a specific experience; others want longer-term space. We review how things are feeling together as we go.',
  },
];

function scrollToSection(href: string, closeMenu?: () => void) {
  closeMenu?.();
  const element = document.querySelector(href);
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="fixed left-0 right-0 top-0 z-40">
      <div className="mx-auto mt-3 max-w-[1320px] px-4 md:mt-5 md:px-8">
        <div className="flex items-center justify-between rounded-full border border-[hsl(37_24%_83%/.82)] bg-[hsl(42_42%_97%/.88)] px-4 py-3 shadow-[0_10px_40px_rgba(43,72,70,.07)] backdrop-blur-xl md:px-6">
          <button type="button" onClick={() => scrollToSection('#top')} data-testid="button-brand" className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(173_34%_32%)] text-[hsl(42_38%_94%)]">
              <Leaf size={17} strokeWidth={1.6} />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-[17px] tracking-[-.03em] text-[hsl(188_28%_19%)]">RD Trauma Healing</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.2em] text-[hsl(188_13%_39%)]">with Rebecca Dakin</span>
            </span>
          </button>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <button type="button" key={item.href} onClick={() => scrollToSection(item.href)} data-testid={`link-nav-${item.href.slice(1)}`} className="text-[12px] font-medium text-[hsl(188_13%_39%)] transition-colors hover:text-[hsl(173_34%_32%)]">
                {item.label}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => scrollToSection('#contact')} data-testid="button-header-contact" className="hidden items-center gap-2 rounded-full bg-[hsl(173_34%_32%)] px-5 py-3 text-[11px] font-bold uppercase tracking-[.12em] text-[hsl(42_38%_94%)] transition-transform hover:-translate-y-0.5 sm:flex">
            Book a gentle chat <ArrowRight size={14} />
          </button>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} data-testid="button-mobile-menu" className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(37_24%_83%)] text-[hsl(173_34%_32%)] sm:hidden">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mt-2 rounded-[1.4rem] border border-[hsl(37_24%_83%)] bg-[hsl(42_42%_97%)] p-3 shadow-xl sm:hidden" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <button type="button" key={item.href} onClick={() => scrollToSection(item.href, () => setMenuOpen(false))} data-testid={`link-mobile-nav-${item.href.slice(1)}`} className="block w-full rounded-xl px-4 py-3 text-left text-sm text-[hsl(188_28%_19%)] hover:bg-[hsl(38_24%_88%)]">
                {item.label}
              </button>
            ))}
            <button type="button" onClick={() => scrollToSection('#contact', () => setMenuOpen(false))} data-testid="button-mobile-contact" className="mt-2 flex w-full items-center justify-between rounded-xl bg-[hsl(173_34%_32%)] px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-[hsl(42_38%_94%)]">
              Book a gentle chat <ArrowRight size={15} />
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative min-h-[760px] overflow-hidden bg-[hsl(42_38%_94%)] px-5 pb-20 pt-36 md:min-h-[820px] md:px-10 md:pt-48">
      <div className="absolute -right-24 top-24 h-[480px] w-[480px] rounded-full bg-[hsl(270_27%_77%/.28)] blur-3xl" />
      <div className="absolute -left-24 bottom-[-180px] h-[480px] w-[480px] rounded-full bg-[hsl(102_21%_78%/.36)] blur-3xl" />
      <svg className="absolute right-[8%] top-[24%] h-44 w-32 rotate-[18deg] text-[hsl(173_34%_32%/.25)] md:h-64 md:w-48" viewBox="0 0 180 250" aria-hidden="true">
        <path className="botanical-stroke" strokeWidth="1.3" d="M89 247C80 186 91 117 103 42M92 169C62 146 38 122 25 92M98 112c28-23 47-47 55-76M84 210c-27-13-48-30-64-54M103 79c21-7 39-20 51-37" />
        <path className="botanical-stroke" strokeWidth="1.1" d="M26 92c13 1 24 7 34 17-14 3-25-2-34-17ZM153 36c-3 16-12 27-28 34 1-14 10-26 28-34ZM20 155c14-1 26 4 37 14-14 4-26 0-37-14ZM103 79c3 14 12 24 26 30-1-13-9-23-26-30Z" />
      </svg>
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <div className="max-w-[700px]">
          <div className="reveal eyebrow">A quiet place to start</div>
          <h1 className="reveal delay-1 display mt-6 max-w-[680px] text-[clamp(3.45rem,7vw,6.8rem)] leading-[.96] text-[hsl(188_28%_19%)]">
            You do not have to carry it <em className="text-[hsl(173_34%_32%)]">alone.</em>
          </h1>
          <p className="reveal delay-2 mt-7 max-w-[540px] text-[17px] leading-[1.75] text-[hsl(188_13%_39%)] md:text-[19px]">
            Trauma-informed therapy for when life feels too loud, your body feels on alert, or you are tired of being told to simply move on.
          </p>
          <div className="reveal delay-3 mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <button type="button" onClick={() => scrollToSection('#contact')} data-testid="button-hero-book" className="group flex items-center gap-3 rounded-full bg-[hsl(173_34%_32%)] px-6 py-4 text-[12px] font-bold uppercase tracking-[.11em] text-[hsl(42_38%_94%)] transition-all hover:-translate-y-1 hover:bg-[hsl(188_28%_19%)]">
              Start with a conversation <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(42_38%_94%/.15)] transition-transform group-hover:translate-x-1"><ArrowUpRight size={15} /></span>
            </button>
            <button type="button" onClick={() => scrollToSection('#about')} data-testid="button-hero-learn" className="line-link text-[12px] font-bold uppercase tracking-[.11em] text-[hsl(173_34%_32%)]">
              See how I work
            </button>
          </div>
          <div className="mt-12 flex items-center gap-3 text-[11px] text-[hsl(188_13%_39%)]">
            <LockKeyhole size={14} className="text-[hsl(173_34%_32%)]" />
            <span>A private, non-judgemental space. No pressure. No performance.</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[470px] lg:mr-6">
          <div className="absolute -left-8 top-10 z-10 hidden w-36 rounded-[1.2rem] border border-[hsl(42_38%_94%/.6)] bg-[hsl(42_38%_94%/.88)] p-4 shadow-xl backdrop-blur-md sm:block">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(270_27%_77%/.55)] text-[hsl(173_34%_32%)]"><HeartHandshake size={16} /></div>
            <p className="font-serif text-[15px] leading-tight text-[hsl(188_28%_19%)]">You are in charge of your story.</p>
          </div>
          <div className="relative aspect-[.82] overflow-hidden rounded-[13rem_13rem_1.8rem_1.8rem] bg-[hsl(102_21%_78%)] shadow-[0_30px_80px_rgba(43,72,70,.18)]">
            <img src="/rebecca-studio.jpg" alt="Rebecca in a calm, light-filled therapy space" className="h-full w-full object-cover object-center mix-blend-multiply opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(173_34%_32%/.22)] via-transparent to-[hsl(270_27%_77%/.16)]" />
          </div>
          <div className="absolute -bottom-7 -right-5 flex h-32 w-32 rotate-[-9deg] flex-col items-center justify-center rounded-full bg-[hsl(270_27%_77%)] text-center text-[hsl(188_28%_19%)] shadow-lg sm:-right-12">
            <Sparkles size={17} strokeWidth={1.5} />
            <span className="mt-2 font-serif text-[17px] leading-none">A softer<br />way forward</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(188_13%_39%)] md:flex">
        <span className="h-8 w-px bg-[hsl(173_34%_32%/.35)]" /> Scroll gently
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <div className="border-y border-[hsl(37_24%_83%)] bg-[hsl(38_24%_88%/.55)] px-5 py-7 md:px-10">
      <div className="mx-auto grid max-w-[1120px] gap-5 text-center sm:grid-cols-3 sm:text-left">
        {[
          ['01', 'You set the pace', 'We begin with what feels manageable today.'],
          ['02', 'Your experience matters', 'You will not be reduced to a label or a story.'],
          ['03', 'Small steps count', 'Therapy can be gentle and still create change.'],
        ].map(([number, title, copy]) => (
          <div key={number} className="flex items-start justify-center gap-4 sm:justify-start">
            <span className="font-serif text-lg italic text-[hsl(173_34%_32%)]">{number}</span>
            <div><p className="font-serif text-lg text-[hsl(188_28%_19%)]">{title}</p><p className="mt-1 text-xs text-[hsl(188_13%_39%)]">{copy}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function About() {
  return (
    <section id="about" className="relative scroll-mt-28 bg-[hsl(42_42%_97%)] px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto grid max-w-[1160px] gap-16 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:gap-24">
        <div className="relative">
          <div className="absolute -left-5 -top-8 h-24 w-24 rounded-full border border-[hsl(270_27%_77%)]" />
          <div className="relative overflow-hidden rounded-[2rem] bg-[hsl(102_21%_78%/.55)] p-7 pb-0 md:p-10 md:pb-0">
            <svg className="absolute right-3 top-3 h-44 w-36 rotate-[-18deg] text-[hsl(173_34%_32%/.28)]" viewBox="0 0 160 220" aria-hidden="true">
              <path className="botanical-stroke" strokeWidth="1.2" d="M76 217C71 156 84 96 124 20M77 177c-22-14-40-32-50-56M94 116c23-13 38-32 49-56" />
              <path className="botanical-stroke" strokeWidth="1" d="M28 121c14 0 25 5 35 15-14 3-25-2-35-15ZM143 60c-2 14-11 24-25 31 2-13 10-23 25-31Z" />
            </svg>
            <div className="relative aspect-[.87] overflow-hidden rounded-t-[10rem] bg-[hsl(173_34%_32%)]">
              <img src="/rebecca-studio.jpg" alt="Rebecca Dakin, founder of RD Trauma Healing" className="h-full w-full object-cover object-center opacity-90" />
            </div>
            <div className="relative -mt-7 ml-auto w-fit rounded-2xl bg-[hsl(42_42%_97%)] px-5 py-4 shadow-lg">
              <p className="font-serif text-lg text-[hsl(188_28%_19%)]">Rebecca Dakin</p>
              <p className="mt-1 text-[10px] uppercase tracking-[.15em] text-[hsl(188_13%_39%)]">Therapist & EMDR practitioner</p>
            </div>
          </div>
        </div>
        <div>
          <div className="eyebrow">A little about this space</div>
          <h2 className="display mt-5 max-w-[620px] text-5xl leading-[1.04] text-[hsl(188_28%_19%)] md:text-[4.5rem]">Nothing about you is <em className="text-[hsl(173_34%_32%)]">too much.</em></h2>
          <div className="mt-8 max-w-[570px] space-y-5 text-[16px] leading-[1.8] text-[hsl(188_13%_39%)]">
            <p>I am Rebecca, and I work with people who have been functioning on the outside while feeling far away from themselves on the inside.</p>
            <p>Maybe you have tried to make sense of it before. Maybe a previous therapist moved too quickly, or made you feel like a problem to solve. Here, curiosity comes before certainty. We make room for the parts of you that are tired, guarded, angry, numb, or unsure.</p>
            <p>My role is not to tell you who to be. It is to help you feel more at home in your own life.</p>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 border-t border-[hsl(37_24%_83%)] pt-6 text-[11px] font-bold uppercase tracking-[.12em] text-[hsl(173_34%_32%)]">
            <span className="flex items-center gap-2"><Check size={14} /> Trauma-informed</span>
            <span className="flex items-center gap-2"><Check size={14} /> LGBTQ+ affirming</span>
            <span className="flex items-center gap-2"><Check size={14} /> Neurodiversity-aware</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Modalities() {
  return (
    <section id="modalities" className="scroll-mt-28 bg-[hsl(188_28%_19%)] px-5 py-24 text-[hsl(42_38%_94%)] md:px-10 md:py-36">
      <div className="mx-auto max-w-[1160px]">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <div className="eyebrow !text-[hsl(102_21%_78%)]">Ways we can work</div>
            <h2 className="display mt-5 max-w-[500px] text-5xl leading-[1.03] md:text-[4.5rem]">Support that meets you where you are.</h2>
          </div>
          <p className="max-w-[425px] pb-2 text-[15px] leading-[1.8] text-[hsl(42_38%_94%/.67)] lg:justify-self-end">There is no gold star for choosing the hardest route. We will choose the approach that helps you feel safe enough to be honest, and supported enough to change.</p>
        </div>
        <div className="mt-14 divide-y divide-[hsl(42_38%_94%/.15)] border-y border-[hsl(42_38%_94%/.15)]">
          {modalities.map((item) => (
            <article key={item.number} className="group grid gap-7 py-9 md:grid-cols-[70px_1fr_1.15fr] md:items-start md:gap-10">
              <span className="font-serif text-xl italic text-[hsl(102_21%_78%)]">{item.number}</span>
              <h3 className="display max-w-[290px] text-3xl leading-tight transition-colors group-hover:text-[hsl(102_21%_78%)]">{item.title}</h3>
              <div>
                <p className="max-w-[440px] text-[15px] leading-[1.75] text-[hsl(42_38%_94%/.67)]">{item.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-full border border-[hsl(42_38%_94%/.2)] px-3 py-1.5 text-[10px] uppercase tracking-[.12em] text-[hsl(42_38%_94%/.75)]">{tag}</span>)}</div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 flex items-center gap-4 text-sm text-[hsl(42_38%_94%/.65)]"><ShieldCheck size={20} className="text-[hsl(102_21%_78%)]" /> We will always talk about what feels safe and appropriate before beginning any therapy.</div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-[hsl(270_27%_77%/.3)] px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1160px]">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><div className="eyebrow">Words from the room</div><h2 className="display mt-5 text-5xl text-[hsl(188_28%_19%)] md:text-[4.2rem]">You are allowed<br /><em className="text-[hsl(173_34%_32%)]">to feel better.</em></h2></div>
          <p className="max-w-[260px] text-sm leading-[1.7] text-[hsl(188_13%_39%)]">Shared with permission. Names and details have been changed to protect privacy.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-[1.2fr_.8fr_.95fr]">
          <figure className="flex min-h-[330px] flex-col justify-between rounded-[2rem] bg-[hsl(42_42%_97%)] p-7 shadow-sm md:p-9">
            <div className="text-5xl font-serif leading-none text-[hsl(173_34%_32%)]">“</div>
            <blockquote className="font-serif text-[25px] leading-[1.28] text-[hsl(188_28%_19%)]">For the first time, I did not feel like I had to convince someone that what happened mattered.</blockquote>
            <figcaption className="mt-7 text-[11px] font-bold uppercase tracking-[.15em] text-[hsl(188_13%_39%)]">— Client, 34</figcaption>
          </figure>
          <figure className="flex min-h-[330px] flex-col justify-between rounded-[2rem] bg-[hsl(173_34%_32%)] p-7 text-[hsl(42_38%_94%)] shadow-sm md:p-8">
            <HeartHandshake size={25} strokeWidth={1.3} className="text-[hsl(102_21%_78%)]" />
            <blockquote className="font-serif text-[22px] leading-[1.35]">“The work was hard, but it never felt like I was doing it by myself.”</blockquote>
            <figcaption className="text-[11px] font-bold uppercase tracking-[.15em] text-[hsl(42_38%_94%/.65)]">— Client, 41</figcaption>
          </figure>
          <figure className="flex min-h-[330px] flex-col justify-between rounded-[2rem] bg-[hsl(102_21%_78%)] p-7 text-[hsl(188_28%_19%)] shadow-sm md:p-8">
            <Flower2 size={25} strokeWidth={1.3} className="text-[hsl(173_34%_32%)]" />
            <blockquote className="font-serif text-[22px] leading-[1.35]">“I learned that feeling safe can be something I practise, not something I wait for.”</blockquote>
            <figcaption className="text-[11px] font-bold uppercase tracking-[.15em] text-[hsl(188_28%_19%/.6)]">— Client, 29</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="process" className="scroll-mt-28 bg-[hsl(42_42%_97%)] px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1160px]">
        <div className="grid gap-7 md:grid-cols-[.8fr_1.2fr]">
          <div><div className="eyebrow">Your first step</div><h2 className="display mt-5 max-w-[450px] text-5xl leading-[1.03] text-[hsl(188_28%_19%)] md:text-[4.4rem]">No leap of faith required.</h2></div>
          <p className="max-w-[480px] text-[16px] leading-[1.8] text-[hsl(188_13%_39%)] md:pt-11">Starting therapy can feel like a lot. This is a small, clear beginning — with space to ask questions and decide in your own time.</p>
        </div>
        <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-0">
          <div className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-[hsl(37_24%_83%)] md:block" />
          {[
            ['01', 'Send a note', 'Tell me a little about what is bringing you here. You can keep it brief.'],
            ['02', 'Have a chat', 'We will have a relaxed 20-minute call to see how it feels to talk together.'],
            ['03', 'Choose your pace', 'If it feels right, we will agree a first session and a way of working that fits.'],
          ].map(([number, title, copy]) => (
            <div key={number} className="relative flex gap-5 md:block md:pr-10">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[hsl(173_34%_32%)] bg-[hsl(42_42%_97%)] font-serif text-lg italic text-[hsl(173_34%_32%)]">{number}</span>
              <div className="pt-1 md:pt-7"><h3 className="font-serif text-2xl text-[hsl(188_28%_19%)]">{title}</h3><p className="mt-3 max-w-[250px] text-sm leading-[1.75] text-[hsl(188_13%_39%)]">{copy}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-14 rounded-[1.5rem] border border-[hsl(37_24%_83%)] bg-[hsl(38_24%_88%/.5)] p-5 md:flex md:items-center md:justify-between md:p-7">
          <div className="flex items-start gap-4"><Clock3 className="mt-1 shrink-0 text-[hsl(173_34%_32%)]" size={20} /><p className="max-w-[650px] text-sm leading-[1.7] text-[hsl(188_13%_39%)]"><strong className="font-medium text-[hsl(188_28%_19%)]">Not ready to book?</strong> You can send a question first. There is no obligation and no awkward follow-up if it is not the right time.</p></div>
          <button type="button" onClick={() => scrollToSection('#contact')} data-testid="button-process-contact" className="line-link mt-4 ml-9 text-left text-xs font-bold uppercase tracking-[.12em] text-[hsl(173_34%_32%)] md:mt-0 md:ml-8">Ask a question <ArrowRight className="ml-2 inline" size={14} /></button>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };
  return (
    <section id="contact" className="scroll-mt-28 bg-[hsl(173_34%_32%)] px-5 py-24 text-[hsl(42_38%_94%)] md:px-10 md:py-32">
      <div className="mx-auto grid max-w-[1160px] gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
        <div>
          <div className="eyebrow !text-[hsl(102_21%_78%)]">A private first conversation</div>
          <h2 className="display mt-5 max-w-[560px] text-5xl leading-[1.02] md:text-[4.7rem]">Whenever you are ready.</h2>
          <p className="mt-7 max-w-[420px] text-[16px] leading-[1.8] text-[hsl(42_38%_94%/.7)]">Tell me a little about what is happening, or simply say hello. I will reply within 2 working days.</p>
          <div className="mt-10 space-y-5 border-t border-[hsl(42_38%_94%/.18)] pt-7 text-sm">
            <a href="mailto:hello@example.com" data-testid="link-contact-email" className="flex items-center gap-4 text-[hsl(42_38%_94%/.85)] hover:text-[hsl(102_21%_78%)]"><Mail size={18} /> hello@example.com <span className="text-[10px] uppercase tracking-[.1em] text-[hsl(42_38%_94%/.5)]">(placeholder)</span></a>
            <a href="tel:+440700000000" data-testid="link-contact-phone" className="flex items-center gap-4 text-[hsl(42_38%_94%/.85)] hover:text-[hsl(102_21%_78%)]"><Phone size={18} /> +44 (0)700 000 0000 <span className="text-[10px] uppercase tracking-[.1em] text-[hsl(42_38%_94%/.5)]">(placeholder)</span></a>
            <div className="flex items-center gap-4 text-[hsl(42_38%_94%/.85)]"><MapPin size={18} /> Bristol, UK · online worldwide</div>
          </div>
        </div>
        <div className="rounded-[2rem] bg-[hsl(42_42%_97%)] p-6 text-[hsl(188_28%_19%)] shadow-[0_24px_70px_rgba(15,54,50,.18)] md:p-9">
          {sent ? (
            <div className="flex min-h-[370px] flex-col items-center justify-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(102_21%_78%)] text-[hsl(173_34%_32%)]"><Check size={28} /></span>
              <h3 className="display mt-6 text-3xl">Thank you for reaching out.</h3>
              <p className="mt-3 max-w-[330px] text-sm leading-[1.7] text-[hsl(188_13%_39%)]">Your message is ready to be replied to. Rebecca will be in touch within 2 working days.</p>
              <button type="button" onClick={() => setSent(false)} data-testid="button-contact-reset" className="line-link mt-7 text-xs font-bold uppercase tracking-[.12em] text-[hsl(173_34%_32%)]">Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="mb-7"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(173_34%_32%)]">The contact form is a safe start</p><h3 className="display mt-2 text-3xl">What would you like me to know?</h3></div>
              <label className="block"><span className="mb-2 block text-xs font-medium text-[hsl(188_13%_39%)]">Your name</span><input required value={name} onChange={(event) => setName(event.target.value)} data-testid="input-contact-name" className="w-full rounded-xl border border-[hsl(37_24%_83%)] bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-[hsl(173_34%_32%)]" placeholder="First name is plenty" /></label>
              <label className="block"><span className="mb-2 block text-xs font-medium text-[hsl(188_13%_39%)]">Email address</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-contact-email" className="w-full rounded-xl border border-[hsl(37_24%_83%)] bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-[hsl(173_34%_32%)]" placeholder="you@example.com" /></label>
              <label className="block"><span className="mb-2 block text-xs font-medium text-[hsl(188_13%_39%)]">Your message <span className="text-[hsl(188_13%_39%/.7)]">(optional)</span></span><textarea value={message} onChange={(event) => setMessage(event.target.value)} data-testid="textarea-contact-message" rows={4} className="w-full resize-none rounded-xl border border-[hsl(37_24%_83%)] bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-[hsl(173_34%_32%)]" placeholder="A few words, or just “I’d like to talk”" /></label>
              <button type="submit" data-testid="button-contact-submit" className="group flex w-full items-center justify-between rounded-xl bg-[hsl(173_34%_32%)] px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-[hsl(42_38%_94%)] transition-transform hover:-translate-y-0.5">Send with care <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(42_38%_94%/.15)]"><ArrowUpRight size={15} /></span></button>
              <p className="flex items-center gap-2 text-[10px] leading-[1.5] text-[hsl(188_13%_39%)]"><LockKeyhole size={12} /> Your details are treated as private. Contact details shown are placeholders for launch.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-28 bg-[hsl(42_38%_94%)] px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto grid max-w-[1000px] gap-14 md:grid-cols-[.7fr_1.3fr]">
        <div><div className="eyebrow">A few answers</div><h2 className="display mt-5 text-5xl leading-[1.04] text-[hsl(188_28%_19%)] md:text-[4rem]">Questions are welcome here.</h2><p className="mt-6 max-w-[270px] text-sm leading-[1.7] text-[hsl(188_13%_39%)]">Still wondering something? Bring it to our first conversation. You are not expected to know the therapy vocabulary.</p></div>
        <div className="divide-y divide-[hsl(37_24%_83%)] border-y border-[hsl(37_24%_83%)]">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return <div key={faq.question}><button type="button" onClick={() => setOpen(isOpen ? null : index)} aria-expanded={isOpen} data-testid={`button-faq-${index}`} className="flex w-full items-center justify-between gap-6 py-5 text-left"><span className="font-serif text-[19px] leading-tight text-[hsl(188_28%_19%)]">{faq.question}</span><span className={`faq-chevron shrink-0 text-[hsl(173_34%_32%)] ${isOpen ? 'is-open' : ''}`}><ChevronDown size={19} /></span></button><div className={`faq-answer ${isOpen ? 'is-open' : ''}`}><div><p className="pb-6 pr-8 text-sm leading-[1.75] text-[hsl(188_13%_39%)]">{faq.answer}</p></div></div></div>;
          })}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[hsl(188_28%_19%)] px-5 pb-8 pt-16 text-[hsl(42_38%_94%)] md:px-10">
      <div className="mx-auto max-w-[1160px]">
        <div className="grid gap-12 pb-16 md:grid-cols-[1.4fr_.6fr_.8fr]">
          <div><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(102_21%_78%)] text-[hsl(188_28%_19%)]"><Leaf size={17} /></span><span className="font-serif text-xl">RD Trauma Healing</span></div><p className="mt-6 max-w-[320px] text-sm leading-[1.8] text-[hsl(42_38%_94%/.6)]">A calm, collaborative space for making sense of what happened and finding your way back to yourself.</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[hsl(102_21%_78%)]">Explore</p><div className="mt-5 space-y-3 text-sm text-[hsl(42_38%_94%/.7)]">{navItems.slice(0, 3).map((item) => <button type="button" key={item.href} onClick={() => scrollToSection(item.href)} data-testid={`link-footer-${item.href.slice(1)}`} className="block transition-colors hover:text-[hsl(102_21%_78%)]">{item.label}</button>)}</div></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[hsl(102_21%_78%)]">Get in touch</p><div className="mt-5 space-y-3 text-sm text-[hsl(42_38%_94%/.7)]"><a href="mailto:hello@example.com" data-testid="link-footer-email" className="block hover:text-[hsl(102_21%_78%)]">hello@example.com</a><span className="block text-[10px] uppercase tracking-[.1em] text-[hsl(42_38%_94%/.4)]">Email is a placeholder</span><span className="block">Bristol, UK · online worldwide</span></div></div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-[hsl(42_38%_94%/.14)] pt-6 text-[10px] uppercase tracking-[.12em] text-[hsl(42_38%_94%/.4)] sm:flex-row"><span>© 2025 RD Trauma Healing</span><span>Privacy · Terms · This is not an emergency service</span></div>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <div className="site-shell grain min-h-[100dvh]">
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <About />
        <Modalities />
        <Testimonials />
        <Process />
        <Contact />
        <FAQ />
      </main>
      <Footer />
      <a href="https://wa.me/447000000000?text=Hello%20Rebecca%2C%20I%27d%20like%20to%20ask%20about%20therapy." target="_blank" rel="noreferrer" data-testid="link-whatsapp" aria-label="Message on WhatsApp (placeholder number)" className="whatsapp-pulse fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(173_34%_32%)] text-[hsl(42_38%_94%)] shadow-xl transition-transform hover:-translate-y-1"><MessageCircle size={23} strokeWidth={1.7} /></a>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;