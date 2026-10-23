export function palette(): Record<string, string>
export function headPortrait(
  c: CanvasRenderingContext2D,
  base: Record<string, string>,
  look?: {
    boy?: boolean
    pal?: Partial<Record<string, string>>
    cap?: string
    horns?: boolean
  },
): void
