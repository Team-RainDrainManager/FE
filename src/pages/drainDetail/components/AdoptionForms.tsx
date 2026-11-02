
import { useState, type FormEvent } from 'react'
import type { ReleaseReason } from '../../../types/drainDetail'

const SAFETY_RULES = [
  '인도 등 안전한 장소에서만 점검할게요.',
  '비가 내리거나 위험한 상황에서는 점검하지 않을게요.',
  '빗물받이 덮개를 직접 열지 않을게요.',
]

export function AdoptForm() {
  const [name, setName] = useState('')
  const [safety, setSafety] = useState([false, false, false])
  const [pledge, setPledge] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const canSubmit =
    name.trim().length > 0 &&
    safety.every(Boolean) &&
    pledge

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSubmit) setSubmitted(true)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-semibold text-[#24496B]">
        빗물받이 별명
        <input
          required
          maxLength={20}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="또랑이 이름 입력"
          className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm"
        />
      </label>

      <div className="space-y-3">
        <p className="text-xs font-semibold">안전수칙 확인</p>

        {SAFETY_RULES.map((rule, index) => (
          <label key={rule} className="flex gap-2 text-xs leading-relaxed">
            <input
              type="checkbox"
              checked={safety[index]}
              onChange={(event) =>
                setSafety((previous) =>
                  previous.map((value, i) =>
                    i === index ? event.target.checked : value,
                  ),
                )
              }
            />
            {rule}
          </label>
        ))}
      </div>

      <label className="flex gap-2 text-xs">
        <input
          type="checkbox"
          checked={pledge}
          onChange={(event) => setPledge(event.target.checked)}
        />
        14일마다 점검하는 약속에 동의합니다.
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
      >
        입양 신청 화면 확인
      </button>

      {submitted && (
        <p role="status" className="rounded-xl bg-[#E8F7EF] p-3 text-xs text-[#259B68]">
          입력값 확인 완료. 실제 입양 요청은 전송되지 않았어요.
        </p>
      )}
    </form>
  )
}

export function ReleaseForm() {
  const [reason, setReason] = useState<ReleaseReason>('MOVED')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-semibold">
        입양 해제 사유

        <select
          value={reason}
          onChange={(event) =>
            setReason(event.target.value as ReleaseReason)
          }
          className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm"
        >
          <option value="MOVED">이사</option>
          <option value="NO_TIME">시간 부족</option>
          <option value="OTHER">기타</option>
        </select>
      </label>

      <label className="block text-xs font-semibold">
        추가 설명 (선택)
        <textarea
          maxLength={300}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="사유를 입력해주세요."
          className="mt-2 min-h-20 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm"
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
      >
        입양 해제 화면 확인
      </button>

      {submitted && (
        <p role="status" className="rounded-xl bg-[#E8F7EF] p-3 text-xs text-[#259B68]">
          입력값 확인 완료. 실제 입양은 해제되지 않았어요.
        </p>
      )}
    </form>
  )
}
