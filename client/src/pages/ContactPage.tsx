import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, HelpCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { sanitizeString } from '../lib/security';

export const ContactPage: React.FC = () => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('technical');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeString(name);
    const cleanMessage = sanitizeString(message);
    if (!cleanName || !email || !cleanMessage) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    // Store back sanitized values so renders/echoes never carry raw input
    setName(cleanName);
    setMessage(cleanMessage);
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    setSubmitted(true);
    showToast('Your message was sent straight to the workbench team!');
  };

  const faqs = [
    {
      q: 'What kind of power supply should I use?',
      a: 'The Neon Fuzz Box runs on standard 9V DC center-negative power (2.1mm barrel, Boss-standard). It also takes an internal 9V alkaline battery. Never feed it more than 9.6V.',
    },
    {
      q: 'Where in my pedalboard signal chain should I place it?',
      a: 'Like classic vintage fuzzes, it loves being FIRST in your signal chain right after your guitar pickups before any buffered pedals or tuners. It also sounds monster pushing an overdrive.',
    },
    {
      q: 'How does the 1-Year Bench Warranty work?',
      a: 'If any potentiometer, footswitch, jack, or internal solder trace fails during normal use within 12 months, we fix or replace it free. You simply ship it to our Burdwan workshop.',
    },
    {
      q: 'How long does shipping take?',
      a: 'All orders placed before 2 PM IST are dispatched same day or next morning via Blue Dart Express / Shiprocket with live tracking. Typical transit time is 2-4 business days.',
    },
  ];

  return (
    <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-20 right-1/4 w-[600px] h-[400px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#FF5E1E]/30 rounded-full text-xs font-mono-tech uppercase tracking-[0.25em] text-[#FF5E1E] shadow-sm">
            Workshop Direct Support
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-editorial font-normal tracking-tight uppercase">
            Talk To The Builders
          </h1>
          <p className="text-xs sm:text-base text-[#8A6A54] font-light max-w-xl mx-auto leading-relaxed">
            Got a question about rig compatibility, custom orders, or your shipment? We answer every message directly from our Burdwan workbench.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Contact Details & Info */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-xl">
              <h3 className="text-2xl font-editorial font-bold text-[#2A1A12]">
                Workbench Headquarters
              </h3>

              <div className="space-y-4 text-xs sm:text-sm font-mono-tech">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] text-white shrink-0 border border-[#FF5E1E]/30 shadow-lg shadow-[#FF5E1E]/30">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-[#2A1A12]">Burdwan Workshop</div>
                    <div className="text-[#8A6A54] text-xs pt-0.5">
                      IDIOT Pedals Audio Labs, Grand Trunk Road Sector, Burdwan, West Bengal 713101, India
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] text-white shrink-0 border border-[#FF5E1E]/30 shadow-lg shadow-[#FF5E1E]/30">
                    <Mail size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-[#2A1A12]">Email Dispatch</div>
                    <div className="text-[#8A6A54] text-xs pt-0.5">workbench@idiotpedals.com</div>
                    <div className="text-[11px] text-[#FF5E1E]/80 pt-0.5">Typical response within 2 hours</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] text-white shrink-0 border border-[#FF5E1E]/30 shadow-lg shadow-[#FF5E1E]/30">
                    <Phone size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-[#2A1A12]">Phone & WhatsApp</div>
                    <div className="text-[#8A6A54] text-xs pt-0.5">+91 98301 23456</div>
                    <div className="text-[11px] text-[#8A6A54]/70 pt-0.5">Mon – Sat, 10:00 AM to 7:00 PM IST</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl flex items-center gap-3 text-xs font-mono-tech text-[#8A6A54]">
                <ShieldCheck size={18} className="text-[#FF5E1E] shrink-0" />
                <span>All pedals covered by 1-Year Comprehensive Bench Warranty.</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-7 bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
                <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-[#2A1A12]">
                  Message Logged On Our Bench
                </h3>
                <p className="text-xs sm:text-sm text-[#8A6A54] max-w-md mx-auto font-light">
                  Thank you, {name}. A member of our engineering team has received your ticket and will write back to {email} shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-3 bg-[#FFF1E6] border border-[#F0D3B8] text-xs font-mono-tech text-[#2A1A12] rounded-full uppercase hover:border-[#FF5E1E] cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-2xl font-editorial font-bold text-[#2A1A12]">
                    Direct Ticket Submission
                  </h3>
                  <p className="text-xs text-[#8A6A54] font-light">
                    Leave your notes, rig setup questions, or order feedback below.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={254}
                      placeholder="guitarist@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    Inquiry Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  >
                    <option value="technical">Circuit Compatibility & Rig Troubleshooting</option>
                    <option value="order">Order Tracking & Shipping Inquiry</option>
                    <option value="warranty">Warranty Claim / Repair Service</option>
                    <option value="bulk">Band / Studio Bulk Inquiries</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    maxLength={2000}
                    placeholder="Tell us what guitar/amp you play, or any questions about the Neon Fuzz Box..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl p-4 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>{isSubmitting ? 'Transmitting to Workbench...' : 'Send Message To Builders'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQs */}
        <div id="warranty" className="space-y-8 pt-8">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-4xl font-editorial font-normal text-[#2A1A12]">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-[#8A6A54] font-mono-tech">
              Quick answers regarding power, signal chain, and our 1-year warranty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, i) => (
              <div key={i} className="p-6 bg-white border border-[#F0D3B8] rounded-2xl space-y-2 backdrop-blur-xl">
                <div className="font-bold text-xs sm:text-sm text-[#2A1A12] flex items-center gap-2 font-mono-tech">
                  <HelpCircle size={15} className="text-[#FF5E1E] shrink-0" />
                  <span>{faq.q}</span>
                </div>
                <p className="text-xs text-[#8A6A54] leading-relaxed pl-6 font-light">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
