import { useRef, useState } from "react";
import { Download, Share2, ExternalLink } from "lucide-react";

interface ShareResultsProps {
  overallScore: number;
  confScore: number;
  clarityScore: number;
  structScore: number;
  commScore: number;
  role: string;
  date: string;
}

const generateShareText = (props: ShareResultsProps) => {
  const conf10 = Math.round(props.confScore / 10);
  const clarity10 = Math.round(props.clarityScore / 10);
  const story10 = Math.round(props.structScore / 10);
  const comm10 = Math.round(props.commScore / 10);

  const tier = props.overallScore >= 90 ? "🏆 ELITE" : 
               props.overallScore >= 80 ? "⭐ ADVANCED" : 
               props.overallScore >= 70 ? "🎯 PROFICIENT" : "✨ DEVELOPING";

  return `I just scored ${props.overallScore}/100 on an AI mock interview! 🎉

${tier} Performance for ${props.role}

📊 Breakdown:
💬 Communication: ${comm10}/10
🎯 Clarity: ${clarity10}/10
💪 Confidence: ${conf10}/10
📐 Structure: ${story10}/10

Can you beat my score? 🔥

Try it now: https://hireready.ai`;
};

const generateShareCard = (props: ShareResultsProps): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;

    // ── Rich dark gradient background ──
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGrad.addColorStop(0, "#0f0d1a");
    bgGrad.addColorStop(0.4, "#1a1040");
    bgGrad.addColorStop(0.7, "#0d1f3c");
    bgGrad.addColorStop(1, "#0a0a14");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // ── Ambient glow blobs ──
    const drawBlob = (x: number, y: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    drawBlob(200, 200, 300, "rgba(99,102,241,0.12)");
    drawBlob(880, 400, 350, "rgba(168,85,247,0.10)");
    drawBlob(540, 900, 280, "rgba(34,211,238,0.08)");

    // ── Top section: Logo + tier badge ──
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 28px 'Space Grotesk', system-ui";
    ctx.textAlign = "center";
    ctx.fillText("HireReady", 540, 80);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "600 14px 'Inter', system-ui";
    ctx.fillText("AI MOCK INTERVIEW SCORECARD", 540, 110);

    // ── Tier badge ──
    const getTier = (score: number) => {
      if (score >= 90) return { emoji: "🏆", label: "ELITE", gradient: ["#FFD700", "#F59E0B"] };
      if (score >= 80) return { emoji: "⭐", label: "ADVANCED", gradient: ["#A78BFA", "#7C3AED"] };
      if (score >= 70) return { emoji: "🎯", label: "PROFICIENT", gradient: ["#60A5FA", "#3B82F6"] };
      return { emoji: "✨", label: "DEVELOPING", gradient: ["#34D399", "#10B981"] };
    };
    const tier = getTier(props.overallScore);

    // Tier pill
    const pillW = 220, pillH = 44, pillX = 540 - pillW / 2, pillY = 130;
    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    pillGrad.addColorStop(0, tier.gradient[0]);
    pillGrad.addColorStop(1, tier.gradient[1]);
    ctx.fillStyle = pillGrad;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 22);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px 'Space Grotesk', system-ui";
    ctx.fillText(`${tier.emoji}  ${tier.label}`, 540, pillY + 29);

    // ── Central score ring ──
    const cx = 540, cy = 360, outerR = 130, innerR = 105;
    // Track ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.lineWidth = outerR - innerR;
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.stroke();
    // Score arc
    const pct = props.overallScore / 100;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + pct * Math.PI * 2;
    const arcGrad = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR);
    arcGrad.addColorStop(0, tier.gradient[0]);
    arcGrad.addColorStop(1, tier.gradient[1]);
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, startAngle, endAngle);
    ctx.lineWidth = outerR - innerR;
    ctx.lineCap = "round";
    ctx.strokeStyle = arcGrad;
    ctx.stroke();
    // Score number
    ctx.fillStyle = "#fff";
    ctx.font = "900 80px 'Space Grotesk', system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${props.overallScore}`, cx, cy - 8);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 22px 'Inter', system-ui";
    ctx.fillText("/ 100", cx, cy + 42);
    ctx.textBaseline = "alphabetic";

    // ── Role label ──
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 26px 'Space Grotesk', system-ui";
    ctx.fillText(props.role, 540, 530);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "500 16px 'Inter', system-ui";
    ctx.fillText(props.date, 540, 560);

    // ── Score breakdown cards ──
    const scores = [
      { icon: "💬", label: "Communication", value: props.commScore, color: "#60A5FA" },
      { icon: "🎯", label: "Clarity", value: props.clarityScore, color: "#A78BFA" },
      { icon: "💪", label: "Confidence", value: props.confScore, color: "#F472B6" },
      { icon: "📐", label: "Structure", value: props.structScore, color: "#34D399" },
    ];

    const cardW = 210, cardH = 140, cardGap = 22;
    const totalW = cardW * 4 + cardGap * 3;
    const startX = (1080 - totalW) / 2;
    const cardY = 600;

    scores.forEach((s, i) => {
      const x = startX + i * (cardW + cardGap);
      // Card bg
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect(x, cardY, cardW, cardH, 16);
      ctx.fill();
      // Card border
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, cardY, cardW, cardH, 16);
      ctx.stroke();
      // Icon
      ctx.font = "28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(s.icon, x + cardW / 2, cardY + 38);
      // Value
      ctx.fillStyle = s.color;
      ctx.font = "bold 32px 'Space Grotesk', system-ui";
      ctx.fillText(`${Math.round(s.value / 10)}`, x + cardW / 2, cardY + 80);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "600 16px 'Inter', system-ui";
      ctx.fillText("/10", x + cardW / 2 + 24, cardY + 80);
      // Label
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "500 13px 'Inter', system-ui";
      ctx.fillText(s.label, x + cardW / 2, cardY + 118);
    });

    // ── Mini bar charts under each card ──
    scores.forEach((s, i) => {
      const x = startX + i * (cardW + cardGap) + 30;
      const barY = cardY + cardH + 12;
      const barW = cardW - 60, barH = 4;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.roundRect(x, barY, barW, barH, 2);
      ctx.fill();
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.roundRect(x, barY, (barW * s.value) / 100, barH, 2);
      ctx.fill();
    });

    // ── Divider line ──
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, 810);
    ctx.lineTo(940, 810);
    ctx.stroke();

    // ── Motivational CTA ──
    const ctaTexts = [
      { min: 90, text: "Interview mastery unlocked! 🔥" },
      { min: 80, text: "Outstanding performance! 💪" },
      { min: 70, text: "Solid skills — keep leveling up! 🚀" },
      { min: 0, text: "Every interview makes you stronger! ✨" },
    ];
    const cta = ctaTexts.find(c => props.overallScore >= c.min)!;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 28px 'Space Grotesk', system-ui";
    ctx.textAlign = "center";
    ctx.fillText(cta.text, 540, 870);

    // ── Challenge line ──
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 18px 'Inter', system-ui";
    ctx.fillText("Can you beat my score? Try it free →", 540, 920);

    // ── Footer ──
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "600 14px 'Inter', system-ui";
    ctx.fillText("hireready.ai", 540, 1020);

    // Small decorative dots
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(540 - 40 + i * 20, 1050, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    resolve(canvas.toDataURL("image/png"));
  });
};

