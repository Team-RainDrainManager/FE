
import type {
  MyAdoptionsResponse,
  MyPauseStatus,
} from '../types/myDrains'

export const MOCK_MY_ADOPTIONS: MyAdoptionsResponse = {
  count: 2,
  limit: 3,
  adoptions: [
    {
      adoption_id: 104,
      adoption_name: '등굣길 또랑',
      drain: {
        drain_id: 4,
        name: '등굣길 모퉁이',
        status: 'ACTIVE',
      },
      level: 3,
      stage: '깨끗해지는 중',
      xp: 150,
      next_level_xp: 50,
      progress_percent: 0,
      last_care_at: '2026-10-28T15:30:00+09:00',
      next_inspection_at: '2026-11-11T15:30:00+09:00',
      pause_until: null,
      release_warning: false,
      missed_forecast_count: 0,
      lonely: false,
    },
    {
      adoption_id: 105,
      adoption_name: '공원 새싹',
      drain: {
        drain_id: 5,
        name: '역곡 어린이공원',
        status: 'ACTIVE',
      },
      level: 1,
      stage: '깨끗해지는 중',
      xp: 75,
      next_level_xp: 25,
      progress_percent: 50,
      last_care_at: '2026-10-01T09:00:00+09:00',
      next_inspection_at: '2026-10-15T09:00:00+09:00',
      pause_until: null,
      release_warning: true,
      missed_forecast_count: 3,
      lonely: true,
    },
  ],
}

export const MOCK_PAUSE_STATUS: MyPauseStatus = {
  can_apply: true,
  active_until: null,
  next_available_at: null,
}
