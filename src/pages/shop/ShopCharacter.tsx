import { useId } from 'react'
import happy from '../../assets/characters/states/happy.svg?raw'
import { wornItems, type StudioItem } from './catalog'
import './collection.css'

const spark = 'M0 -8Q1 -1 8 0Q1 1 0 8Q-1 1 -8 0Q-1 -1 0 -8Z'
function Ornament({ item }: { item: StudioItem }) {
  const id = useId()
  const { slot, design, color, light, dark } = item
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <linearGradient
          id={id}
          x2=".55"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="#fff8ea" />
          <stop offset=".32" stopColor={light} />
          <stop offset=".65" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      {slot < 2 ? (
        <image
          href={'/shop/' + (slot === 0 ? 'hat' : 'prop') + design + '.webp'}
          width="96"
          height="96"
        />
      ) : slot === 2 ? (
        <Makeup item={item} />
      ) : slot === 3 ? (
        <>
          <path
            d="M48 8C40 26 16 43 18 62C21 97 80 98 80 60C80 44 55 22 48 8Z"
            fill={`url(#${id})`}
            stroke={dark}
            strokeWidth="2"
          />
          <path
            d="M30 55Q31 47 38 40"
            stroke="white"
            strokeWidth="5"
            fill="none"
          />
        </>
      ) : (
        <>
          <path
            d="M16 66Q62 86 72 43Q80 5 41 23Q17 36 42 50"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray="4 7"
          />
          <path
            d={spark}
            transform="translate(50 46) scale(2)"
            fill={`url(#${id})`}
          />
          <path d={spark} transform="translate(77 19)" fill={color} />
        </>
      )}
    </g>
  )
}
function Makeup({ item }: { item: StudioItem }) {
  const { design, color, light } = item
  if (design === 0)
    return (
      <g fill={color}>
        {[18, 78].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="57" rx="12" ry="6" opacity=".72" />
            <path
              d={spark}
              transform={`translate(${x} 55) scale(.4)`}
              fill="#fff"
            />
          </g>
        ))}
      </g>
    )
  if (design === 2 || design === 5)
    return (
      <g>
        <path d="M33 55Q43 46 48 52Q53 45 64 54Q53 72 40 62Z" fill={color} />
        <path
          d="M43 57Q48 60 55 56"
          fill="none"
          stroke={light}
          strokeWidth="2.5"
        />
      </g>
    )
  return (
    <g stroke={color} strokeWidth="3.3" strokeLinecap="round" fill="none">
      {[18, 62].map((x) => (
        <g transform={`translate(${x} 42)`} key={x}>
          <path d={design === 1 ? 'M-3 5Q6 11 17 4' : 'M-5 -2Q5 -12 17 -1'} />
          {design === 3 && <path d="M-3 -4L-7 -9M2 -7L0 -12M8 -7L8 -12" />}
          {design === 4 && (
            <path
              d={spark}
              fill={light}
              strokeWidth="1"
              transform="translate(13 -12) scale(.6)"
            />
          )}
        </g>
      ))}
    </g>
  )
}
export function DecorationArt({ item }: { item: StudioItem }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <Ornament item={item} />
    </svg>
  )
}
export function ShopCharacter({ outfit }: { outfit?: string | null }) {
  const items = wornItems(outfit)
  const dye = items.find((item) => item.slot === 3)
  const motion = items.find((item) => item.slot === 4)
  const body = dye
    ? happy
        .replaceAll('#6A92B5', dye.color)
        .replaceAll('#4F7596', dye.dark)
        .replaceAll('#8FB3D1', dye.light)
    : happy
  return (
    <svg
      className={`collect-character motion-${motion?.design ?? 'still'}`}
      viewBox={
        items.some((i) => i.slot === 0) ? '21 -2 169 190' : '28 30 151 157'
      }
      aria-hidden="true"
    >
      <image
        href={'data:image/svg+xml,' + encodeURIComponent(body)}
        width="200"
        height="200"
      />
      {items
        .filter((i) => i.slot < 3)
        .map((item) => (
          <g
            key={item.id}
            transform={
              [
                'translate(48 0) scale(1.07)',
                'translate(122 100) scale(.62)',
                'translate(57 66) scale(.88)',
              ][item.slot]
            }
          >
            <Ornament item={item} />
          </g>
        ))}
    </svg>
  )
}
