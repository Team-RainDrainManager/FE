export default function MarkerBubble({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" className={`drain-bubble ${color}`} viewBox="0 0 100 116">
      <path d="M17 1H83Q99 1 99 17V83Q99 99 83 99H60L50 115L40 99H17Q1 99 1 83V17Q1 1 17 1Z"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}
