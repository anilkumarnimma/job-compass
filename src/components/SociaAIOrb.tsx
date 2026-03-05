import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { X, Minus, ArrowUp, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── tooltip text per route ─── */
const tooltipForPath = (path: string) => {
  if (path.startsWith("/dashboard")) return "Find your perfect job ✦";
  if (path.startsWith("/recommendations")) return "Am I fit for this role?";
  if (path === "/profile") return "Improve my resume ✦";
  return "Ask Socia AI ✦";
};

const chipsForPath = (path: string) => {
  if (path.startsWith("/dashboard"))
    return ["Search jobs for me", "Top companies hiring", "Salary insights"];
  if (path === "/profile")
    return ["Review my resume", "Suggest skills to add", "Improve my bio"];
  if (path.startsWith("/recommendations"))
    return ["Why these matches?", "Refine my preferences", "More like this"];
  return ["Help me job search", "Resume tips", "Interview prep"];
};

/* ─── typing animation hook ─── */
const useTypewriter = (text: string, speed = 30, start = false) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!start) { setDisplayed(""); return; }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, start]);
  return displayed;
};

/* ─── message types ─── */
interface Message {
  id: string;
  role: "ai" | "user";
  text: string;
}

const GREETING = "Hi! ✦ I'm Socia AI.\nHow can I help your job search today?";

