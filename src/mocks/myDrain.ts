
import type { MyDrain } from '../types/myDrains'

export const MOCK_MY_DRAINS: MyDrain[] = [
  {
    id: 4,
    name: '등굣길 또랑',
    locationName: '등굣길 모퉁이',
    level: 3,
    xp: 150,
    status: 'normal',
    lastCareDaysAgo: 2,
  },
  {
    id: 5,
    name: '공원 새싹',
    locationName: '역곡 어린이공원',
    level: 1,
    xp: 75,
    status: 'overdue',
    lastCareDaysAgo: 29,
  },
]
