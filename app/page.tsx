import { StartGameForm } from '@/components/start-game/StartGameForm';

export default function StartGamePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-gray-900 flex items-start justify-center px-3 py-6 sm:px-4 sm:py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center sm:mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Riichi Mahjong Coach
          </h1>
          <p className="mt-2 text-sm text-emerald-300">
            Set up your game to begin coaching
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-2xl sm:p-8">
          <StartGameForm />
        </div>
      </div>
    </div>
  );
}
