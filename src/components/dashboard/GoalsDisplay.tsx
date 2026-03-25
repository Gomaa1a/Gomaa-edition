import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, AlertCircle } from "lucide-react";

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
    return null;
  }

  return (
    <div className="neo-card mb-8 bg-accent/10 p-6">
      <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
        <Target className="h-5 w-5 text-accent" />
        Your Goals
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {validGoals.map((goal: string) => (
          <div
            key={goal}
            className="flex items-center gap-3 rounded-lg border-2 border-accent/20 bg-accent/5 p-3 backdrop-blur-sm"
          >
            <span className="text-2xl">{GOAL_EMOJIS[goal] || "✨"}</span>
            <span className="font-body text-sm font-semibold text-foreground">
              {GOAL_LABELS[goal]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        Keep practicing interviews to achieve your goals! Each interview brings you closer.
      </p>
    </div>
  );
};

export default GoalsDisplay;
