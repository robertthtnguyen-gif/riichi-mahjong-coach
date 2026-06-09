import { AppMenu } from '@/components/app/AppMenu';

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <header className="border-b border-cyan-500/10 bg-[#07111b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">History</h1>
            <p className="text-sm text-cyan-100/70">Saved hand logs and round review can live here next.</p>
          </div>
          <AppMenu />
        </div>
      </header>

      <main className="mx-auto max-w-screen-4xl px-4 py-6">
        <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-6">
          <p className="text-sm text-gray-300">
            History is not implemented yet. The gameplay screen now prioritizes live play, and all yaku learning content has moved to Help.
          </p>
        </div>
      </main>
    </div>
  );
}
