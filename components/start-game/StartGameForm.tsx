'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WindSelector } from './WindSelector';
import { RoundSelector } from './RoundSelector';
import { BooleanToggle } from './BooleanToggle';
import { HandInput } from './HandInput';
import { RoundId, WindValue, StartGameData, Tile } from '@/lib/types';
import { validateHandInput, validateSingleTile } from '@/lib/tileValidator';

export function StartGameForm() {
  const router = useRouter();

  const [seatWind, setSeatWind] = useState<WindValue | ''>('');
  const [roundId, setRoundId] = useState<RoundId | ''>('');
  const [doraIndicatorStr, setDoraIndicatorStr] = useState('');
  const [redFivesEnabled, setRedFivesEnabled] = useState(true);
  const [openTanyaoEnabled, setOpenTanyaoEnabled] = useState(true);
  const [startingHandStr, setStartingHandStr] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!seatWind || !roundId) {
      setSubmitError('Choose your seat and the current round before starting.');
      return;
    }

    const handResult = validateHandInput(startingHandStr, redFivesEnabled);
    if (!handResult.valid) {
      setSubmitError('Fix the hand validation errors before starting.');
      return;
    }

    let doraTiles: Tile[] = [];
    if (doraIndicatorStr.trim()) {
      const doraResult = validateSingleTile(doraIndicatorStr);
      if (!doraResult.valid) {
        setSubmitError(`Invalid dora indicator: ${doraResult.errors.join(', ')}`);
        return;
      }
      doraTiles = doraResult.tiles;
    }

    const gameData: StartGameData = {
      seatWind,
      roundId,
      doraIndicatorStr,
      redFivesEnabled,
      openTanyaoEnabled,
      startingHandStr,
    };

    try {
      sessionStorage.setItem('rmj_game_data', JSON.stringify(gameData));
      sessionStorage.setItem('rmj_hand_tiles', JSON.stringify(handResult.tiles));
      sessionStorage.setItem('rmj_dora_tiles', JSON.stringify(doraTiles));
    } catch {
      setSubmitError('Failed to save game data. Please try again.');
      return;
    }

    setIsSubmitting(true);
    router.push('/game');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <WindSelector
        label="My Seat"
        value={seatWind}
        onChange={wind => setSeatWind(wind)}
        options={['east', 'south', 'west', 'north']}
      />

      <RoundSelector value={roundId} onChange={setRoundId} />

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Dora Indicator</label>
        <input
          type="text"
          value={doraIndicatorStr}
          onChange={e => setDoraIndicatorStr(e.target.value)}
          placeholder="e.g. 5m"
          className="w-full rounded-lg border-2 border-gray-300 p-3 font-mono text-sm focus:border-emerald-400 focus:outline-none"
        />
        <p className="text-xs text-gray-500">Enter a single tile notation (optional)</p>
      </div>

      <BooleanToggle
        label="Red Fives Enabled?"
        value={redFivesEnabled}
        onChange={setRedFivesEnabled}
      />

      <BooleanToggle
        label="Open Tanyao Enabled?"
        value={openTanyaoEnabled}
        onChange={setOpenTanyaoEnabled}
      />

      <HandInput
        value={startingHandStr}
        onChange={setStartingHandStr}
        redFivesEnabled={redFivesEnabled}
        onValidTiles={() => {}}
      />

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {isSubmitting ? 'Starting…' : 'Start Game'}
      </button>
    </form>
  );
}
