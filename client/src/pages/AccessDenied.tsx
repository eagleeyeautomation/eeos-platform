import { Link } from "wouter";
import { ShieldAlert, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />
      <main className="min-h-[70vh] flex items-center justify-center px-4 pt-24 pb-16">
        <section className="glass-card max-w-xl rounded-2xl p-8 text-center border border-[rgba(201,162,39,0.16)]">
          <ShieldAlert className="w-12 h-12 text-[#C9A227] mx-auto mb-4" />
          <div className="section-label mb-3">Access Denied</div>
          <h1 className="text-3xl font-bold text-[#FFFFFF] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            This area is not available for your current role.
          </h1>
          <p className="text-sm text-[#FFFFFF]/55 mb-6">
            EEOS separates public, customer owner, and Eagle Eye platform administrator experiences to protect customer data.
          </p>
          <Link
            href="/executive-home"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C9A227] text-[#0B0B0B] text-sm font-semibold hover:bg-[#D8B84A] transition"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Return to Command Center
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}
