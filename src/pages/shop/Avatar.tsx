import happy from '../../assets/characters/states/happy.svg'
import waiting from '../../assets/characters/unadopted.png'
import { ShopCharacter } from './ShopCharacter'
import { DECORATIONS } from './catalog'
import './shop-motion.css'

export default function Avatar({ outfit, available = false }: { outfit?: string | null; available?: boolean }) {
  const item = !available && DECORATIONS.find(item => item.id === outfit)
  return <span className="dd-face" aria-hidden="true">{item ? <span className="dd-face-studio"><ShopCharacter item={item}/></span> : <img src={available ? waiting : happy} alt="" draggable={false}/>}</span>
}
