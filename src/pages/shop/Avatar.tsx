import waiting from '../../assets/characters/unadopted.png'
import { ShopCharacter } from './ShopCharacter'
export default function Avatar({
  outfit,
  available = false,
}: {
  outfit?: string | null
  available?: boolean
}) {
  return (
    <span className="dd-face" aria-hidden="true">
      {available ? (
        <img src={waiting} alt="" draggable={false} />
      ) : (
        <ShopCharacter outfit={outfit} />
      )}
    </span>
  )
}
