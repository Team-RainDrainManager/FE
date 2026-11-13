
import { useState, type FormEvent } from 'react'

import RainInspectForm from '../../drainDetail/components/RainInspectForm'

import type { ReleaseAdoptionRequest } from '../../../types/myDrains'
import type { ReleaseReason } from '../../../types/drainDetail'

type InspectFormProps = {
  adoptionId: number
  drainId: number
  adoptionName: string
  onCancel: () => void
}

// 일반 정기 점검도 AI 점검 인증 API로 통일
// 기존 호출부의 adoptionId prop은 호환성을 위해 유지
export function InspectForm({
  drainId,
  adoptionName,
  onCancel,
}: InspectFormProps) {
  return (
    <RainInspectForm
      kind="ROUTINE"
      drainId={drainId}
      adoptionName={adoptionName}
      onCancel={onCancel}
    />
  )
}

type RenameFormProps = {
  currentName: string
  onSave: (nickname: string) => void
  isSaving: boolean
  errorMessage: string | null
}

export function RenameForm({
  currentName,
  onSave,
  isSaving,
  errorMessage,
}: RenameFormProps) {
  const [name, setName] = useState(currentName)
  const nickname = name.trim()
  const canSave =
    !isSaving && nickname.length >= 1 && nickname.length <= 20 && nickname !== currentName

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSave) onSave(nickname)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-xs font-semibold">
        또랑이 이름
        <input
          type="text"
          autoComplete="off"
          required
          maxLength={20}
          value={name}
          disabled={isSaving}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--dd-line)] bg-[var(--dd-surface)] p-3 text-base"
        />
        <span className="mt-1.5 block font-normal">1~20자로 입력해 주세요.</span>
      </label>

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-[#FFF1F1] p-3 text-xs text-[#B84D4D]">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSave}
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {isSaving ? '저장 중…' : '저장하기'}
      </button>
    </form>
  )
}

type ReleaseFormProps = {
  onConfirm: (payload: ReleaseAdoptionRequest) => void
  isSubmitting: boolean
  errorMessage: string | null
}

export function ReleaseForm({
  onConfirm,
  isSubmitting,
  errorMessage,
}: ReleaseFormProps) {
  const [reason, setReason] =
    useState<ReleaseReason>('MOVED')

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (isSubmitting) return

    onConfirm({ reason })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <p className="text-xs text-[#758B9F]">
        입양을 그만두는 이유를 선택해주세요.
        입양 기록과 성장 정보는 보관됩니다.
      </p>

      <label className="block text-xs font-semibold">
        해제 사유

        <select
          value={reason}
          disabled={isSubmitting}
          onChange={(event) =>
            setReason(
              event.target.value as ReleaseReason,
            )
          }
          className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3"
        >
          <option value="MOVED">이사</option>
          <option value="NO_TIME">시간 부족</option>
          <option value="OTHER">기타</option>
        </select>
      </label>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl bg-[#FFF1F1] p-3 text-xs text-[#B84D4D]"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {isSubmitting
          ? '입양 해제 처리 중...'
          : '입양 그만두기'}
      </button>
    </form>
  )
}
