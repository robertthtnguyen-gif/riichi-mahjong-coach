import { GameConfig, Player } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface GameInfoProps {
  player: Player;
  config: GameConfig;
}

const WIND_LABELS: Record<string, string> = {
  east: 'East',
  south: 'South',
  west: 'West',
  north: 'North',
};

export function GameInfo({ player, config }: GameInfoProps) {
  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Game Info</h2>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Round Wind</p>
          <p className="font-semibold text-white">{WIND_LABELS[config.roundWind]}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Seat Wind</p>
          <p className="font-semibold text-white">{WIND_LABELS[player.seatWind]}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Dealer</p>
          <p className="font-semibold text-white">{player.isDealer ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Red Fives</p>
          <p className="font-semibold text-white">{config.redFivesEnabled ? 'On' : 'Off'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Open Tanyao</p>
          <p className="font-semibold text-white">{config.openTanyaoEnabled ? 'On' : 'Off'}</p>
        </div>
      </div>

      <div>
        <p className="text-gray-400 text-xs mb-1.5">Dora Indicator</p>
        {config.doraTiles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {config.doraTiles.map(tile => (
              <TileDisplay key={tile.id} tile={tile} size="sm" />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic text-xs">Not set</p>
        )}
      </div>

      {player.melds.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs mb-1.5">Open Melds</p>
          <div className="space-y-1.5">
            {player.melds.map((meld, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="w-8 text-xs uppercase text-gray-500">{meld.type}</span>
                <div className="flex flex-wrap gap-1">
                  {meld.tiles.map(tile => (
                    <TileDisplay key={tile.id} tile={tile} size="xs" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
