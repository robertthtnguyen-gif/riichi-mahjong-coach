import { Opponent, OpponentPosition, Tile } from '@/lib/types';
import { OpponentPanel } from './OpponentPanel';

interface OpponentTrackingProps {
  opponents: Opponent[];
  onDiscard: (position: OpponentPosition, tile: Tile) => void;
  onRiichi: (position: OpponentPosition) => void;
}

export function OpponentTracking({ opponents, onDiscard, onRiichi }: OpponentTrackingProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Opponent Tracking
      </h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
        {opponents.map(opponent => (
          <OpponentPanel
            key={opponent.position}
            opponent={opponent}
            onDiscard={onDiscard}
            onRiichi={onRiichi}
          />
        ))}
      </div>
    </div>
  );
}
