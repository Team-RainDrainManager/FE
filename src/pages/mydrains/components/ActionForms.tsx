
import { useState, type FormEvent } from 'react'
import type { MyDrain } from '../../../types/myDrains'

export function RenameForm({
  drain,
  onSave,
}: {
  drain: MyDrain
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(drain.name)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim()) onSave(name.trim())
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-semibold">
        새 이름
        <input
          autoFocus
          required
          maxLength={20}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm"
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
      >
        이름 변경
      </button>
    </form>
  )
}

export function InspectForm({ drain }: { drain: MyDrain }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setConfirmed(true)
      }}
      className="space-y-4 text-sm"
    >
      <p className="rounded-xl bg-[#EAF6FF] p-3 text-xs text-[#447798]">
        비 오는 날에는 점검하지 말고 인도에서만 살펴봐요.
        덮개를 열지 마세요.
      </p>

      <p className="font-bold">
        {drain.name} · {drain.locationName}
      </p>

      <label className="block text-xs font-bold">
        점검 전 사진
        <input
          type="file"
          accept="image/*"
          className="mt-2 block w-full text-xs"
        />
      </label>

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" />
        주변 쓰레기를 청소했어요
      </label>

      <label className="block text-xs font-bold">
        점검 메모
        <textarea
          placeholder="현장 상태를 입력해주세요."
          className="mt-2 min-h-20 w-full rounded-xl border border-[#DCE8F1] p-3 text-xs"
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
      >
        점검 화면 확인
      </button>

      {confirmed && (
        <p role="status" className="rounded-xl bg-[#E8F7EF] p-3 text-xs text-[#259B68]">
          화면 입력을 확인했어요. 실제 기록은 저장되지 않습니다.
        </p>
      )}
    </form>
  )
}