const ShareResults = (props: ShareResultsProps) => {
  const [downloading, setDownloading] = useState(false);
  const shareText = generateShareText(props);
  const encodedText = encodeURIComponent(shareText);
  const siteUrl = encodeURIComponent("https://hireready.ai");

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${siteUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${siteUrl}&quote=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
  };

  const handleInstagramShare = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateShareCard(props);
      const link = document.createElement("a");
      link.download = "hireready-score.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const buttons = [
    {
      label: "LinkedIn",
      icon: Share2,
      onClick: () => window.open(shareLinks.linkedin, "_blank", "width=600,height=600"),
      className: "bg-[#0A66C2] hover:bg-[#004182] text-white",
    },
    {
      label: "Facebook",
      icon: Share2,
      onClick: () => window.open(shareLinks.facebook, "_blank", "width=600,height=600"),
      className: "bg-[#1877F2] hover:bg-[#0d5bbf] text-white",
    },
    {
      label: "X (Twitter)",
      icon: Share2,
      onClick: () => window.open(shareLinks.twitter, "_blank", "width=600,height=600"),
      className: "bg-foreground hover:bg-foreground/80 text-background",
    },
    {
      label: "Download",
      icon: Download,
      onClick: handleInstagramShare,
      className: "bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 text-white",
    },
  ];

  return (
    <div className="neo-card mb-8 bg-card p-6 md:p-8">
      <div className="mb-6 text-center">
        <h3 className="mb-2 font-heading text-2xl font-bold">Share Your Results 🚀</h3>
        <p className="text-muted-foreground">
          Challenge your friends to beat your AI interview score.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            disabled={btn.label === "Instagram" && downloading}
            className={`neo-btn flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${btn.className}`}
          >
            <btn.icon className="h-5 w-5" />
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        📸 Instagram: Download the share card image and post it to your Stories or Feed.
      </p>
    </div>
  );
};

export default ShareResults;
