import { createContext } from 'react'

/** 로그인한 계정 id (계정이 바뀌면 화면 상태를 새로 만들기 위해 씁니다) */
export const AccountId = createContext<number | null>(null)
