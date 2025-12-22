import React from 'react';
import { Trophy, Target, Clock, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useChallenges } from '@/hooks/useChallenges';

interface ChallengesSectionProps {
  city?: string;
}

const ChallengesSection = ({ city }: ChallengesSectionProps) => {
  const { challenges, loading } = useChallenges(city);

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Clock className="w-4 h-4" />;
      case 'weekly': return <Target className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getChallengeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'from-blue-500 to-cyan-500';
      case 'weekly': return 'from-purple-500 to-pink-500';
      case 'seasonal': return 'from-orange-500 to-red-500';
      default: return 'from-green-500 to-emerald-500';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (challenges.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-lg mb-2">No Active Challenges</h3>
        <p className="text-sm text-muted-foreground">Check back soon for new challenges!</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-bold">Active Challenges</h3>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => {
          const progress = challenge.progress?.current_count || 0;
          const progressPercent = Math.min(100, (progress / challenge.target_count) * 100);
          const isCompleted = challenge.progress?.completed || false;

          return (
            <div
              key={challenge.id}
              className={`relative overflow-hidden rounded-lg border p-4 transition-all ${
                isCompleted ? 'bg-muted/50 border-primary' : 'bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getChallengeColor(challenge.challenge_type)} text-white flex-shrink-0`}>
                  {getChallengeIcon(challenge.challenge_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {challenge.title}
                        {isCompleted && <Award className="w-4 h-4 text-primary" />}
                      </h4>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-primary">+{challenge.reward_points}</div>
                      <div className="text-xs text-muted-foreground">XP</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progress} / {challenge.target_count}</span>
                      <span>{progressPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  {challenge.city && (
                    <div className="mt-2 inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      📍 {challenge.city}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ChallengesSection;
