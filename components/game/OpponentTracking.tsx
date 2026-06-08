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
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Opponent Tracking
      </h2>
      {opponents.map(opponent => (
        <OpponentPanel
          key={opponent.position}
          opponent={opponent}
          onDiscard={onDiscard}
          onRiichi={onRiichi}
        />
      ))}
    </div>
  );
}
