
import {
  getLevelCharacter,
  getStateCharacter,
  type CharacterState,
} from '../../constants/characters'

type CharacterProps = {
  size?: number
  className?: string
  alt?: string
} & (
  | {
      type: 'level'
      level: number
    }
  | {
      type: 'state'
      state: CharacterState
    }
)

export default function Character({
  size = 120,
  className = '',
  alt,
  ...props
}: CharacterProps) {
  const src =
    props.type === 'level'
      ? getLevelCharacter(props.level)
      : getStateCharacter(props.state)

  const defaultAlt =
    props.type === 'level'
      ? `레벨 ${props.level} 또랑이 캐릭터`
      : `또랑이 ${props.state} 표정`

  return (
    <img
      src={src}
      alt={alt ?? defaultAlt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  )
}
