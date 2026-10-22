const SHAPES = [
  <path
    key="star"
    fill="currentColor"
    fillRule="evenodd"
    d="M50 2 61 39 98 50 61 61 50 98 39 61 2 50 39 39Z M50 38a12 12 0 1 0 .01 0Z"
  />,
  <circle
    key="ring"
    cx="50"
    cy="50"
    r="34"
    fill="none"
    stroke="currentColor"
    strokeWidth="14"
  />,
  <path
    key="frame"
    fill="currentColor"
    fillRule="evenodd"
    d="M12 12h76v76H12ZM34 40h32v48H34Z"
  />,
  <polygon key="tri" fill="currentColor" points="50,8 94,90 6,90" />,
  <polygon
    key="burst"
    fill="currentColor"
    points="50,4 61,38 97,38 68,59 79,94 50,73 21,94 32,59 3,38 39,38"
  />,
]

const STARS = [
  { left: "2%", top: "12%", width: 300, duration: 30 },
  { left: "74%", top: "26%", width: 460, duration: 40 },
  { left: "4%", top: "66%", width: 240, duration: 34 },
  { left: "82%", top: "74%", width: 220, duration: 26 },
]

const FALLING = [
  { left: "4%", width: 26, duration: 11, delay: -2, shape: 0 },
  { left: "12%", width: 34, duration: 14, delay: -7, shape: 1 },
  { left: "20%", width: 22, duration: 9, delay: -4, shape: 2 },
  { left: "29%", width: 30, duration: 12, delay: -9, shape: 3 },
  { left: "38%", width: 24, duration: 10, delay: -1, shape: 4 },
  { left: "47%", width: 38, duration: 15, delay: -6, shape: 0 },
  { left: "56%", width: 26, duration: 11, delay: -3, shape: 1 },
  { left: "64%", width: 20, duration: 13, delay: -8, shape: 2 },
  { left: "73%", width: 32, duration: 10, delay: -5, shape: 3 },
  { left: "81%", width: 24, duration: 12, delay: -10, shape: 4 },
  { left: "90%", width: 36, duration: 14, delay: -4, shape: 0 },
  { left: "97%", width: 20, duration: 9, delay: -6, shape: 1 },
]

const SPEEDS = [
  { top: "18%", delay: 0 },
  { top: "38%", delay: 0.7 },
  { top: "62%", delay: 1.4 },
  { top: "82%", delay: 2.1 },
]

function Speeds() {
  return SPEEDS.map((s) => (
    <i
      key={s.top}
      className="nk-speed"
      style={{ top: s.top, animationDelay: `${s.delay}s` }}
    />
  ))
}

function Stars() {
  return STARS.map((s) => (
    <div
      key={s.left}
      className="nk-deco__spot"
      style={{ left: s.left, top: s.top, width: s.width }}
    >
      <div className="nk-deco__glow" />
      <svg
        className="nk-deco__star"
        aria-hidden="true"
        viewBox="0 0 100 100"
        style={{ animationDuration: `${s.duration}s` }}
      >
        {SHAPES[0]}
      </svg>
    </div>
  ))
}

export function PageDecor() {
  return (
    <>
      <div className="nk-deco-dark" aria-hidden="true">
        <Stars />
        <Speeds />
        {FALLING.map((f) => (
          <div
            key={f.left}
            className="nk-p"
            style={{
              left: f.left,
              width: f.width,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
            }}
          >
            <svg viewBox="0 0 100 100" width="100%" aria-hidden="true">
              {SHAPES[f.shape]}
            </svg>
          </div>
        ))}
      </div>
      <div className="nk-deco-light" aria-hidden="true">
        <Stars />
        <Speeds />
      </div>
    </>
  )
}
