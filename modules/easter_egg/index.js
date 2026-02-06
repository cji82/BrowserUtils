/**
 * 이스터에그 게임 모듈 진입점
 */

import { SudokuGame } from './sudoku.js';
import { Puzzle15Game } from './puzzle15.js';
import { MemoryGame } from './memory.js';
import { TictactoeGame } from './tictactoe.js';
import { MinesweeperGame } from './minesweeper.js';
import { Game2048 } from './game2048.js';

export { SudokuGame } from './sudoku.js';
export { Puzzle15Game } from './puzzle15.js';
export { MemoryGame } from './memory.js';
export { TictactoeGame } from './tictactoe.js';
export { MinesweeperGame } from './minesweeper.js';
export { Game2048 } from './game2048.js';

/** featureId -> Game (popup에서 뷰 표시 시 해당 게임 init 호출용) */
export const GAME_REGISTRY = {
  sudoku: SudokuGame,
  puzzle15: Puzzle15Game,
  memory: MemoryGame,
  tictactoe: TictactoeGame,
  minesweeper: MinesweeperGame,
  game2048: Game2048
};