export const SociaAIOrb: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTypingGreeting, setIsTypingGreeting] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [hovered, setHovered] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const isMobile = useIsMobile();

  const greetingText = useTypewriter(GREETING, 25, isTypingGreeting);

  /* ─── open ─── */
  const handleOpen = useCallback(() => {
    if (isOpen || isMorphing) return;
    setIsMorphing(true);
    // Step 1-2: morph starts via CSS
    setTimeout(() => {
      setIsOpen(true);
    }, 80);
    // Step 3: content fade-in
    setTimeout(() => {
      setShowContent(true);
      setIsMorphing(false);
      if (messages.length === 0) {
        setIsTypingGreeting(true);
        setTimeout(() => setShowChips(true), 1200);
      }
    }, 500);
  }, [isOpen, isMorphing, messages.length]);

  /* ─── close ─── */
  const handleClose = useCallback(() => {
    if (!isOpen || isMorphing) return;
    setShowContent(false);
    setShowChips(false);
    setIsMorphing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsMorphing(false);
    }, 350);
  }, [isOpen, isMorphing]);

  /* ─── minimize ─── */
  const handleMinimize = handleClose;

  /* ─── send message ─── */
  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text || input).trim();
      if (!msg) return;
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: msg };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setShowChips(false);

      // Simulated AI reply
      setTimeout(() => {
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: "ai",
          text: "I'm here to help! This feature is coming soon with full AI capabilities. ✦",
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 1200);
    },
    [input]
  );

  /* scroll to bottom */
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, greetingText]);

  const tooltip = tooltipForPath(location.pathname);
  const chips = chipsForPath(location.pathname);

  const chatW = isMobile ? "100vw" : 380;
  const chatH = isMobile ? "75vh" : 520;

  return (
    <div
      className="fixed z-[9999]"
      style={{
        right: isMobile ? (isOpen ? 0 : 16) : 28,
        bottom: isMobile ? (isOpen ? 0 : 100) : 28,
      }}
    >
      {/* ─── GLOW RINGS (visible when orb is closed) ─── */}
      <AnimatePresence>
        {!isOpen && !isMorphing && (
          <>
            {/* Ring 3 — outermost, slow pulse */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 110,
                height: 110,
                top: "50%",
                left: "50%",
                marginTop: -55 + (isOpen ? 0 : 0),
                marginLeft: -55,
                background: "rgba(0,229,255,0.06)",
                animation: "orbPulseSlow 3.5s ease-in-out infinite",
              }}
            />
            {/* Ring 2 — mid pulse */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 88,
                height: 88,
                top: "50%",
                left: "50%",
                marginTop: -44,
                marginLeft: -44,
                background: "rgba(0,229,255,0.15)",
                animation: "orbPulseMid 2.5s ease-in-out infinite",
              }}
            />
            {/* Ring 1 — always visible */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 72,
                height: 72,
                top: "50%",
                left: "50%",
                marginTop: -36,
                marginLeft: -36,
                background: "rgba(0,229,255,0.3)",
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ─── TOOLTIP on hover ─── */}
      <AnimatePresence>
        {hovered && !isOpen && !isMorphing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute pointer-events-none whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              bottom: 68,
              right: 0,
              background: "#1a1d27",
              color: "#fff",
              border: "1px solid rgba(0,229,255,0.25)",
            }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTAINER (orb → chat morph) ─── */}
      <div
        onClick={!isOpen && !isMorphing ? handleOpen : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative"
        style={{
          width: isOpen || isMorphing ? chatW : 60,
          height: isOpen || isMorphing ? chatH : 60,
          borderRadius: isOpen || isMorphing ? 20 : "50%",
          background: isOpen || isMorphing ? "#0d0f14" : "radial-gradient(circle at 40% 35%, #00e5ff 0%, #0077ff 100%)",
          border: isOpen || isMorphing ? "1px solid rgba(0,229,255,0.25)" : "none",
          boxShadow: isOpen || isMorphing
            ? "0 0 0 1px rgba(0,229,255,0.1), 0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(0,229,255,0.08)"
            : "0 0 20px rgba(0,229,255,0.3)",
          cursor: isOpen ? "default" : "pointer",
          transformOrigin: isMobile ? "bottom right" : "bottom right",
          transition: `width 0.4s cubic-bezier(0.34,1.56,0.64,1),
                       height 0.4s cubic-bezier(0.34,1.56,0.64,1),
                       border-radius 0.35s ease,
                       background 0.3s ease,
                       box-shadow 0.3s ease`,
          willChange: "transform, opacity, width, height",
          overflow: "hidden",
          transform: hovered && !isOpen && !isMorphing ? "scale(1.12)" : "scale(1)",
        }}
      >
        {/* ─── ORB INNER (sparkle + shimmer) ─── */}
        {!isOpen && !isMorphing && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
              style={{ animation: "orbShimmer 4s ease-in-out infinite" }}
            >
              <div
                className="absolute"
                style={{
                  width: "150%",
                  height: "100%",
                  top: 0,
                  left: "-50%",
                  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
                  animation: "orbShimmerSweep 4s ease-in-out infinite",
                }}
              />
            </div>
            {/* Sparkle icon */}
            <Sparkles
              className="text-white relative z-10"
              size={22}
              style={{ animation: "orbSparkleRotate 8s linear infinite" }}
            />
          </div>
        )}

        {/* ─── CHAT CONTENT ─── */}
        <AnimatePresence>
          {showContent && isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="flex flex-col h-full"
              data-socia-chat
            >
              {/* HEADER */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0, duration: 0.25 }}
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ height: 60 }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      width: 16,
                      height: 16,
                      background: "radial-gradient(circle, #00e5ff, #0077ff)",
                    }}
                  />
                  <div>
                    <div className="text-white font-bold text-sm leading-tight">
                      Socia AI
                    </div>
                    <div className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Career Assistant
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleMinimize}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>

              {/* Header divider */}
              <div
                className="shrink-0"
                style={{
                  height: 1,
                  background: "linear-gradient(90deg, transparent 5%, rgba(0,229,255,0.3) 50%, transparent 95%)",
                }}
              />

              {/* CHAT BODY */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.25 }}
                ref={chatBodyRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,229,255,0.2) transparent" }}
              >
                {/* Greeting */}
                {isTypingGreeting && (
                  <div className="flex items-start gap-2">
                    <div
                      className="rounded-full shrink-0 mt-1"
                      style={{
                        width: 20,
                        height: 20,
                        background: "radial-gradient(circle, #00e5ff, #0077ff)",
                      }}
                    />
                    <div
                      className="rounded-xl rounded-tl-sm px-3 py-2 text-[13px] leading-relaxed max-w-[85%] whitespace-pre-wrap"
                      style={{
                        background: "#1a1d27",
                        color: "#fff",
                        borderLeft: "2px solid rgba(0,229,255,0.4)",
                      }}
                    >
                      {greetingText}
                      {greetingText.length < GREETING.length && (
                        <span className="inline-block w-[2px] h-[14px] ml-0.5 align-middle" style={{ background: "#00e5ff", animation: "blink 1s step-end infinite" }} />
                      )}
                    </div>
                  </div>
                )}

                {/* Quick chips */}
                <AnimatePresence>
                  {showChips && messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-wrap gap-2 pl-7"
                    >
                      {chips.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleSend(chip)}
                          className="text-[12px] px-3 py-1.5 rounded-full transition-all duration-200"
                          style={{
                            border: "1px solid rgba(0,229,255,0.3)",
                            background: "rgba(0,229,255,0.05)",
                            color: "rgba(255,255,255,0.8)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(0,229,255,0.8)";
                            e.currentTarget.style.color = "#0d0f14";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(0,229,255,0.05)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Messages */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "ai" && (
                      <div
                        className="rounded-full shrink-0 mt-1"
                        style={{
                          width: 20,
                          height: 20,
                          background: "radial-gradient(circle, #00e5ff, #0077ff)",
                        }}
                      />
                    )}
                    <div
                      className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                        msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                      }`}
                      style={
                        msg.role === "ai"
                          ? {
                              background: "#1a1d27",
                              color: "#fff",
                              borderLeft: "2px solid rgba(0,229,255,0.4)",
                            }
                          : {
                              background: "linear-gradient(135deg, #00e5ff, #0077ff)",
                              color: "#fff",
                            }
                      }
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* INPUT BAR */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.25 }}
                className="shrink-0 p-3"
              >
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200"
                  style={{
                    background: "#1a1d27",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 12px rgba(0,229,255,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 outline-none"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-30"
                    style={{
                      background: input.trim() ? "rgba(0,229,255,0.9)" : "rgba(0,229,255,0.2)",
                      color: "#0d0f14",
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
