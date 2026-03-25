import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Zap } from "lucide-react";

interface Achievement {
  id: string;
  label: string;
  emoji: string;
  description: string;
  condition: (stats: {
    totalInterviews: number;
    bestScore: number;
    completedToday: number;
    totalScore: number;
  }) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_interview",
    label: "First Step",
    emoji: "🎯",
    description: "Complete your first interview",
    condition: (stats) => stats.totalInterviews >= 1,
  },
  {
    id: "five_interviews",
    label: "Practice Pro",
    emoji: "📚",
    description: "Complete 5 interviews",
    condition: (stats) => stats.totalInterviews >= 5,
  },
  {
    id: "high_score",
    label: "Elite Performer",
    emoji: "🏆",
    description: "Score 80 or higher",
    condition: (stats) => stats.bestScore >= 80,
  },
  {
    id: "consistent",
    label: "Streaker",
    emoji: "🔥",
    description: "Complete 3 interviews in one day",
    condition: (stats) => stats.completedToday >= 3,
  },
  {
    id: "perfect_day",
    label: "Master Class",
    emoji: "👑",
    description: "Average 75+ across 3 interviews",
    condition: (stats) => stats.totalInterviews >= 3 && stats.totalScore / stats.totalInterviews >= 75,
  },
  {
    id: "ten_interviews",
    label: "Interview Master",
    emoji: "⭐",
    description: "Complete 10 interviews",
    condition: (stats) => stats.totalInterviews >= 10,
  },
];

const Achievements = () => {
  const { user } = useAuth();

  const { data: reportList = [] } = useQuery({
    queryKey: ["reports_achievements", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("overall_score, created_at")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const stats = {
    totalInterviews: reportList.length,
    bestScore: reportList.length > 0 ? Math.max(...reportList.map((r: any) => r.overall_score || 0)) : 0,
    completedToday: reportList.filter((r: any) => {
      const today = new Date();
      const reportDate = new Date(r.created_at);
      return reportDate.toDateString() === today.toDateString();
    }).length,
    totalScore: reportList.reduce((acc: number, r: any) => acc + (r.overall_score || 0), 0),
  };

  const unlockedAchievements = ACHIEVEMENTS.filter((a) => a.condition(stats));
  const lockedAchievements = ACHIEVEMENTS.filter((a) => !a.condition(stats));

  if (ACHIEVEMENTS.length === 0) {
    return null;
  }

  return (
    <div className="neo-card mb-8 bg-card p-6">
      <h3 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Achievements
      </h3>

      {/* Unlocked */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🎉 Unlocked ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {unlockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-start gap-3 rounded-lg border-2 border-success/30 bg-success/10 p-3 backdrop-blur-sm transition-all hover:border-success/50 hover:bg-success/15"
              >
                <span className="text-2xl">{achievement.emoji}</span>
                <div>
                  <div className="font-heading text-sm font-bold text-success">{achievement.label}</div>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {lockedAchievements.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🔒 Locked ({lockedAchievements.length} more to unlock)
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {lockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-start gap-3 rounded-lg border-2 border-muted/20 bg-muted/5 p-3 opacity-50 backdrop-blur-sm"
              >
                <span className="text-2xl grayscale">{achievement.emoji}</span>
                <div>
                  <div className="font-heading text-sm font-bold text-muted-foreground">{achievement.label}</div>
                  <p className="text-xs text-muted-foreground/70">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {unlockedAchievements.length > 0 && (
        <div className="mt-6 pt-6 border-t border-muted/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Progress</p>
            <p className="text-sm font-bold text-primary">
              {unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{
                width: `${(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;
