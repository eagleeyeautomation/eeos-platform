// EEOS Contact Page — Sovereign Night Design System

import { useState } from "react";
import { Mail, Phone, Clock, Send } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { toast } from "sonner";
import { PUBLIC_CONTACT } from "@/lib/public-site";

const CONTACT_TYPES = [
  { id: "demo", label: "Request a Demo" },
  { id: "sales", label: "Sales Inquiry" },
  { id: "security", label: "Security Briefing" },
  { id: "partnership", label: "Partnership" },
  { id: "press", label: "Press & Media" },
  { id: "support", label: "Customer Support" },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    type: "demo",
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    title: "",
    employees: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message received. Our team will contact you within 24 hours.", {
      description: "A confirmation has been sent to your email.",
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-[#0B0B0B] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-2xl mx-auto">
            <div className="section-label mb-4">Contact</div>
            <h1
              className="text-5xl font-bold text-[#FFFFFF] tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Let's talk about
              <br />
              <span className="gradient-text">growing your business</span>
            </h1>
            <p className="text-lg text-[#FFFFFF]/65">
              Eagle Eye Automation's team responds within 24 hours. For urgent inquiries, call us directly.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="bg-[#141414] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <AnimatedSection>
                <div className="glass-card rounded-2xl p-8">
                  <h2
                    className="text-2xl font-bold text-[#FFFFFF] mb-6"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Send us a message
                  </h2>

                  {/* Contact Type */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-3"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      What can we help you with?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CONTACT_TYPES.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type.id })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            formData.type === type.id
                              ? "bg-[rgba(201,162,39,0.15)] border border-[rgba(201,162,39,0.5)] text-[#C9A227]"
                              : "border border-[rgba(201,162,39,0.15)] text-[#FFFFFF]/60 hover:border-[rgba(201,162,39,0.3)] hover:text-[#FFFFFF]/80"
                          }`}
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                          placeholder="Alexandra"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                          placeholder="Chen"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                        placeholder="owner@yourcompany.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Company *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                          placeholder="Your Company"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Title
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                          placeholder="Chief Executive Officer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Organization Size
                      </label>
                      <select
                        value={formData.employees}
                        onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg text-sm eeos-input eeos-select"
                      >
                        <option value="" disabled>Select employee count</option>
                        <option value="1-10">1 – 10</option>
                        <option value="11-25">11 – 25</option>
                        <option value="26-75">26 – 75</option>
                        <option value="76-150">76 – 150</option>
                        <option value="150+">150+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Message
                      </label>
                      <textarea
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg text-sm eeos-input resize-none"
                        placeholder="Tell us what you want EEOS to help your business see, automate, or manage..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200 shadow-[0_0_20px_rgba(201,162,39,0.35)] active:scale-[0.98]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                  </form>
                </div>
              </AnimatedSection>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <AnimatedSection delay={200}>
                <div className="glass-card rounded-xl p-6">
                  <h3
                    className="text-base font-semibold text-[#FFFFFF] mb-4"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Direct Contact
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-[#C9A227] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-[#FFFFFF]/40 mb-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Email
                        </div>
                        <a href={PUBLIC_CONTACT.mailto} className="text-sm text-[#FFFFFF]/80 hover:text-[#C9A227]">
                          {PUBLIC_CONTACT.email}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-[#C9A227] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-[#FFFFFF]/40 mb-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Phone
                        </div>
                        <a href={PUBLIC_CONTACT.tel} className="text-sm text-[#FFFFFF]/80 hover:text-[#C9A227]">
                          {PUBLIC_CONTACT.phoneDisplay}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#C9A227] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-[#FFFFFF]/40 mb-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Response Time
                        </div>
                        <div className="text-sm text-[#FFFFFF]/80">Within 24 hours</div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={300}>
                <div className="glass-card rounded-xl p-6">
                  <h3
                    className="text-base font-semibold text-[#FFFFFF] mb-4"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    What to expect
                  </h3>
                  <ul className="space-y-3 text-sm leading-6 text-[#FFFFFF]/58">
                    <li>We will review your business goals and GoHighLevel setup.</li>
                    <li>We will recommend the most practical EEOS starting plan.</li>
                    <li>We will not promise unavailable features or fabricated outcomes.</li>
                    <li>AI support can be planned for 24/7 workflows once your systems are ready.</li>
                  </ul>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
