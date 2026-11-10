import { useId, useState } from 'react'

type Decision = 'approve' | 'reject'

type Props = {
  /** 승인 · 반려를 서버에 보냅니다. 실패하면 오류를 던집니다. */
  onDecide: (decision: Decision, comment: string) => void
  busy: boolean
  error: string
  approveLabel?: string
  rejectLabel?: string
  commentLabel: string
}

/**
 * 승인 · 반려 버튼. 한 번 처리하면 되돌릴 수 없어서 두 번 눌러 확정합니다.
 * 반려는 사유가 있어야 보낼 수 있습니다.
 */
export default function DecisionBar({
  onDecide,
  busy,
  error,
  approveLabel = '승인',
  rejectLabel = '반려',
  commentLabel,
}: Props) {
  const commentId = useId()
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState<Decision | null>(null)
  const [localError, setLocalError] = useState('')

  const choose = (decision: Decision) => {
    setLocalError('')
    if (decision === 'reject' && !comment.trim()) {
      setLocalError('반려하려면 사유를 적어 주세요. 사용자에게 그대로 전달돼요.')
      return
    }
    setPending(decision)
  }

  return (
    <div className="mt-3 space-y-2">
      <label htmlFor={commentId} className="block text-[13px] font-bold text-[#203451]">
        {commentLabel}
      </label>
      <textarea
        id={commentId}
        rows={2}
        maxLength={500}
        value={comment}
        disabled={busy}
        onChange={(event) => { setComment(event.target.value); setLocalError(''); setPending(null) }}
        placeholder="반려할 때는 꼭 적어 주세요."
        className="block w-full resize-none rounded-xl border border-[#DFE5F0] bg-white px-3 py-2.5 text-[14px] leading-5 text-[#203451] outline-none focus:border-[#3981F7]"
      />

      {(localError || error) && (
        <p role="alert" className="text-[13px] leading-5 text-[#B84D4D]">{localError || error}</p>
      )}

      {pending ? (
        <div role="group" aria-label="처리 확인" className="rounded-xl bg-[#F4F7FB] p-3">
          <p className="text-[14px] font-bold text-[#203451]">
            {pending === 'approve' ? `${approveLabel}할까요?` : `${rejectLabel}할까요?`} 처리한 뒤에는 되돌릴 수 없어요.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPending(null)}
              className="min-h-11 rounded-xl border border-[#DCE5F0] bg-white text-[14px] font-bold text-[#53647E] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(pending, comment)}
              className="min-h-11 rounded-xl bg-[#3981F7] text-[14px] font-bold text-white disabled:opacity-50"
            >
              {busy ? '처리 중…' : `${pending === 'approve' ? approveLabel : rejectLabel} 확정`}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => choose('reject')}
            className="min-h-11 rounded-xl border border-[#DCE5F0] bg-white text-[14px] font-bold text-[#53647E] disabled:opacity-50"
          >
            {rejectLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose('approve')}
            className="min-h-11 rounded-xl bg-[#3981F7] text-[14px] font-bold text-white disabled:opacity-50"
          >
            {approveLabel}
          </button>
        </div>
      )}
    </div>
  )
}
