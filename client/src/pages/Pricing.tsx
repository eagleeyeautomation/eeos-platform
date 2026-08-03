import { Link } from "wouter";
import { ArrowRight, Brain, CheckCircle2, HelpCircle, Mail, Phone, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import {
  EEOS_BRAIN_QUESTIONS,
  FOUNDING_CUSTOMER_PLANS,
  FOUNDING_CUSTOMER_PROMO_ENABLED,
  OPTIONAL_INTELLIGENCE_ADDONS,
  PUBLIC_CONTACT,
  SETUP_FEE,
} from "@/lib/public-site";

const FAQS = [
  {
    q: "Who is Founding Customer Pricing for?",
    a: "It is for a limited group of early small-business customers that want EEOS configured around GoHighLevel and executive visibility while the product continues maturing.",
  },
  {
    q: "Is the setup fee a deposit?",
    a: "No. It is a one-time setup and onboarding fee due when onboarding begins and is separate from the monthly subscription.",
  },
  {
    q: "What integration is supported first?",
    a: "Version 1 focuses on GoHighLevel. Future integrations will be planned after the GoHighLevel experience is complete and production-ready.",
  },
  {
    q: "Will every section show data immediately?",
    a: "No. EEOS shows truthful empty states until connected systems have synchronized enough verified activity to populate each section.",
  },
];

function PricingVisual() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[rgba(201,162,39,0.18)] bg-[#080808] shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
      <img
        src="/eeos-assets/eeos-eagle-brain.svg"
        alt="Futuristic eagle with illuminated AI brain and data signals"
        className="aspect-[4/3] w-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080808] to-transparent p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00B2FF]/30 bg-[#00B2FF]/10 px-3 py-1 text-xs font-semibold text-[#A8E7FF]">
          <Brain className="h-3.5 w-3.5" />
          AI intelligence for small business operators
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      <section className="pt-32 pb-20 bg-[#0B0B0B] scan-grid">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.92fr]">
            <AnimatedSection>
              <div className="mb-5 flex flex-col items-start gap-4">
                <img
                  src="/eeos-assets/eeos-logo-official.png"
                  alt="EEOS Eagle Eye Operating System"
                  className="h-auto w-full max-w-[360px] object-contain"
                />
                <div className="section-label">Founding Customer Pricing</div>
              </div>
              <h1
                className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-[#FFFFFF] sm:text-6xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                The AI Operating System that gives small businesses the power of Fortune 500 companies.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#FFFFFF]/62">
                Start with affordable EEOS pricing while we work with an early group of qualified businesses to refine executive intelligence, GoHighLevel visibility, and automation workflows.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C9A227] px-6 py-3.5 text-sm font-bold text-[#0B0B0B] transition hover:bg-[#D8B84A]"
                >
                  Request a Demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={PUBLIC_CONTACT.mailto}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9A227]/35 px-6 py-3.5 text-sm font-semibold text-[#C9A227] transition hover:bg-[#C9A227]/10"
                >
                  Email Eagle Eye
                </a>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={160}>
              <PricingVisual />
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {FOUNDING_CUSTOMER_PROMO_ENABLED ? (
            <AnimatedSection className="mb-8">
              <div className="rounded-2xl border border-[#00B2FF]/30 bg-[#00B2FF]/10 px-5 py-4 text-center text-sm font-semibold text-[#A8E7FF]">
                Founding Customer Special: Setup fee waived for the first 10 qualified businesses.
              </div>
            </AnimatedSection>
          ) : null}

          <AnimatedSection className="mb-10 text-center">
            <div className="section-label mb-3">Founding Customer Pricing</div>
            <h2 className="text-3xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Simple monthly plans for early EEOS customers
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#FFFFFF]/55">
              This pricing is available for a limited group of early customers. Plan capabilities are limited to features currently available or actively supported during onboarding.
            </p>
          </AnimatedSection>

          <div className="grid gap-6 lg:grid-cols-3">
            {FOUNDING_CUSTOMER_PLANS.map((plan, index) => (
              <AnimatedSection key={plan.id} delay={index * 100}>
                <article
                  className={`flex h-full flex-col rounded-3xl border p-6 ${
                    plan.featured
                      ? "border-[#C9A227] bg-[#1A1A1A] shadow-[0_0_40px_rgba(201,162,39,0.14)]"
                      : "border-[rgba(201,162,39,0.15)] bg-[#0B0B0B]"
                  }`}
                >
                  {plan.featured ? (
                    <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#00B2FF]/30 bg-[#00B2FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A8E7FF]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Popular starting point
                    </div>
                  ) : null}
                  <div className="text-xs uppercase tracking-[0.16em] text-[#C0C7D1]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {plan.name} / {plan.planCode}
                  </div>
                  <h3 className="mt-3 text-3xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-5xl font-bold text-[#C9A227]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{plan.price}</span>
                    <span className="pb-2 text-sm text-[#FFFFFF]/50">{plan.cadence}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#FFFFFF]/58">{plan.customerType}</p>
                  <div className="mt-4 rounded-2xl border border-[#C0C7D1]/18 bg-[#C0C7D1]/6 px-4 py-3 text-sm text-[#FFFFFF]/70">
                    {plan.locationLimit}
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-[#FFFFFF]/68">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A227]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 rounded-2xl border border-[#C9A227]/24 bg-[#C9A227]/8 p-4">
                    <div className="text-sm font-semibold text-[#FFFFFF]">{SETUP_FEE.label}: {SETUP_FEE.price}</div>
                    <p className="mt-2 text-xs leading-5 text-[#FFFFFF]/55">{SETUP_FEE.disclosure}</p>
                  </div>
                  <Link
                    href="/contact"
                    className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                      plan.featured
                        ? "bg-[#C9A227] text-[#0B0B0B] hover:bg-[#D8B84A]"
                        : "border border-[#C9A227]/35 text-[#C9A227] hover:bg-[#C9A227]/10"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B0B0B] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-10 text-center">
            <div className="section-label mb-3">Optional Intelligence and Growth Add-ons</div>
            <h2 className="text-3xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Add intelligence only when the business is ready.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#FFFFFF]/55">
              Commercial add-ons are administrator-approved entitlements. No payment provider is connected and no organization is charged automatically.
            </p>
          </AnimatedSection>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {OPTIONAL_INTELLIGENCE_ADDONS.map((addon, index) => (
              <AnimatedSection key={addon.key} delay={index * 80}>
                <article className="flex h-full flex-col rounded-2xl border border-[#C9A227]/16 bg-[#141414] p-5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#C0C7D1]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {addon.key}
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{addon.name}</h3>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-3xl font-bold text-[#C9A227]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{addon.price}</span>
                    <span className="pb-1 text-xs text-white/45">{addon.cadence}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/55">{addon.description}</p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B0B0B] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="grid gap-8 rounded-3xl border border-[rgba(201,162,39,0.16)] bg-[#141414] p-6 sm:p-8 lg:grid-cols-[0.8fr_1fr]">
              <div>
                <div className="section-label mb-3">{SETUP_FEE.label}</div>
                <h2 className="text-3xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {SETUP_FEE.price} to prepare your business for launch
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#FFFFFF]/58">{SETUP_FEE.disclosure}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SETUP_FEE.covers.map((item) => (
                  <div key={item} className="rounded-2xl border border-[#C0C7D1]/12 bg-[#FFFFFF]/[0.03] px-4 py-3 text-sm text-[#FFFFFF]/70">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1fr]">
              <img
                src="/eeos-assets/approved/eeos-eagle-brain-closeup.jpg"
                alt="EEOS Brain intelligence visual"
                className="aspect-[4/3] w-full rounded-3xl border border-[#00B2FF]/20 object-cover object-[58%_center]"
                loading="lazy"
              />
              <div>
                <div className="section-label mb-3">Speak to EEOS Brain</div>
                <h2 className="text-4xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Learn how EEOS can help your business manage smarter.
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#FFFFFF]/58">
                  The live public AI conversation is not connected yet. For now, send your questions directly to Eagle Eye Automation or schedule a strategy call, and we will help you understand which EEOS path fits your business.
                </p>
                <div className="mt-6 grid gap-2">
                  {EEOS_BRAIN_QUESTIONS.map((question) => (
                    <div key={question} className="rounded-2xl border border-[#C0C7D1]/12 bg-[#FFFFFF]/[0.03] px-4 py-3 text-sm text-[#FFFFFF]/70">
                      {question}
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a href={PUBLIC_CONTACT.mailto} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-bold text-[#0B0B0B] hover:bg-[#D8B84A]">
                    <Mail className="h-4 w-4" />
                    Begin a Conversation
                  </a>
                  <a href={PUBLIC_CONTACT.tel} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00B2FF]/35 px-5 py-3 text-sm font-semibold text-[#A8E7FF] hover:bg-[#00B2FF]/10">
                    <Phone className="h-4 w-4" />
                    Schedule a Strategy Call
                  </a>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-[#0B0B0B] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Frequently asked questions
            </h2>
          </AnimatedSection>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <AnimatedSection key={faq.q}>
                <div className="rounded-2xl border border-[rgba(201,162,39,0.12)] bg-[#141414] p-6">
                  <div className="mb-3 flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A227]" />
                    <h3 className="text-base font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {faq.q}
                    </h3>
                  </div>
                  <p className="pl-7 text-sm leading-6 text-[#FFFFFF]/60">{faq.a}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
