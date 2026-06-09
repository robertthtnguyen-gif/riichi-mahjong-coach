// lib/tileValidator.ts

import { DragonValue, Tile, WindValue } from './types';
import { parseTileNotation } from './tileParser';

export interface ValidationResult {
  valid: boolean;
  tiles: Tile[];
  errors: string[];
}

function getTileCopyKey(tile: Tile): string {
  return `${tile.suit}:${tile.value}`;
}

function getTileLabel(tile: Tile): string {
  if (tile.suit === 'man' || tile.suit === 'pin' || tile.suit === 'sou') {
    const suffix = tile.suit === 'man' ? 'm' : tile.suit === 'pin' ? 'p' : 's';
    return `${tile.value}${suffix}`;
  }

  if (tile.suit === 'wind') {
    const labels: Record<WindValue, string> = {
      east: 'E',
      south: 'S',
      west: 'W',
      north: 'N',
    };
    return labels[tile.value as WindValue];
  }

  const labels: Record<DragonValue, string> = {
    red: 'R',
    green: 'G',
    white: 'Wh',
  };
  return labels[tile.value as DragonValue];
}

function validateTileCopies(tiles: Tile[]): string[] {
  const counts = new Map<string, { count: number; label: string }>();

  for (const tile of tiles) {
    const key = getTileCopyKey(tile);
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { count: 1, label: getTileLabel(tile) });
    }
  }

  return [...counts.values()]
    .filter(entry => entry.count > 4)
    .map(entry => `Too many copies of ${entry.label} (${entry.count}). Maximum is 4.`);
}

function validateHandWithExpectedCount(
  input: string,
  redFivesEnabled: boolean,
  expectedTileCount: number,
  handLabel: string
): ValidationResult {
  if (!input.trim()) {
    return { valid: false, tiles: [], errors: [`${handLabel} is required.`] };
  }

  let tiles: Tile[];
  try {
    tiles = parseTileNotation(input);
  } catch (e) {
    return { valid: false, tiles: [], errors: [(e as Error).message] };
  }

  const errors: string[] = [];

  if (tiles.length !== expectedTileCount) {
    errors.push(`Hand must have exactly ${expectedTileCount} tiles (found ${tiles.length}).`);
  }

  if (!redFivesEnabled && tiles.some(t => t.isRed)) {
    errors.push('Red fives (0m/0p/0s) are not enabled in this game.');
  }

  errors.push(...validateTileCopies(tiles));

  return { valid: errors.length === 0, tiles, errors };
}

export function validateHandInput(input: string, redFivesEnabled: boolean): ValidationResult {
  return validateHandWithExpectedCount(input, redFivesEnabled, 13, 'Starting hand');
}

export function validateStartingHand(
  input: string,
  redFivesEnabled: boolean,
  expectedTileCount: 13 | 14 = 13
): ValidationResult {
  return validateHandWithExpectedCount(input, redFivesEnabled, expectedTileCount, 'Starting hand');
}

export function validateDrawnHand(input: string, redFivesEnabled: boolean): ValidationResult {
  return validateHandWithExpectedCount(input, redFivesEnabled, 14, 'Drawn hand');
}

export function validateSingleTile(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: false, tiles: [], errors: ['Tile notation is required.'] };
  }

  let tiles: Tile[];
  try {
    tiles = parseTileNotation(input);
  } catch (e) {
    return { valid: false, tiles: [], errors: [(e as Error).message] };
  }

  if (tiles.length !== 1) {
    return {
      valid: false,
      tiles,
      errors: [`Expected exactly 1 tile, found ${tiles.length}.`],
    };
  }

  return { valid: true, tiles, errors: [] };
}
