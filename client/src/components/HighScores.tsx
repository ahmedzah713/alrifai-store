import { Card } from '@/components/ui/card';
import { usePi } from '@/contexts/PiContext';
import { Trophy, Medal } from 'lucide-react';

export default function HighScores() {
  const { highScores } = usePi();

  if (highScores.length === 0) {
    return (
      <Card className="bg-white/5 border-purple-400/30 text-purple-200 p-6 text-center">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No scores yet. Play to get on the leaderboard!</p>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-purple-400/30 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h2 className="text-2xl font-bold text-white">Top 10 Scores</h2>
      </div>

      <div className="space-y-2">
        {highScores.map((score, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              {index === 0 && <Trophy className="w-5 h-5 text-yellow-400" />}
              {index === 1 && <Medal className="w-5 h-5 text-gray-400" />}
              {index === 2 && <Medal className="w-5 h-5 text-orange-400" />}
              {index > 2 && <span className="w-5 text-center text-purple-300">#{index + 1}</span>}
              <div>
                <p className="text-white font-semibold">{score.username}</p>
                <p className="text-xs text-purple-300">
                  {new Date(score.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{score.score}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
