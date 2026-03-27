import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const GOAL_EMOJIS: Record<string, string> = {
  get_job: "🚀",
  improve_skills: "📈",
  specific_role: "🎯",
  confidence: "💪",
  promotion: "⭐",
  arabic: "🇪🇬",
  mentor: "🧑‍🏫",
};

const GOAL_LABELS: Record<string, string> = {
  get_job: "Land a job faster",
  improve_skills: "Improve interview skills",
  specific_role: "Prep for a specific role",
  confidence: "Build confidence",
  promotion: "Prepare for a promotion",
  arabic: "Practice in Arabic",
  mentor: "Help students I mentor",
};

const GOAL_TIPS: Record<string, string> = {
  get_job: "Focus on practicing common questions for your target role",
  improve_skills: "Try different interview types to build versatility",
  specific_role: "Set your target role before each interview session",
  confidence: "Repetition is key — the more you practice, the more natural it feels",
  promotion: "Emphasize leadership examples and quantified achievements",
  arabic: "Switch language in settings to practice bilingual interviews",
  mentor: "Share your results with mentees to demonstrate improvement patterns",
};

const GoalsDisplay = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("goals")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const goals = profile?.goals || [];
  const validGoals = goals.filter((g: string) => g !== "skipped" && g in GOAL_LABELS);

  if (validGoals.length === 0) {
    return (
      <div className="neo-card mb-8 bg-muted/50 p-6 text-center">
        <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <h3 className="mb-1 font-heading text-lg font-bold">Set Your Goals</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Tell us what you're preparing for so we can personalize your experience.
        </p>
        <Link to="/onboarding" className="neo-btn bg-primary text-primary-foreground text-sm">
          Set Goals <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="neo-card mb-8 bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold">
          <Target className="h-5 w-5 text-primary" />
          Your Focus Areas
        </h3>
        <Link to="/onboarding" className="text-xs font-semibold text-primary hover:underline">Edit</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {validGoals.map((goal: string) => (
          <div
            key={goal}
            className="rounded-xl border-2 border-ink/10 bg-background p-4 transition-colors hover:border-primary/20"
          >
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                {GOAL_EMOJIS[goal] || "✨"}
              </span>
              <span className="font-heading text-sm font-bold text-foreground">
                {GOAL_LABELS[goal]}
              </span>
            </div>
            <p className="pl-[52px] text-xs leading-relaxed text-muted-foreground">
              {GOAL_TIPS[goal]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalsDisplay;
