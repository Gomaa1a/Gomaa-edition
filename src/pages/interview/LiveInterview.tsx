import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, PhoneOff, VolumeX, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AIOrb from "@/components/interview/AIOrb";
import InterviewTopBar from "@/components/interview/InterviewTopBar";
import { track, Events } from "@/lib/analytics";
import { Link } from "react-router-dom";

type TranscriptEntry = { role: "ai" | "user"; text: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const LiveInterview = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isConnecting, setIsConnecting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interviewData, setInterviewData] = useState<{ role: string; level: string; language?: string } | null>(null);
  const [currentPhase, setCurrentPhase] = useState("opening");
  const [questionCount, setQuestionCount] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [textFallback, setTextFallback] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [isPTTActive, setIsPTTActive] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const endingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const busyRef = useRef(false);
  const isPTTActiveRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const firstCallDoneRef = useRef(false);
  const handleUserTurnRef = useRef<(text: string) => Promise<void>>();

  // ── Load interview metadata ──
  useEffect(() => {
    if (!id) return;
    supabase
      .from("interviews")
      .select("role, level, language")
      .eq("id", id)
      .single()
      .then(({ data }) => { if (data) setInterviewData(data); });
  }, [id]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // ── Interview timer ──
  useEffect(() => {
    if (!interviewStarted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); handleEndInterview(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [interviewStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Spacebar PTT toggle ──
  useEffect(() => {
    if (!interviewStarted) return;
    const down = (e: KeyboardEvent) => { 
      if (e.code === "Space" && !e.repeat && !processing && !isTranscribing) { 
        e.preventDefault(); 
        if (isPTTActiveRef.current) {
          stopPTT();
        } else {
          startPTT();
        }
      } 
    };
    window.addEventListener("keydown", down);
    return () => { window.removeEventListener("keydown", down); };
  }, [interviewStarted, processing, isTranscribing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AudioContext helper ──
  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ latencyHint: "interactive" });
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // ── Browser TTS fallback ──
  const playBrowserTTS = useCallback((text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      // Pick best English voice available
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Samantha") || v.name.includes("Daniel"))) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") resolve();
        else { console.warn("Browser TTS error:", e.error); resolve(); }
      };
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // ── Primary TTS: OpenAI → fallback to browser ──
  const playTTS = useCallback(async (text: string): Promise<void> => {
    setTextFallback(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("No auth token");

      // Abort if TTS takes > 10s (prevents stuck "speaking" state)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      let res: Response;
      try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/openai-tts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) throw new Error(`TTS ${res.status}`);

      const arrayBuffer = await res.arrayBuffer();
      const audioCtx = await ensureAudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      audioSourceRef.current = source;

      // Only mark as "speaking" once audio is actually about to play
      setAiSpeaking(true);
      await new Promise<void>((resolve) => {
        source.onended = () => { audioSourceRef.current = null; resolve(); };
        source.start(0);
      });
    } catch (e) {
      // OpenAI TTS failed — fall back to browser speech synthesis
      console.warn("OpenAI TTS failed, using browser TTS:", (e as Error).message);
      setAiSpeaking(true); // still animate the orb
      try {
        await playBrowserTTS(text);
      } catch {
        setTextFallback(text);
      }
    } finally {
      setAiSpeaking(false);
    }
  }, [ensureAudioContext, playBrowserTTS]);

  // ── Orchestrator call ──
  const callOrchestrator = useCallback(async (userMessage?: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);

    try {
      // 30s timeout — prevents infinite "interview in progress" if the AI hangs
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      let data: { next_question: string; phase: string; question_count: number; follow_up: boolean; topic: string } | null = null;
      let invokeError: unknown = null;

      try {
        const result = await supabase.functions.invoke("interview-orchestrator", {
          body: { interviewId: id, userMessage: userMessage || "" },
        });
        data = result.data;
        invokeError = result.error;
      } finally {
        clearTimeout(timeout);
      }

      if (invokeError) {
        const err = invokeError as { message?: string; context?: { status?: number } };
        if (err.message?.includes("insufficient_credits") || err.context?.status === 402) {
          setInsufficientCredits(true);
          toast.error("Insufficient credits. Please buy more to continue.");
          return;
        }
        throw new Error(err.message || "Orchestrator error");
      }
      if (!data?.next_question) throw new Error("No question returned from AI");

      firstCallDoneRef.current = true;
      setCurrentPhase(data.phase || "opening");
      setQuestionCount(data.question_count || 0);
      setTranscript((prev) => [...prev, { role: "ai", text: data!.next_question }]);

      // Play TTS — this sets aiSpeaking true only when audio is ready
      await playTTS(data.next_question);
    } catch (e) {
      console.error("Orchestrator error:", e);
      const msg = (e as Error).message;
      if (msg?.includes("aborted") || msg?.includes("abort")) {
        toast.error("Interview took too long to respond. Please try again.");
      } else {
        toast.error("Failed to get next question. Please try again.");
      }
    } finally {
      setProcessing(false);
      busyRef.current = false;
    }
  }, [id, playTTS]);

  const handleUserTurn = useCallback(async (text: string) => {
    await callOrchestrator(text);
  }, [callOrchestrator]);

  useEffect(() => { handleUserTurnRef.current = handleUserTurn; }, [handleUserTurn]);

  // ── PTT: start recording ──
  const startPTT = useCallback(() => {
    if (busyRef.current || isTranscribing || isPTTActiveRef.current) return;

    // Interrupt AI speech
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch { /* already ended */ }
      audioSourceRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setAiSpeaking(false);

    const stream = mediaStreamRef.current;
    if (!stream) { toast.error("Microphone not available"); return; }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg";

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    recorder.start(100);
    mediaRecorderRef.current = recorder;

    isPTTActiveRef.current = true;
    setIsPTTActive(true);
  }, [isTranscribing]);

  // ── PTT: stop recording → Whisper ──
  const stopPTT = useCallback(() => {
    if (!isPTTActiveRef.current) return;
    isPTTActiveRef.current = false;
    setIsPTTActive(false);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    mediaRecorderRef.current = null;

    recorder.onstop = async () => {
      if (audioChunksRef.current.length === 0) return;
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      if (blob.size < 3000) return; // too short — ignore

      setIsTranscribing(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) throw new Error("No auth token");

        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const formData = new FormData();
        formData.append("audio", blob, `recording.${ext}`);
        formData.append("language", interviewData?.language || "en");

        const res = await fetch(`${SUPABASE_URL}/functions/v1/whisper-transcribe`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
          body: formData,
        });

        if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);

        const { text } = await res.json();
        if (text?.trim()) {
          setTranscript((prev) => [...prev, { role: "user", text: text.trim() }]);
          if (!busyRef.current && handleUserTurnRef.current) {
            handleUserTurnRef.current(text.trim());
          }
        } else {
          toast.info("Couldn't hear you clearly — please try again.");
        }
      } catch (e) {
        console.error("Whisper error:", e);
        toast.error("Could not transcribe your speech. Please try again.");
      } finally {
        setIsTranscribing(false);
      }
    };

    recorder.stop();
  }, []);

  // ── Start interview ──
  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Mic + AudioContext in parallel
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        ensureAudioContext(),
      ]);
      mediaStreamRef.current = stream;

      // Pre-warm speech synthesis voices while connecting
      if (window.speechSynthesis) window.speechSynthesis.getVoices();

      setInterviewStarted(true);
      // Kick off the first AI call — no extra credit-check roundtrip needed
      // (orchestrator handles credit deduction on first call and returns 402 if insufficient)
      await callOrchestrator();
    } catch (error) {
      const msg = (error as Error).message;
      if (msg?.includes("Permission") || msg?.includes("NotAllowed") || msg?.includes("NotFound")) {
        toast.error("Microphone access denied. Please allow microphone and try again.");
      } else {
        toast.error("Failed to start. Please check your microphone and try again.");
      }
      console.error("startConversation error:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [callOrchestrator, ensureAudioContext]);

  // ── End interview ──
  const handleEndInterview = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch { /* ok */ }
      try { audioSourceRef.current.disconnect(); } catch { /* ok */ }
      audioSourceRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch { /* ok */ }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    track(Events.INTERVIEW_COMPLETED, { phase: currentPhase, questionCount });
    toast.success("Great work! Generating your report...");

    if (id) {
      try {
        await supabase
          .from("interviews")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", id);

        supabase.functions
          .invoke("generate-report", { body: { interviewId: id } })
          .then(({ error: e }) => { if (e) console.error("Report generation failed:", e); });
      } catch (e) {
        console.error("End interview error:", e);
      }
    }

    navigate(`/report/${id || "demo"}`);
  }, [navigate, id, currentPhase, questionCount]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Status label ──
  const statusLabel = processing && !firstCallDoneRef.current
    ? "Your interview is starting, please wait..."
    : isTranscribing
    ? "Transcribing your answer..."
    : isPTTActive
    ? "Speaking... (click or press SPACE to stop)"
    : processing
    ? "AI is thinking..."
    : aiSpeaking
    ? "Interviewer is speaking..."
    : "Click mic button or press SPACE to start speaking";

  const orbState: "idle" | "listening" | "thinking" | "speaking" =
    aiSpeaking ? "speaking"
    : processing || isTranscribing ? "thinking"
    : isPTTActive ? "listening"
    : "idle";

  // ── Insufficient credits screen ──
  if (insufficientCredits) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <div className="relative max-w-md overflow-hidden rounded-3xl border-2 border-ink bg-card p-10">
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral/20">
              <span className="text-3xl">💳</span>
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">Out of Credits</h2>
            <p className="mb-8 font-body text-sm text-muted-foreground">
              You need at least 1 credit to start an interview.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/pricing" className="neo-btn bg-primary text-primary-foreground">
                Buy Credits <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/dashboard" className="neo-btn bg-background text-foreground">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafb]">
      {/* Google Meet-style top bar */}
      <InterviewTopBar
        timeLeft={timeLeft}
        formatTime={formatTime}
        interviewStarted={interviewStarted}
        onEnd={handleEndInterview}
        phase={currentPhase}
        questionCount={questionCount}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4">
        {!interviewStarted ? (
          /* ─── PRE-INTERVIEW LOBBY ─── */
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="rounded-3xl border-2 border-ink bg-card p-12 shadow-lg">
              <AIOrb state="idle" size={140} />
            </div>
            <div className="max-w-lg">
              <h1 className="mb-2 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Ready when you are
              </h1>
              {interviewData && (
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="neo-badge bg-primary/10 text-primary">
                    {interviewData.role}
                  </span>
                  <span className="neo-badge bg-muted text-muted-foreground">
                    {interviewData.level}
                  </span>
                </div>
              )}
              {/* Interview structure preview */}
              <div className="mb-4 flex items-center justify-center gap-1 text-muted-foreground text-[11px] font-heading font-semibold uppercase tracking-wider">
                {["Opening", "Technical", "Behavioral", "Situational", "Closing"].map((s, i, arr) => (
                  <span key={s} className="flex items-center gap-1">
                    <span>{s}</span>
                    {i < arr.length - 1 && <span className="text-muted-foreground/30">→</span>}
                  </span>
                ))}
              </div>
              <p className="mx-auto max-w-sm font-body text-sm leading-relaxed text-muted-foreground">
                A real-time AI voice interview. Click the mic or press spacebar to toggle recording.
              </p>
            </div>

            <button
              onClick={startConversation}
              disabled={isConnecting}
              className="neo-btn bg-primary text-primary-foreground px-10 py-4 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
            >
              {isConnecting ? (
                <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Connecting...</>
              ) : (
                <><Sparkles className="h-5 w-5" /> Start Interview</>
              )}
            </button>

            <p className="font-body text-[11px] text-muted-foreground">Make sure your microphone is enabled</p>
          </div>
        ) : (
          /* ─── LIVE INTERVIEW (Google Meet layout) ─── */
          <div className="flex w-full max-w-5xl flex-1 gap-4 py-4">
            {/* Main area: AI Orb (like the video feed area) */}
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-ink/10 bg-card shadow-sm">
              <AIOrb state={orbState} size={200} />
              <p className="mt-4 font-body text-sm text-muted-foreground">{statusLabel}</p>

              {/* TTS text fallback */}
              {textFallback && (
                <div className="mx-4 mt-4 max-w-xl rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <VolumeX className="h-4 w-4 text-primary/70" />
                    <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-primary/70">Audio unavailable — read below</span>
                  </div>
                  <p className="font-body text-sm leading-relaxed text-foreground/80">{textFallback}</p>
                </div>
              )}
            </div>

            {/* Sidebar: Transcript (like the chat panel) */}
            <div className="flex w-80 flex-col rounded-2xl border-2 border-ink/10 bg-card shadow-sm">
              <div className="border-b border-ink/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                  <span className="font-heading text-xs font-bold uppercase tracking-widest text-muted-foreground">Transcript</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {transcript.length === 0 ? (
                    <p className="py-8 text-center font-body text-xs text-muted-foreground">Conversation will appear here...</p>
                  ) : (
                    transcript.slice(-8).map((t, i) => (
                      <div key={i} className="flex gap-2">
                        <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${t.role === "ai" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
                          {t.role === "ai" ? "AI" : "Y"}
                        </span>
                        <p className={`font-body text-sm leading-relaxed ${t.role === "ai" ? "text-foreground" : "text-muted-foreground"}`}>
                          {t.text}
                        </p>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls bar (Google Meet style) */}
      {interviewStarted && (
        <div className="relative z-10 flex items-center justify-center gap-5 border-t-2 border-ink/10 bg-card py-5">
          {/* PTT toggle button */}
          <button
            onClick={() => {
              if (isPTTActive) {
                stopPTT();
              } else {
                startPTT();
              }
            }}
            disabled={processing || isTranscribing}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all select-none ${
              isPTTActive
                ? "bg-accent ring-4 ring-accent/30 scale-110 shadow-lg shadow-accent/20"
                : isTranscribing
                ? "bg-muted text-muted-foreground cursor-wait"
                : processing
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed"
                : "bg-foreground/10 text-foreground hover:bg-foreground/20 hover:shadow-md"
            }`}
            title={isPTTActive ? "Stop recording (or press SPACE)" : "Start recording (or press SPACE)"}
          >
            {isTranscribing
              ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              : <Mic className={`h-6 w-6 ${isPTTActive ? "text-white" : ""}`} />
            }
            {isPTTActive && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-pulse" />}
          </button>

          <button
            onClick={handleEndInterview}
            className="neo-btn bg-destructive text-white px-6 py-3"
          >
            <PhoneOff className="h-4 w-4" />
            End
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveInterview;
