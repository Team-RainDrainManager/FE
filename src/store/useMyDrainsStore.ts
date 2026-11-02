import { create } from 'zustand'

import { MOCK_MY_ADOPTIONS, MOCK_PAUSE_STATUS } from '../mocks/myDrain'
import type { MyAdoptionsResponse, MyPauseStatus } from '../types/myDrains'

type Update<T> = T | ((previous: T) => T)

type MyDrainsStore = {
  data: MyAdoptionsResponse
  pauseStatus: MyPauseStatus
  setData: (update: Update<MyAdoptionsResponse>) => void
  setPauseStatus: (update: Update<MyPauseStatus>) => void
  reset: () => void
}

// 화면 간 입양 상태를 공유합니다. 추후 서버 데이터로 교체합니다.
// 서로 다른 페이지에서 같은 데이터를 조회해 입양 해제/점검 쉬기 상태가 일치합니다.
const initialData = () => ({
  ...MOCK_MY_ADOPTIONS,
  adoptions: MOCK_MY_ADOPTIONS.adoptions.map((item) => ({ ...item, drain: { ...item.drain } })),
})

export const useMyDrainsStore = create<MyDrainsStore>((set) => ({
  data: initialData(),
  pauseStatus: { ...MOCK_PAUSE_STATUS },
  setData: (update) => set((state) => ({
    data: typeof update === 'function' ? update(state.data) : update,
  })),
  setPauseStatus: (update) => set((state) => ({
    pauseStatus: typeof update === 'function' ? update(state.pauseStatus) : update,
  })),
  reset: () => set({ data: initialData(), pauseStatus: { ...MOCK_PAUSE_STATUS } }),
}))
