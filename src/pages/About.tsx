import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  ChevronDown,
  Search,
  Sparkles,
  Send,
  Link2Off,
  Clock,
  Wand2,
  Linkedin,
  Check,
  X as XIcon,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ParticleField } from "@/components/about/ParticleField";
import { supabase } from "@/integrations/supabase/client";

// ----- Animated counter with intersection observer -----
function useInViewOnce<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { threshold },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return { ref, inView: seen };
}

function Counter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(Math.round(ease(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
}

interface Stats {
  jobs: number;
  companies: number;
  hunters: number;
  weekly: number;
}

export default function About() {
  const [stats, setStats] = useState<Stats>({ jobs: 50000, companies: 2000, hunters: 2000, weekly: 500 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [jobsRes, companiesRes, profilesRes, weeklyRes] = await Promise.all([
          supabase
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("is_published", true)
            .is("deleted_at", null),
          supabase
            .from("jobs")
            .select("company")
            .eq("is_published", true)
            .is("deleted_at", null)
            .limit(10000),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("is_published", true)
            .is("deleted_at", null)
            .gte("posted_date", sevenDaysAgo),
        ]);
        if (!mounted) return;
        const uniqueCompanies = new Set(
          (companiesRes.data ?? []).map((r: any) => (r.company || "").toLowerCase().trim()).filter(Boolean),
        );
        setStats({
          jobs: jobsRes.count ?? 50000,
          companies: uniqueCompanies.size || 2000,
          hunters: profilesRes.count ?? 2000,
          weekly: weeklyRes.count ?? 500,
        });
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Smooth scroll
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  const scrollToStory = () => {
    document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>About — Sociax | Built for Job Hunters</title>
        <meta
          name="description"
          content="Sociax is built for job hunters. 50,000+ direct company jobs, AI tools that actually help, and free to start."
        />
        <link rel="canonical" href="https://sociax.tech/about" />
      </Helmet>

      <style>{`
        @keyframes about-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes about-bounce-arrow {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(8px); opacity: 1; }
        }
        @keyframes about-cta-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="min-h-screen bg-[#080c14] text-white">
        <Header />

        {/* SECTION 1 — WebGL Hero */}
        <section className="relative h-screen w-full overflow-hidden">
          <ParticleField />
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div
                className="text-[11px] font-semibold mb-6"
                style={{ color: "#00c6a7", letterSpacing: "4px" }}
              >
                BUILT FOR JOB HUNTERS
              </div>
              <h1 className="font-extrabold leading-[1.05] tracking-tight">
                <span className="block text-white text-[40px] sm:text-[56px] md:text-[64px]">
                  We built Sociax
                </span>
                <span className="block text-white text-[40px] sm:text-[56px] md:text-[64px]">
                  because job hunting
                </span>
                <span
                  className="block italic text-[40px] sm:text-[56px] md:text-[64px]"
                  style={{ color: "#00c6a7" }}
                >
                  was broken.
                </span>
              </h1>
              <p className="mt-8 mx-auto text-[18px] text-white/60 max-w-[560px]">
                50,000+ direct company jobs. AI tools built around you. Free to start.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    className="rounded-full px-7 h-12 text-[15px] font-semibold text-[#08110f] hover:opacity-90"
                    style={{ backgroundColor: "#00c6a7" }}
                  >
                    Browse Jobs <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToStory}
                  className="rounded-full px-7 h-12 text-[15px] font-semibold bg-transparent border"
                  style={{ borderColor: "#00c6a7", color: "#00c6a7" }}
                >
                  Our story <ArrowDown className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <ChevronDown
              className="h-6 w-6"
              style={{ color: "#00c6a7", animation: "about-bounce-arrow 1.6s ease-in-out infinite" }}
            />
          </div>
        </section>

        {/* SECTION 2 — Mission */}
        <section id="our-story" className="py-32 px-6 bg-[#080c14]">
          <div className="max-w-[760px] mx-auto text-center">
            <p className="italic text-white text-[24px] sm:text-[28px] md:text-[32px] leading-snug max-w-[700px] mx-auto">
              "Most job boards were built for recruiters.
              <br />
              We built Sociax for the candidate."
            </p>
            <p className="mt-10 text-white/60 text-[16px] leading-relaxed max-w-[620px] mx-auto">
              Entry-level candidates get lost in a sea of senior roles, broken apply links, and tools
              that cost money they don't have yet. Sociax fixes that. Every job is direct. Every tool
              is built for you. Free to start, always.
            </p>
          </div>
        </section>

        {/* SECTION 3 — Stats */}
        <section className="py-24 px-6 bg-[#080c14]">
          <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { value: stats.jobs, label: "Jobs live" },
              { value: stats.companies, label: "Companies hiring" },
              { value: stats.hunters, label: "Job hunters" },
              { value: stats.weekly, label: "Added this week" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl p-6 backdrop-blur-md"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(0,198,167,0.25)",
                  boxShadow: "0 0 40px -20px rgba(0,198,167,0.4)",
                }}
              >
                <div className="text-4xl md:text-5xl font-extrabold" style={{ color: "#00c6a7" }}>
                  <Counter target={s.value} />+
                </div>
                <div className="mt-2 text-white/60 text-sm">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SECTION 4 — Problem */}
        <section className="py-32 px-6 bg-[#080c14]">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-center text-3xl md:text-5xl font-extrabold mb-16">
              Everything wrong with job hunting. <span style={{ color: "#00c6a7" }}>Fixed.</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Link2Off, title: "Broken apply links", fix: "Every Sociax link goes straight to the company's apply page — verified daily." },
                { icon: Clock, title: "Outdated listings", fix: "We pull fresh roles every day and remove what's expired automatically." },
                { icon: Wand2, title: "Generic tools that don't help", fix: "Our AI is built for entry-level resumes, real ATS scoring, and your exact role." },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div
                    key={i}
                    className="group rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px -10px rgba(0,198,167,0.35)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,198,167,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                    }}
                  >
                    <Icon className="h-7 w-7 mb-5" style={{ color: "#00c6a7" }} />
                    <h3 className="text-xl font-bold mb-2 text-white">{c.title}</h3>
                    <p className="text-white/60 text-[15px] leading-relaxed">{c.fix}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 5 — How it works */}
        <section className="py-32 px-6 bg-[#080c14]">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-center text-3xl md:text-5xl font-extrabold mb-20">
              Three steps to your <span style={{ color: "#00c6a7" }}>next role</span>
            </h2>
            <div className="relative grid md:grid-cols-3 gap-10">
              <div
                className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px"
                style={{
                  backgroundImage: "linear-gradient(90deg, #00c6a7 50%, transparent 50%)",
                  backgroundSize: "12px 1px",
                }}
              />
              {[
                { icon: Search, title: "Search your role", desc: "Pick from thousands of roles tailored for 0-5 years experience." },
                { icon: Sparkles, title: "Optimise with AI", desc: "Tailor your resume, generate cover letters, and check ATS in seconds." },
                { icon: Send, title: "Apply directly", desc: "One click takes you straight to the company's official application." },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, delay: i * 0.2 }}
                    className="relative text-center"
                  >
                    <div
                      className="relative mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6"
                      style={{
                        background: "#080c14",
                        border: "1px solid rgba(0,198,167,0.5)",
                        boxShadow: "0 0 30px -10px rgba(0,198,167,0.6)",
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: "#00c6a7" }} />
                      <div
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center text-[#08110f]"
                        style={{ backgroundColor: "#00c6a7" }}
                      >
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-white">{s.title}</h3>
                    <p className="text-white/60 text-sm max-w-[260px] mx-auto">{s.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 6 — Comparison */}
        <section className="py-32 px-6 bg-[#080c14]">
          <div className="max-w-[900px] mx-auto">
            <h2 className="text-center text-3xl md:text-5xl font-extrabold mb-16">
              Not just another <span style={{ color: "#00c6a7" }}>job board</span>
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="grid grid-cols-3 text-sm font-semibold">
                <div className="p-4 bg-white/[0.02] text-white/60">Feature</div>
                <div className="p-4 text-[#08110f] text-center" style={{ backgroundColor: "#00c6a7" }}>
                  Sociax
                </div>
                <div className="p-4 bg-white/[0.05] text-white/70 text-center">Others</div>
              </div>
              {[
                ["Direct company apply links", "yes", "no"],
                ["Fresh daily listings", "yes", "warn"],
                ["Built for 0-5 years experience", "yes", "no"],
                ["Free ATS checker", "yes", "paid"],
                ["AI cover letter", "yes", "paid"],
                ["AI resume tailor", "yes", "paid"],
                ["H1B sponsorship filter", "yes", "no"],
              ].map(([feat, a, b], i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 text-sm border-t"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <div className="p-4 text-white/80">{feat}</div>
                  <div className="p-4 text-center bg-[#00c6a7]/[0.04]">
                    <Cell kind={a as string} />
                  </div>
                  <div className="p-4 text-center">
                    <Cell kind={b as string} />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* SECTION 7 — Team */}
        <section className="py-32 px-6 bg-[#080c14]">
          <div className="max-w-[1000px] mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
              Two people. <span style={{ color: "#00c6a7" }}>One mission.</span>
            </h2>
            <p className="text-white/60 max-w-[620px] mx-auto mb-16">
              We are not a corporation. We are builders who were frustrated job seekers — so we built
              the platform we wished existed.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { name: "Founder", title: "Building Sociax", bio: "Engineer who shipped through hundreds of broken apply forms before deciding to fix it." },
                { name: "Co-builder", title: "Product & Design", bio: "Designs the tools we wish we had as candidates. Obsessed with making job hunting human again." },
              ].map((p, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-8 text-center transition-all duration-300 hover:shadow-[0_0_50px_-15px_rgba(0,198,167,0.5)]"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="mx-auto h-24 w-24 rounded-full mb-5 flex items-center justify-center text-2xl font-bold text-[#08110f]"
                    style={{
                      background: "linear-gradient(135deg, #00c6a7, #008f78)",
                      boxShadow: "0 0 0 3px rgba(0,198,167,0.4)",
                    }}
                  >
                    {p.name[0]}
                  </div>
                  <h3 className="font-bold text-lg text-white">{p.name}</h3>
                  <div className="text-sm mb-3" style={{ color: "#00c6a7" }}>{p.title}</div>
                  <p className="text-white/60 text-sm leading-relaxed">{p.bio}</p>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-5 text-white/70 hover:text-white"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-16 text-white/70">
              Building something together? Say hello →{" "}
              <a href="mailto:hello@sociax.tech" style={{ color: "#00c6a7" }} className="hover:underline">
                hello@sociax.tech
              </a>
            </p>
          </div>
        </section>

        {/* SECTION 8 — Final CTA */}
        <section
          className="py-32 px-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #080c14 0%, #003d35 25%, #00c6a7 50%, #003d35 75%, #080c14 100%)",
            backgroundSize: "400% 400%",
            animation: "about-cta-flow 8s ease infinite",
          }}
        >
          <div className="relative z-10 max-w-[800px] mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
              Your next opportunity is waiting.
            </h2>
            <p className="mt-6 text-white/80 text-lg">
              Join 2,000+ job hunters already using Sociax.
            </p>
            <Link to="/" className="inline-block mt-10">
              <Button
                size="lg"
                className="rounded-full px-8 h-14 text-base font-semibold text-[#08110f] hover:opacity-90"
                style={{ backgroundColor: "#00c6a7" }}
              >
                Start for free <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}

function Cell({ kind }: { kind: string }) {
  if (kind === "yes")
    return (
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="inline-flex"
      >
        <Check className="h-5 w-5" style={{ color: "#00c6a7" }} />
      </motion.span>
    );
  if (kind === "warn")
    return <AlertTriangle className="inline h-5 w-5 text-yellow-500/80" />;
  if (kind === "paid")
    return <span className="text-white/40 text-xs">Paid</span>;
  return <XIcon className="inline h-5 w-5 text-white/30" />;
}
