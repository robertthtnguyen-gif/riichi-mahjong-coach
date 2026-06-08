// lib/tileValidator.ts

import { Tile } from './types';
import { parseTileNotation } from './tileParser';

export interface ValidationResult {
  valid: boolean;
  tiles: Tile[];
  errors: string[];
}

export function validateHandInput(input: string, redFivesEnabled: boolean): ValidationResult {
  if (!input.trim()) {
    return { valid: false, tiles: [], errors: ['Starting hand is required.'] };
  }

  let tiles: Tile[];
  try {
    tiles = parseTileNotation(input);
  } catch (e) {
    return { valid: false, tiles: [], errors: [(e as Error).message] };
  }

  const errors: string[] = [];

  if (tiles.length !== 13) {
    errors.push(`Hand must have exactly 13 tiles (found ${tiles.length}).`);
  }

  if (!redFivesEnabled && tiles.some(t => t.isRed)) {
    errors.push('Red fives (0m/0p/0s) are not enabled in this game.');
  }

  return { valid: errors.length === 0, tiles, errors };
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
