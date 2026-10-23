export type GameKeys = { up: string[]; down: string[] }
export type GameResult = { rings: number; dist: number }
export type GameOptions = {
  manual?: boolean
  keys?: GameKeys
  seed?: number
  duel?: boolean
  onEnd?: (result: GameResult) => void
  name?: string
  filter?: string
  look?: {
    boy: boolean
    pal: Partial<Record<string, string>>
    cap?: string
    horns?: boolean
  }
}
export type GameController = {
  start: () => void
  stop: () => void
  dispose: () => void
}
export function mountGame(root: HTMLElement, opts?: GameOptions): GameController
