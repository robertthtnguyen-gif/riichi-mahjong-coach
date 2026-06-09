import { Opponent, OpponentPosition, Tile } from '@/lib/types';
import { OpponentPanel } from './OpponentPanel';

interface OpponentTrackingProps {
  opponents: Opponent[];
  onDiscard: (position: OpponentPosition, tile: Tile) => void;
  onRiichi: (position: OpponentPosition) => void;
  collapsed?: boolean;
}

export function OpponentTracking({
  opponents,
  onDiscard,
  onRiichi,
  collapsed = false,
}: OpponentTrackingProps) {
  const content = (
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
  );

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Opponent Tracking
      </h2>
      {collapsed ? (
        <details>
          <summary className="cursor-pointer list-none rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm font-medium text-white">
            Show opponent details
          </summary>
          <div className="mt-3">{content}</div>
        </details>
      ) : (
        content
      )}
    </div>
  );
}
