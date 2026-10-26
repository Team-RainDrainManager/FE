
export type DrainStatus = 'normal' | 'overdue' | 'blocked'

export interface MyDrain {
  id: number
  name: string
  locationName: string
  level: number
  xp: number
  status: DrainStatus
  lastCareDaysAgo: number
}

export type DrainModalType =
  | { type: 'growth'; drainId: number | null }
  | { type: 'preview'; drainId: number | null; level: number }
  | {
      type: 'rename' | 'locked' | 'inspect' | 'detail' | 'release'
      drainId: number
    }
  | { type: 'pause' }

export type PageModal = DrainModalType | null
