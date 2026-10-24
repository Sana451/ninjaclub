export type SfxName =
  | "start"
  | "jump"
  | "land"
  | "zip"
  | "ring"
  | "hit"
  | "tick"
  | "add"
  | "remove"
  | "go"
  | "back"
  | "next"

export function sfx(name: SfxName): void
export function music(on: boolean): void
export function say(text: string): void
export function stopAll(): void
export function victory(): void
export function isMuted(): boolean
export function toggleMute(): boolean
