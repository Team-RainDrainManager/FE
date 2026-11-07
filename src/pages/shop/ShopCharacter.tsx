import type { CSSProperties } from 'react'
import type { StudioItem } from './catalog'
import happyCharacter from '../../assets/characters/states/happy.svg'
export function DecorationArt({ item, size = 'small' }: { item: StudioItem; size?: 'small' | 'large' }) {
  const foreground = item.color
  const light = item.secondary
  const number = Number(item.id.slice(1))
  const stroke = { stroke: foreground, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  return (
    <svg viewBox="0 0 96 96" role="img" aria-label={`${item.title} 일러스트`} className={`dshop-art dshop-art--${size}`}>
      {item.category === 'headwear' && (
        <>
          {number === 1 && <><path d="M19 57c3-21 14-34 31-34 18 0 26 13 28 34Z" fill={light} {...stroke}/><path d="M18 61h62" {...stroke} strokeWidth="7"/><path d="M48 23q-3-14 10-15" fill="none" {...stroke}/><path d="M54 13q12-11 23 0-11 14-23 0" fill="#8ec49d"/></>}
          {number === 2 && <><path d="M21 60V43c0-19 12-31 27-31s27 12 27 31v17" fill={light} {...stroke}/><rect x="18" y="53" width="60" height="17" rx="8" fill={foreground}/><circle cx="48" cy="14" r="9" fill={foreground}/></>}
          {number === 3 && <><path d="M18 72q-6-54 30-55 38 0 30 55l-16-7-28 1Z" fill={light} {...stroke}/><path d="M30 61q18-10 36 0" fill="none" {...stroke}/><path d="M21 72h54" {...stroke}/></>}
          {number === 4 && <><path d="M27 53 34 23h28l7 30Z" fill={light} {...stroke}/><ellipse cx="48" cy="58" rx="39" ry="8" fill={foreground}/><path d="M32 43h33" stroke="#fff3db" strokeWidth="6"/></>}
          {number === 5 && <><path d="M21 58q3-37 29-37t29 37Z" fill={foreground}/><path d="M35 55q31 1 45 6" {...stroke}/><path d="m49 31 2.5 7 7 2-7 2.5L49 49l-2-6.5-7-2.5 7-2Z" fill={light}/></>}
          {number === 6 && <><path d="M13 52q30-20 70 0" fill="none" {...stroke} strokeWidth="7"/><path d="M48 35q-25-25-31-8-4 18 28 15" fill={foreground}/><path d="M48 35q25-25 31-8 4 18-28 15" fill={light} {...stroke}/><circle cx="48" cy="38" r="7" fill={foreground}/></>}
          {number === 7 && <><path d="M19 63q0-42 29-42t29 42Z" fill={light} {...stroke}/><circle cx="32" cy="22" r="10" fill={foreground}/><circle cx="64" cy="22" r="10" fill={foreground}/><circle cx="33" cy="39" r="3" fill="#375f43"/><circle cx="63" cy="39" r="3" fill="#375f43"/><path d="M43 51q6 5 11 0" stroke="#375f43" strokeWidth="3" fill="none"/></>}
          {number === 8 && <><path d="M24 33h48l-5 24H29Z" fill={light} {...stroke}/><path d="M15 59q34 17 66 0" fill="none" {...stroke} strokeWidth="8"/><path d="M31 37h34" stroke="#fff6ca" strokeWidth="4"/></>}
        </>
      )}
      {item.category === 'expression' && (
        <>
          <circle cx="48" cy="48" r="31" fill={light} {...stroke} strokeWidth="3" />
          {number === 2 ? <><path d="M26 39q10-10 20 0" stroke="#324957" strokeWidth="4" fill="none" strokeLinecap="round"/><circle cx="62" cy="40" r="3.5" fill="#324957" /></>
            : number === 4 ? <><path d="m25 35 8-7 8 7-8 8Z M55 35l8-7 8 7-8 8Z" fill="#d57992"/></>
            : number === 5 ? <><path d="M28 39q8 7 16 0 M54 39q8 7 16 0" stroke="#324957" strokeWidth="4" fill="none" strokeLinecap="round"/></>
            : number === 6 ? <><circle cx="34" cy="39" r="5" fill="#324957"/><circle cx="62" cy="39" r="5" fill="#324957"/></>
            : number === 7 ? <><path d="m30 32 11 8-11 2 M55 39l11-7" fill="none" stroke="#324957" strokeWidth="4" strokeLinecap="round"/></>
            : <><circle cx="34" cy="40" r="3.5" fill="#324957"/><circle cx="62" cy="40" r="3.5" fill="#324957"/></>}
          {number === 5 ? <path d="M37 60h22" stroke="#324957" strokeWidth="4" strokeLinecap="round" />
            : number === 6 ? <ellipse cx="48" cy="59" rx="6" ry="9" fill="#324957"/>
            : number === 8 ? <><path d="M33 53q15 18 30 0" stroke="#324957" strokeWidth="4" fill="none"/><path d="M65 44q10 12 2 16-8 1-2-16" fill="#89c6e3"/></>
            : <path d="M33 53q15 17 30 0" stroke="#324957" strokeWidth="4" fill="none" strokeLinecap="round" />}
          {number === 3 && <><ellipse cx="25" cy="50" rx="7" ry="4" fill="#e5a0b0"/><ellipse cx="70" cy="50" rx="7" ry="4" fill="#e5a0b0"/></>}
        </>
      )}
      {item.category === 'accessory' && (
        <>
          {number === 1 && <><path d="M13 48Q48 4 83 48Z" fill={foreground}/><path d="M48 48v30q0 11-12 7" fill="none" {...stroke}/><path d="M13 48q9-8 18 0 8-8 17 0 8-8 17 0 9-8 18 0" fill="none" stroke={light} strokeWidth="3"/></>}
          {number === 2 && <><rect x="27" y="33" width="42" height="42" rx="11" fill={light} {...stroke}/><path d="M36 34q0-15 12-15t12 15" fill="none" {...stroke}/><path d="M48 46q-13 13 0 19 13-6 0-19Z" fill={foreground}/></>}
          {number === 3 && <><path d="M48 47q-33-32-35-9-1 17 32 14Q15 74 31 80q16 6 19-26 4 31 20 26 15-7-16-28 33 4 30-14-4-23-36 9Z" fill={foreground}/><path d="M48 50v34" {...stroke}/></>}
          {number === 4 && <><rect x="26" y="32" width="44" height="44" rx="9" fill={light} {...stroke}/><path d="M36 31v-9h24v9 M36 77h24" {...stroke} fill="none"/><rect x="38" y="44" width="20" height="21" rx="7" fill="#fff3d0"/></>}
          {number === 5 && <><path d="M48 15c-38 3-27 45 0 47 27-2 38-44 0-47Z" fill={light} {...stroke}/><path d="M48 62q-6 16 4 24" stroke="#6b8092" strokeWidth="3" fill="none"/></>}
          {number === 6 && <><path d="M25 40q23-24 46 0l-5 31q-19 17-36 0Z" fill={light} {...stroke}/><path d="M25 40q5-20 23-20t23 20Z" fill={foreground}/><path d="M35 40q14 6 27 0" stroke={light} strokeWidth="4" fill="none"/></>}
          {number === 7 && <><path d="M46 77 34 48 62 48Z" fill="#87bda4"/><path d="M48 49v-22" {...stroke}/><circle cx="48" cy="22" r="10" fill={foreground}/><circle cx="30" cy="35" r="9" fill={light}/><circle cx="66" cy="35" r="9" fill={foreground}/><circle cx="48" cy="44" r="8" fill={light}/></>}
          {number === 8 && <><path d="M10 47 85 20 64 77 49 56 36 72 37 50Z" fill={light} {...stroke}/><path d="M37 50 85 20 49 56" fill="none" {...stroke}/></>}
        </>
      )}
      {item.category === 'scene' && (
        <>
          <rect x="13" y="14" width="70" height="68" rx="17" fill={light} />
          {number === 1 && <><circle cx="65" cy="35" r="13" fill={foreground}/><path d="M18 65q30-26 60 0" fill="none" {...stroke}/></>}
          {number === 2 && <><path d="M21 47q-4-16 16-18 12-17 25-4 17-1 17 16-1 13-23 13H36Z" fill="white" stroke={foreground} strokeWidth="3"/><path d="M30 62v9 M49 59v9 M66 61v9" {...stroke}/></>}
          {number === 3 && <><circle cx="55" cy="40" r="16" fill={foreground}/><path d="M18 67q20-18 32-4 16-23 28 2" fill="none" {...stroke}/></>}
          {number === 4 && <><path d="m42 33 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill={foreground}/><circle cx="63" cy="31" r="4" fill="white"/><circle cx="26" cy="57" r="3" fill="white"/><path d="M24 71h49" {...stroke}/></>}
          {number === 5 && <><path d="M48 76V39 M48 57Q33 45 27 53 M48 50Q64 35 71 43" {...stroke} fill="none"/><circle cx="48" cy="33" r="14" fill={foreground}/><path d="M19 75h57" {...stroke}/></>}
          {number === 6 && <><path d="M22 74V42h14v32 M42 74V28h18v46 M65 74V47h12v27" stroke={foreground} strokeWidth="3" fill="none"/><path d="M27 48h4 M48 38h5 M48 48h5 M69 55h4" stroke={foreground} strokeWidth="3"/></>}
          {number === 7 && <><path d="M18 72q27-38 61 0" fill="none" {...stroke}/><path d="M48 70V31" {...stroke}/><path d="M48 31q-26-19-33 5h66Q71 12 48 31Z" fill={foreground}/></>}
          {number === 8 && <><path d="M26 36h44 M24 60h48" {...stroke} strokeWidth="2"/><path d="m49 23 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill={foreground}/><circle cx="30" cy="68" r="4" fill="white"/><circle cx="66" cy="60" r="4" fill="white"/></>}
        </>
      )}
      {item.category === 'effect' && (
        <>
          {number === 1 && <><path d="M48 13Q27 48 27 61a21 21 0 0 0 42 0Q69 48 48 13Z" fill={foreground}/><circle cx="42" cy="61" r="9" fill={light}/></>}
          {number === 2 && <><path d="M48 77 20 49Q7 29 26 22q15-4 22 9 7-13 22-9 19 7 6 27Z" fill={foreground}/><circle cx="33" cy="39" r="5" fill={light}/></>}
          {number === 3 && <><path d="m48 9 9 30 30 9-30 9-9 30-9-30-30-9 30-9Z" fill={foreground}/><path d="m75 10 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill={light}/></>}
          {number === 4 && <><path d="M23 75Q7 36 76 18 77 73 23 75Z" fill={foreground}/><path d="M22 79q24-30 53-60" fill="none" stroke={light} strokeWidth="4"/></>}
          {number === 5 && <><path d="M24 65q-19 1-17-15 1-17 19-16 7-25 27-17 12-6 22 12 20 3 13 23-3 14-22 13Z" fill={foreground}/><path d="M30 54h34" fill="none" stroke={light} strokeWidth="4"/></>}
          {number === 6 && <><path d="M17 70Q14 24 48 24t31 46" fill="none" stroke={foreground} strokeWidth="8" strokeLinecap="round"/><path d="M28 70Q25 35 48 35t20 35" fill="none" stroke="#EAC280" strokeWidth="7"/><path d="M39 70Q36 46 48 46t9 24" fill="none" stroke="#9ECBB0" strokeWidth="7"/></>}
          {number === 7 && <><ellipse cx="48" cy="50" rx="19" ry="25" fill={foreground}/><path d="M36 31v37 M48 27v46 M60 31v37" stroke="#fff1c7" strokeWidth="6"/><ellipse cx="29" cy="48" rx="12" ry="9" fill={light} opacity=".8"/><ellipse cx="67" cy="48" rx="12" ry="9" fill={light} opacity=".8"/><circle cx="42" cy="46" r="2.5"/><circle cx="54" cy="46" r="2.5"/></>}
          {number === 8 && <><path d="M64 13Q33 15 32 48t32 35Q38 88 25 65t8-40Q45 10 64 13Z" fill={foreground}/><circle cx="69" cy="28" r="5" fill={light}/><circle cx="72" cy="60" r="3" fill={light}/></>}
        </>
      )}
      {item.category === 'palette' && (
        <>
          <circle cx="39" cy="47" r="31" fill={foreground} />
          <circle cx="58" cy="39" r="25" fill={light} opacity=".95" />
          <circle cx="33" cy="64" r="18" fill={foreground} opacity=".68" />
          <circle cx="64" cy="65" r="9" fill="#fff" opacity=".72" />
        </>
      )}
    </svg>
  )
}

/** The selected item is previewed ON the character instead of in a detached sticker. */
export function ShopCharacter({ item }: { item: StudioItem }) {
  const expression = item.category === 'expression' ? Number(item.id.slice(1)) : 1
  const paletteShift = item.category === 'palette'
    ? [0, 104, 55, 186, 260, -18, 215, 130][Number(item.id.slice(1)) - 1] ?? 0
    : 0
  const faceStroke = { stroke: '#1E2B38', strokeWidth: 3.6, fill: 'none' as const, strokeLinecap: 'round' as const }

  return (
    <div className="dshop-avatar" style={{ '--dshop-palette-rotate': `${paletteShift}deg` } as CSSProperties}>
      {item.category === 'scene' && <span className="dshop-avatar__scene" aria-hidden="true"><DecorationArt item={item} /></span>}
      <svg className="dshop-avatar__body" viewBox="0 0 200 200" role="img" aria-label={`${item.title}을 적용한 또랑이 미리보기`}>
        <image href={happyCharacter} width="200" height="200" />
        {/* Keep the original character asset; redraw only the facial area. */}
        <rect x="60" y="90" width="80" height="41" fill="#6A92B5" />
        <g className="dshop-avatar__eyes">
          {expression === 2 ? (
            <><path d="M73 104q9-8 18 0" {...faceStroke}/><circle cx="119" cy="104" r="4.2" fill="#1E2B38" /></>
          ) : expression === 4 ? (
            <><path d="M73 103l8-8 9 8-9 10Z M110 103l8-8 9 8-9 10Z" fill="#E5718E" /></>
          ) : expression === 5 ? (
            <><path d="M73 103q8 7 17 0 M111 103q8 7 17 0" {...faceStroke}/></>
          ) : expression === 6 ? (
            <><circle cx="82" cy="104" r="5.6" fill="#1E2B38"/><circle cx="118" cy="104" r="5.6" fill="#1E2B38"/></>
          ) : expression === 7 ? (
            <><path d="m73 98 18 6-18 5 M111 105l17-9" {...faceStroke}/></>
          ) : (
            <><path d="M74 106q8-11 16 0 M110 106q8-11 16 0" {...faceStroke}/></>
          )}
        </g>
        {expression === 6 ? <ellipse cx="100" cy="120" rx="6" ry="9" fill="#1E2B38" />
          : expression === 5 ? <path d="M93 120h14" {...faceStroke}/>
          : expression === 7 ? <><path d="M91 119q9 12 18 0" {...faceStroke}/><path d="M98 122q3-4 7 1" stroke="#F58CA2" strokeWidth="3" fill="none" /></>
          : <path d="M90 118q10 14 20 0" {...faceStroke}/>
        }
        <ellipse cx="68" cy="119" rx="6.5" ry="3.5" fill="#F4A3B4" />
        <ellipse cx="132" cy="119" rx="6.5" ry="3.5" fill="#F4A3B4" />
        {expression === 3 && <><ellipse cx="73" cy="121" rx="9" ry="5" fill="#F58AA6" opacity=".84"/><ellipse cx="127" cy="121" rx="9" ry="5" fill="#F58AA6" opacity=".84"/></>}
        {expression === 8 && <><path d="M125 110q11 8 0 16-8-2 0-16Z" fill="#9EDAF0"/><path d="M75 110q-10 8 0 16 8-2 0-16Z" fill="#9EDAF0"/></>}
      </svg>
      {item.category === 'headwear' && <span className="dshop-avatar__wear" aria-hidden="true"><DecorationArt item={item} size="large"/></span>}
      {item.category === 'accessory' && <span className="dshop-avatar__held" aria-hidden="true"><DecorationArt item={item} size="large" /></span>}
      {item.category === 'effect' && <span className="dshop-avatar__effect" aria-hidden="true"><DecorationArt item={item} size="large" /></span>}
      <span className="dshop-avatar__blush" aria-hidden="true">♥</span>
    </div>
  )
}
