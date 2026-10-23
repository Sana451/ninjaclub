export type GameKeys = { up: string[]; down: string[] }
export type GameResult = { rings: number; dist: number }
export type GameOptions = {
  manual?: boolean
  keys?: GameKeys
  seed?: number
  onEnd?: (result: GameResult) => void
  name?: string
}
export type GameController = {
  start: () => void
  stop: () => void
  dispose: () => void
}
export function mountGame(root: HTMLElement, opts?: GameOptions): GameController
