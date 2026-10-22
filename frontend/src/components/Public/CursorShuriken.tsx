import { useEffect, useRef } from "react"

const SHURIKEN_PATH =
  "M50 2 61 39 98 50 61 61 50 98 39 61 2 50 39 39Z M50 38a12 12 0 1 0 .01 0Z"

export function CursorShuriken() {
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    let x = 0
    let y = 0
    let targetX = 0
    let targetY = 0
    let frame = 0

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      cursor.style.opacity = "1"
    }

    const loop = () => {
      x += (targetX - x) * 0.18
      y += (targetY - y) * 0.18
      cursor.style.transform = `translate(${x + 10}px, ${y + 10}px)`
      frame = requestAnimationFrame(loop)
    }

    window.addEventListener("mousemove", onMove)
    frame = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={cursorRef} className="nk-cur" aria-hidden="true">
      <svg
        className="nk-shuriken nk-shuriken--spin"
        width="22"
        height="22"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path fill="currentColor" fillRule="evenodd" d={SHURIKEN_PATH} />
      </svg>
    </div>
  )
}
