import { useState, useId } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  HeartHandshake,
  Info,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import {
  AVAILABILITY_CONFIG,
  formatDateDisplay,
  formatTimeDisplay,
  getTimeSlotsForDate,
  isDateAvailable,
} from '@/lib/availability';

export interface SessionPackage {
  id: 'single' | 'block';
  name: string;
  price: string;
  priceDisplay: string;
  description: string;
  badge?: string;
}

const SESSION_PACKAGES: SessionPackage[] = [
  {
    id: 'single',
    name: 'Single Session — £50',
    price: '£50',
    priceDisplay: '£50 per session',
    description: 'Individual 1-to-1 trauma-informed therapy session. Focused, paced support with no ongoing lock-in.',
  },
  {
    id: 'block',
    name: 'Block Booking — 3 Sessions — £100',
    price: '£100',
    priceDisplay: 'BLOCK BOOK 3 X SESSIONS FOR £100',
    description: 'Three dedicated sessions giving you continuity, deeper somatic integration, and saving you £50.',
    badge: 'Special Offer — Save £50',
  },
];

interface AppointmentSystemProps {
  initialPackage?: 'single' | 'block';
  onSuccess?: (details: any) => void;
  className?: string;
}

export function AppointmentSystem({
  initialPackage = 'single',
  onSuccess,
  className = '',
}: AppointmentSystemProps) {
  const formId = useId();

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Package & Patient State
  const [selectedPackage, setSelectedPackage] = useState<SessionPackage>(
    SESSION_PACKAGES.find((p) => p.id === initialPackage) || SESSION_PACKAGES[0]
  );
  const [patientName, setPatientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  // UI / Submission State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  // Calendar bounds: clients cannot browse past months or beyond maxAdvanceDays
  const today = startOfDay(new Date());
  const maxBookingDate = addDays(today, AVAILABILITY_CONFIG.maxAdvanceDays);
  const minBookingDate = addDays(today, AVAILABILITY_CONFIG.minAdvanceDays);

  const canGoPreviousMonth = isAfter(startOfMonth(currentMonth), startOfMonth(today));
  const canGoNextMonth = isBefore(endOfMonth(currentMonth), maxBookingDate);

  const handlePrevMonth = () => {
    if (canGoPreviousMonth) {
      setCurrentMonth((prev) => subMonths(prev, 1));
    }
  };

  const handleNextMonth = () => {
    if (canGoNextMonth) {
      setCurrentMonth((prev) => addMonths(prev, 1));
    }
  };

  // Generate days for grid (Monday start)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Time slots for currently selected date
  const availableSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

  const handleDateSelect = (day: Date) => {
    if (!isDateAvailable(day)) return;
    setSelectedDate(day);
    // Clear time if previous slot is not in the new day's slots
    const newSlots = getTimeSlotsForDate(day);
    if (!newSlots.includes(selectedTime)) {
      setSelectedTime(newSlots[0] || '');
    }
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!selectedDate) {
      setErrorMessage('Please select an appointment date on the calendar.');
      return;
    }
    if (!selectedTime) {
      setErrorMessage('Please select a preferred time slot.');
      return;
    }
    if (!patientName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter a valid contact phone number.');
      return;
    }

    setLoading(true);

    const payload = {
      patientName: patientName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
      appointmentTime: selectedTime,
      sessionType: selectedPackage.name,
      price: selectedPackage.price,
      message: message.trim(),
    };

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit appointment request.');
      }

      setSubmittedData({
        ...payload,
        id: result.appointmentId,
        dateFormatted: formatDateDisplay(selectedDate),
        timeFormatted: formatTimeDisplay(selectedTime),
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(
        err.message || 'We could not submit your request right now. Please try again or message via WhatsApp.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setSelectedDate(null);
    setSelectedTime('');
    setPatientName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setErrorMessage('');
  };

  // SUCCESS STATE
  if (submittedData) {
    return (
      <div className={`rounded-[2.5rem] border border-[#2C3339]/10 bg-[#FAF6F0] p-7 md:p-12 shadow-xl ${className}`}>
        <div className="mx-auto max-w-[620px] text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#A8B79A] text-[#2C3339] shadow-inner">
            <Check size={36} strokeWidth={2.5} />
          </div>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-[.2em] text-[#7D6485]">
            Appointment Request Received
          </p>

          <h3 className="display mt-3 text-3xl md:text-4xl text-[#2C3339]">
            Thank you. Your appointment request has been received.
          </h3>

          <p className="mt-4 text-base leading-[1.75] text-[#2C3339]/75">
            <strong>Rebecca will contact you to confirm your session.</strong>
          </p>

          <div className="mt-6 rounded-2xl border border-[#7D6485]/20 bg-[#7D6485]/10 p-4 text-xs leading-[1.7] text-[#2C3339]/80">
            <Info size={16} className="inline mr-1 text-[#7D6485] -mt-0.5" />
            Please note: This is an appointment request and is not confirmed until Rebecca verifies availability and replies directly by email or phone.
          </div>

          {/* Submitted Request Summary */}
          <div className="mt-8 rounded-2xl border border-[#2C3339]/10 bg-white/70 p-6 text-left shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-[.14em] text-[#7D6485] border-b border-[#2C3339]/10 pb-3">
              Request Details
            </h4>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div>
                <dt className="text-xs text-[#2C3339]/50 uppercase tracking-[.08em]">Patient Name</dt>
                <dd className="font-semibold text-[#2C3339] mt-0.5">{submittedData.patientName}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#2C3339]/50 uppercase tracking-[.08em]">Session Type & Price</dt>
                <dd className="font-semibold text-[#2C3339] mt-0.5">
                  {submittedData.sessionType} ({submittedData.price})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#2C3339]/50 uppercase tracking-[.08em]">Requested Date</dt>
                <dd className="font-semibold text-[#2C3339] mt-0.5">{submittedData.dateFormatted}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#2C3339]/50 uppercase tracking-[.08em]">Requested Time</dt>
                <dd className="font-semibold text-[#2C3339] mt-0.5">{submittedData.timeFormatted}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#2C3339]/50 uppercase tracking-[.08em]">Email</dt>
                <dd className="font-semibold text-[#2C3339] mt-0.5 break-all">{submittedData.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#2C3339]/50 uppercase tracking-[.08em]">Phone</dt>
                <dd className="font-semibold text-[#2C3339] mt-0.5">{submittedData.phone}</dd>
              </div>
              {submittedData.message && submittedData.message !== 'None provided' && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-[#2C3339]/50 uppercase tracking-[.08em]">Note for Rebecca</dt>
                  <dd className="text-sm text-[#2C3339]/80 mt-1 italic bg-[#FAF6F0] p-3 rounded-xl border border-[#2C3339]/10">
                    “{submittedData.message}”
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="line-link text-xs font-bold uppercase tracking-[.14em] text-[#7D6485] py-2"
            >
              Submit another request
            </button>
            <a
              href="https://wa.me/447858077379"
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#A8B79A] px-5 py-2.5 text-xs font-bold uppercase tracking-[.12em] text-[#2C3339] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#2C3339] hover:text-[#FAF6F0]"
            >
              <MessageCircle size={15} /> Have a question? WhatsApp Rebecca
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE REQUEST FORM
  return (
    <div
      className={`rounded-[2.5rem] border border-[#2C3339]/10 bg-[#FAF6F0] p-6 md:p-10 shadow-xl ${className}`}
      id="appointment-request"
    >
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Header Introduction */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#7D6485]">
            <CalendarDays size={16} /> Online & In-Person Appointment Request
          </div>
          <h2 className="display mt-2 text-3xl md:text-4xl text-[#2C3339]">
            Choose a Gentle Beginning
          </h2>
          <p className="mt-3 text-sm md:text-base leading-[1.7] text-[#2C3339]/70 max-w-[650px]">
            Select your preferred date, time, and session package. No payment is taken today — Rebecca will contact you directly to confirm.
          </p>
        </div>

        {/* SECTION 1: INTERACTIVE CALENDAR & TIME SELECTION */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start pt-2">
          {/* Real Interactive Calendar */}
          <div className="rounded-3xl border border-[#2C3339]/10 bg-white/80 p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C3339]/10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7D6485]">Step 1</span>
                <h3 className="font-serif text-xl font-semibold text-[#2C3339]">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={!canGoPreviousMonth}
                  aria-label="Previous month"
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                    canGoPreviousMonth
                      ? 'border-[#2C3339]/15 text-[#2C3339] hover:bg-[#2C3339] hover:text-[#FAF6F0]'
                      : 'border-transparent text-[#2C3339]/20 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={!canGoNextMonth}
                  aria-label="Next month"
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                    canGoNextMonth
                      ? 'border-[#2C3339]/15 text-[#2C3339] hover:bg-[#2C3339] hover:text-[#FAF6F0]'
                      : 'border-transparent text-[#2C3339]/20 cursor-not-allowed'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {weekDayLabels.map((day) => (
                <div key={day} className="text-[11px] font-bold uppercase tracking-[.06em] text-[#2C3339]/50 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="mt-2 grid grid-cols-7 gap-1.5 text-center">
              {calendarDays.map((day) => {
                const isCurrentMonthDay = isSameMonth(day, currentMonth);
                const isAvailable = isCurrentMonthDay && isDateAvailable(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);

                if (!isCurrentMonthDay) {
                  return <div key={day.toISOString()} className="h-10 md:h-11" />;
                }

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => isAvailable && handleDateSelect(day)}
                    disabled={!isAvailable}
                    aria-label={`${format(day, 'EEEE, d MMMM yyyy')}, ${
                      isSelected ? 'selected' : isAvailable ? 'available' : 'unavailable'
                    }`}
                    className={`relative flex h-10 md:h-11 w-full items-center justify-center rounded-xl text-xs md:text-sm transition-all ${
                      isSelected
                        ? 'bg-[#7D6485] font-bold text-[#FAF6F0] shadow-md ring-2 ring-[#7D6485]/40'
                        : isAvailable
                        ? 'border border-[#2C3339]/15 bg-white text-[#2C3339] hover:border-[#7D6485] hover:bg-[#A8B79A]/25'
                        : 'border border-transparent text-[#2C3339]/25 cursor-not-allowed'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {isCurrentDay && !isSelected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#7D6485]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-[#2C3339]/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#2C3339]/65">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md border border-[#2C3339]/25 bg-white" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-[#7D6485]" /> Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md border border-transparent bg-[#2C3339]/10" /> Unavailable
              </span>
            </div>
          </div>

          {/* Time Slot Picker */}
          <div className="rounded-3xl border border-[#2C3339]/10 bg-white/80 p-5 md:p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7D6485]">Step 2</span>
              <h3 className="font-serif text-xl font-semibold text-[#2C3339]">
                Select Preferred Time
              </h3>

              {selectedDate ? (
                <div className="mt-2 text-xs text-[#7D6485] font-medium flex items-center gap-1.5">
                  <CalendarDays size={14} /> {formatDateDisplay(selectedDate)}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#2C3339]/60">
                  Select an available date on the calendar to see session times.
                </p>
              )}

              <div className="mt-5">
                {selectedDate ? (
                  availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {availableSlots.map((timeStr) => {
                        const isTimeSelected = selectedTime === timeStr;
                        return (
                          <button
                            key={timeStr}
                            type="button"
                            onClick={() => {
                              setSelectedTime(timeStr);
                              setErrorMessage('');
                            }}
                            className={`focus-ring flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs md:text-sm font-medium transition-all ${
                              isTimeSelected
                                ? 'bg-[#7D6485] text-[#FAF6F0] shadow-sm ring-2 ring-[#7D6485]/40 font-semibold'
                                : 'border border-[#2C3339]/15 bg-[#FAF6F0] text-[#2C3339] hover:border-[#7D6485] hover:bg-[#A8B79A]/20'
                            }`}
                          >
                            <Clock size={14} className={isTimeSelected ? 'text-[#FAF6F0]' : 'text-[#7D6485]'} />
                            {formatTimeDisplay(timeStr)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#2C3339]/60 italic py-6 text-center">
                      No slots currently open for this date. Please pick another date.
                    </p>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-[#2C3339]/50">
                    <Clock size={28} className="mb-2 text-[#7D6485]/40" />
                    Please choose a date from the calendar to view morning and afternoon times.
                  </div>
                )}
              </div>
            </div>

            {selectedDate && selectedTime && (
              <div className="mt-6 rounded-2xl bg-[#A8B79A]/25 p-3.5 text-xs text-[#2C3339]/80 flex items-center justify-between">
                <span>Selected: <strong>{format(selectedDate, 'd MMM')}</strong> at <strong>{formatTimeDisplay(selectedTime)}</strong></span>
                <Check size={16} className="text-[#7D6485]" />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: SESSION & PRICING OPTIONS */}
        <div className="pt-4 border-t border-[#2C3339]/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7D6485]">Step 3</span>
            <h3 className="display mt-1 text-2xl md:text-3xl text-[#2C3339]">
              Choose Your Session Package
            </h3>
            <p className="mt-1 text-xs md:text-sm text-[#2C3339]/65">
              Select whether you are requesting a single 1:1 session or booking a discounted 3-session commitment.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {SESSION_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.id === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative cursor-pointer rounded-3xl p-6 transition-all border ${
                    isSelected
                      ? 'border-[#7D6485] bg-[#7D6485]/10 shadow-md ring-2 ring-[#7D6485]/30'
                      : 'border-[#2C3339]/15 bg-white/70 hover:border-[#7D6485]/60 hover:bg-white'
                  }`}
                >
                  {pkg.badge && (
                    <span className="absolute -top-3 right-6 rounded-full bg-[#C9A876] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#2C3339] shadow-sm">
                      {pkg.badge}
                    </span>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-[#2C3339]">{pkg.name}</h4>
                      <p className="display mt-2 text-2xl font-bold text-[#7D6485]">
                        {pkg.priceDisplay}
                      </p>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                        isSelected ? 'border-[#7D6485] bg-[#7D6485] text-white' : 'border-[#2C3339]/30 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-[1.7] text-[#2C3339]/70">{pkg.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: PATIENT DETAILS */}
        <div className="pt-4 border-t border-[#2C3339]/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7D6485]">Step 4</span>
            <h3 className="display mt-1 text-2xl md:text-3xl text-[#2C3339]">
              Your Details
            </h3>
            <p className="mt-1 text-xs md:text-sm text-[#2C3339]/65">
              Your contact details are treated with strict confidentiality.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-name`} className="block text-xs font-semibold text-[#2C3339] mb-1.5">
                Full Name <span className="text-[#7D6485]">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3339]/40">
                  <User size={16} />
                </span>
                <input
                  id={`${formId}-name`}
                  required
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="focus-ring w-full rounded-xl border border-[#2C3339]/20 bg-white/90 pl-10 pr-4 py-3 text-sm text-[#2C3339] placeholder:text-[#2C3339]/35"
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-email`} className="block text-xs font-semibold text-[#2C3339] mb-1.5">
                Email Address <span className="text-[#7D6485]">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3339]/40">
                  <Mail size={16} />
                </span>
                <input
                  id={`${formId}-email`}
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="focus-ring w-full rounded-xl border border-[#2C3339]/20 bg-white/90 pl-10 pr-4 py-3 text-sm text-[#2C3339] placeholder:text-[#2C3339]/35"
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-phone`} className="block text-xs font-semibold text-[#2C3339] mb-1.5">
                Phone Number <span className="text-[#7D6485]">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3339]/40">
                  <Phone size={16} />
                </span>
                <input
                  id={`${formId}-phone`}
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 07858077379"
                  className="focus-ring w-full rounded-xl border border-[#2C3339]/20 bg-white/90 pl-10 pr-4 py-3 text-sm text-[#2C3339] placeholder:text-[#2C3339]/35"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-message`} className="block text-xs font-semibold text-[#2C3339] mb-1.5">
                Optional Message
              </label>
              <div className="relative">
                <textarea
                  id={`${formId}-message`}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="A few words about what brings you here, or if you prefer online vs quiet room in Bristol..."
                  className="focus-ring w-full rounded-xl border border-[#2C3339]/20 bg-white/90 px-4 py-3 text-sm text-[#2C3339] placeholder:text-[#2C3339]/35 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: LIVE BOOKING SUMMARY */}
        <div className="rounded-3xl border border-[#2C3339]/15 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#2C3339]/10 pb-4">
            <h3 className="display text-2xl text-[#2C3339]">
              Booking Summary
            </h3>
            <span className="rounded-full bg-[#A8B79A]/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#2C3339]">
              Request Review
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#2C3339]/10">
              <span className="text-[10px] uppercase font-bold tracking-[.1em] text-[#2C3339]/50 block">Patient Name</span>
              <span className="font-semibold text-sm text-[#2C3339] mt-1 block truncate">
                {patientName.trim() || '—'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#2C3339]/10">
              <span className="text-[10px] uppercase font-bold tracking-[.1em] text-[#2C3339]/50 block">Selected Date</span>
              <span className="font-semibold text-sm text-[#2C3339] mt-1 block truncate">
                {selectedDate ? format(selectedDate, 'EEE, d MMM yyyy') : 'No date chosen'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#2C3339]/10">
              <span className="text-[10px] uppercase font-bold tracking-[.1em] text-[#2C3339]/50 block">Selected Time</span>
              <span className="font-semibold text-sm text-[#2C3339] mt-1 block truncate">
                {selectedTime ? formatTimeDisplay(selectedTime) : 'No time chosen'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#2C3339]/10">
              <span className="text-[10px] uppercase font-bold tracking-[.1em] text-[#2C3339]/50 block">Session & Price</span>
              <span className="font-semibold text-sm text-[#7D6485] mt-1 block truncate">
                {selectedPackage.name.split('—')[0].trim()} ({selectedPackage.price})
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FAF6F0]/60 text-[#2C3339]/70">
              <strong>Contact: </strong> {email.trim() || '—'} {phone.trim() ? ` · ${phone.trim()}` : ''}
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FAF6F0]/60 text-[#2C3339]/70 truncate">
              <strong>Message: </strong> {message.trim() || 'None provided'}
            </div>
          </div>

          <p className="mt-5 text-[11px] leading-[1.6] text-[#2C3339]/60 flex items-center gap-2">
            <ShieldCheck size={15} className="shrink-0 text-[#7D6485]" />
            No payment is processed today. This is an appointment request; Rebecca will review and contact you to confirm before anything is booked.
          </p>
        </div>

        {/* Error notice if validation failed */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
            <Info size={16} className="shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* SUBMISSION BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#2C3339] px-8 py-5 text-xs font-bold uppercase tracking-[.15em] !text-[#FAF6F0] shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-[#7D6485] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#FAF6F0]" />
                Sending Appointment Request...
              </>
            ) : (
              <>
                <span className="!text-[#FAF6F0]">Request Appointment</span>
                <Check size={16} className="!text-[#FAF6F0] transition-transform group-hover:scale-110" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
