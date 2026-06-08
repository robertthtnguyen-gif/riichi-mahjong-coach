import { StartGameForm } from '@/components/start-game/StartGameForm';

export default function StartGamePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-gray-900 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Riichi Mahjong Coach
          </h1>
          <p className="mt-2 text-emerald-300 text-sm">
            Set up your game to begin coaching
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <StartGameForm />
        </div>
      </div>
    </div>
  );
}
