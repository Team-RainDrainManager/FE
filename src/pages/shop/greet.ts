import type { MouseEvent } from 'react'
export function greet(event: MouseEvent<HTMLButtonElement>) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const face = event.currentTarget.querySelector('.dd-face')
  face?.getAnimations().forEach(a => a.cancel())
  face?.animate([
    { transform: 'rotate(0)' }, { transform: 'translateY(-3px) rotate(-15deg)' },
    { transform: 'rotate(10deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(0)' },
  ], { duration: 540, easing: 'ease-in-out' })
}
