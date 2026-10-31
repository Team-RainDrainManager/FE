import { useState, type FormEvent } from 'react'
import type { DrainMapItem } from '../../../types/map'

type ReportType =
  | 'BLOCKAGE'
  | 'NEW_DRAIN'
  | 'LOCATION_FIX'
  | 'REMOVAL'
  | 'ODOR'

interface ReportDraftModalProps {
  drains: DrainMapItem[]
  initialDrainId: number | null
  onClose: () => void
  onComplete: () => void
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'BLOCKAGE', label: '막힘 제보' },
  { value: 'NEW_DRAIN', label: '신규 빗물받이' },
  { value: 'LOCATION_FIX', label: '위치 수정' },
  { value: 'REMOVAL', label: '삭제 요청' },
  { value: 'ODOR', label: '악취 제보' },
]

export default function ReportDraftModal({
  drains,
  initialDrainId,
  onClose,
  onComplete,
}: ReportDraftModalProps) {
  const [type, setType] = useState<ReportType>('BLOCKAGE')
  const [drainId, setDrainId] = useState(
    initialDrainId?.toString() ?? '',
  )
  const [photo, setPhoto] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [error, setError] = useState('')

  const isNewDrain = type === 'NEW_DRAIN'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!isNewDrain && !drainId) {
      setError('제보할 빗물받이를 선택해 주세요.')
      return
    }

    if (type === 'REMOVAL' && !note.trim()) {
      setError('삭제 요청에는 사유가 필요해요.')
      return
    }

    if (!photo && !(type === 'ODOR' && note.trim())) {
      setError('사진을 첨부해 주세요.')
      return
    }

    if (!safetyConfirmed) {
      setError('안전 및 개인정보 확인이 필요해요.')
      return
    }

    // UI 시연만 수행하며 서버에는 저장하지 않음
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#EDF1F5] px-5 py-4">
          <h2
            id="report-title"
            className="text-lg font-bold text-[#284B66]"
          >
            빗물받이 제보하기
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="제보 창 닫기"
            className="px-2 text-xl text-[#8294A5]"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto px-5 py-5"
        >
          <div>
            <label
              htmlFor="report-type"
              className="mb-2 block text-sm font-semibold text-[#385A73]"
            >
              제보 종류
            </label>

            <select
              id="report-type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as ReportType)
              }
              className="w-full rounded-xl border border-[#DCE6ED] bg-white px-3 py-3 text-sm"
            >
              {REPORT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {!isNewDrain && (
            <div>
              <label
                htmlFor="report-drain"
                className="mb-2 block text-sm font-semibold text-[#385A73]"
              >
                대상 빗물받이
              </label>

              <select
                id="report-drain"
                value={drainId}
                onChange={(event) => setDrainId(event.target.value)}
                className="w-full rounded-xl border border-[#DCE6ED] bg-white px-3 py-3 text-sm"
              >
                <option value="">빗물받이를 선택해 주세요</option>
                {drains.map((drain) => (
                  <option key={drain.id} value={drain.id}>
                    {drain.nickname ?? drain.name} (#{drain.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="report-photo"
              className="mb-2 block text-sm font-semibold text-[#385A73]"
            >
              제보 사진
            </label>

            <input
              id="report-photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) =>
                setPhoto(event.target.files?.[0] ?? null)
              }
              className="w-full rounded-xl border border-[#DCE6ED] px-3 py-3 text-xs"
            />

            {photo && (
              <p className="mt-2 text-xs text-[#338CF0]">
                선택한 사진: {photo.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="report-note"
              className="mb-2 block text-sm font-semibold text-[#385A73]"
            >
              상세 내용
            </label>

            <textarea
              id="report-note"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="빗물받이의 상태를 설명해 주세요."
              className="w-full resize-none rounded-xl border border-[#DCE6ED] px-3 py-3 text-sm"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl bg-[#F3F8FC] p-3">
            <input
              type="checkbox"
              checked={safetyConfirmed}
              onChange={(event) =>
                setSafetyConfirmed(event.target.checked)
              }
              className="mt-1"
            />

            <span className="text-xs leading-5 text-[#516A7D]">
              안전한 장소에서 촬영했고 사진에 포함된 개인정보를
              확인했습니다.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-xs text-red-500">
              {error}
            </p>
          )}

          <p className="text-xs text-[#8B9BAD]">
            현재 목데이터 기반 UI 시연 단계이며 제보가 서버에
            제출되지는 않습니다.
          </p>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#338CF0] py-3 text-sm font-bold text-white"
          >
            제보 입력 확인 (시연)
          </button>
        </form>
      </section>
    </div>
  )
}