import { useRef, useState } from "react";
import { Download, Linkedin, Facebook, Twitter, Instagram } from "lucide-react";

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

    // Modern gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGrad.addColorStop(0, "#6366f1");
    bgGrad.addColorStop(0.5, "#3b82f6");
    bgGrad.addColorStop(1, "#06b6d4");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Add pattern overlay
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = 120;
    patternCanvas.height = 120;
    const patternCtx = patternCanvas.getContext("2d")!;
    patternCtx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 120; i += 15) {
      patternCtx.beginPath();
      patternCtx.arc(i, i, 8, 0, Math.PI * 2);
      patternCtx.fill();
    }
    const pattern = ctx.createPattern(patternCanvas, "repeat")!;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, 1080, 1080);

    // Top badge
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, 0, 1080, 160);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.font = "bold 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("🚀 I ACED MY INTERVIEW 🚀", 540, 110);

    // Certificate-like border
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 180, 960, 720);

    // Inner decorative border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 200, 920, 680);

    // Achievement badge (tier based on score)
    const getAchievementTier = (score: number) => {
      if (score >= 90) return { emoji: "🏆", tier: "ELITE", color: "#FFD700" };
      if (score >= 80) return { emoji: "⭐", tier: "ADVANCED", color: "#C0C0C0" };
      if (score >= 70) return { emoji: "🎯", tier: "PROFICIENT", color: "#CD7F32" };
      return { emoji: "✨", tier: "DEVELOPING", color: "#87CEEB" };
    };

    const achievement = getAchievementTier(props.overallScore);

    // Tier badge
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${achievement.emoji} ${achievement.tier} ${achievement.emoji}`, 540, 270);

    // Role and level
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "600 28px system-ui";
    ctx.fillText(props.role, 540, 330);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 20px system-ui";
    ctx.fillText("Interview Performance", 540, 365);

    // Big score with glow effect
    ctx.fillStyle = achievement.color;
    ctx.font = "900 140px system-ui";
    ctx.fillText(`${props.overallScore}`, 540, 510);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 36px system-ui";
    ctx.fillText("/ 100", 540, 550);

    // Score breakdown bars - more modern style
    const scores = [
      { label: "💬 Communication", value: props.commScore },
      { label: "🎯 Clarity", value: props.clarityScore },
      { label: "💪 Confidence", value: props.confScore },
      { label: "📐 Structure", value: props.structScore },
    ];

    const barStartY = 600;
    const barH = 28;
    const barGap = 65;
    const barX = 150;
    const barW = 780;

    scores.forEach((s, i) => {
      const y = barStartY + i * barGap;
      
      // Label with emoji
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 20px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(s.label, barX, y + 6);
      
      // Value
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 20px system-ui";
      ctx.fillText(`${Math.round(s.value / 10)}/10`, barX + barW + 20, y + 6);
      
      // Bar background with blur effect
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(barX, y - 10, barW, barH, 12);
      ctx.fill();
      
      // Bar fill with gradient
      const fillGrad = ctx.createLinearGradient(barX, y - 10, barX + barW, y - 10);
      fillGrad.addColorStop(0, "rgba(255,255,255,0.8)");
      fillGrad.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(barX, y - 10, (barW * s.value) / 100, barH, 12);
      ctx.fill();
    });

    // Footer call-to-action
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("CAN YOU BEAT MY SCORE?", 540, 1000);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 22px system-ui";
    ctx.fillText("Powered by HireReady AI 🤖", 540, 1035);

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
      icon: Linkedin,
      onClick: () => window.open(shareLinks.linkedin, "_blank", "width=600,height=600"),
      className: "bg-[#0A66C2] hover:bg-[#004182] text-white",
    },
    {
      label: "Facebook",
      icon: Facebook,
      onClick: () => window.open(shareLinks.facebook, "_blank", "width=600,height=600"),
      className: "bg-[#1877F2] hover:bg-[#0d5bbf] text-white",
    },
    {
      label: "X (Twitter)",
      icon: Twitter,
      onClick: () => window.open(shareLinks.twitter, "_blank", "width=600,height=600"),
      className: "bg-foreground hover:bg-foreground/80 text-background",
    },
    {
      label: "Instagram",
      icon: Instagram,
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
