import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getErrorMessage, getTerms, getTermsContent, type TermsContent } from '../../apis/auth'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import '../login/auth-pages.css'

export default function TermsPage() {
  const navigate = useNavigate()
  const terms = useOnboardingStore((state) => state.terms)
  const agreements = useOnboardingStore((state) => state.agreements)
  const setTerms = useOnboardingStore((state) => state.setTerms)
  const setAgreement = useOnboardingStore((state) => state.setAgreement)
  const setAll = useOnboardingStore((state) => state.setAll)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<TermsContent | null>(null)
  const [detailsPending, setDetailsPending] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let alive = true
    getTerms().then((items) => { if (alive) { setTerms(items.sort((a, b) => a.displayOrder - b.displayOrder)); setLoading(false) } })
      .catch((err: unknown) => { if (alive) { setError(getErrorMessage(err)); setLoading(false) } })
    return () => { alive = false }
  }, [setTerms])

  const agreed = (id: number) => agreements.find((item) => item.termsId === id)?.agreed ?? false
  const allChecked = terms.length > 0 && terms.every((item) => agreed(item.termsId))
  const canProceed = terms.length > 0 && terms.every((item) => !item.required || agreed(item.termsId))

  async function openDetails(termsId: number) {
    setDetail(null); setDetailError(''); setDetailsPending(true)
    try { setDetail(await getTermsContent(termsId)) }
    catch (err: unknown) { setDetailError(getErrorMessage(err)) }
    finally { setDetailsPending(false) }
  }

  return <div className="dd-auth-page"><main className="dd-auth-card dd-auth-card--wide">
    <p className="dd-auth-kicker">STEP 01 / 02</p>
    <h1>서비스 이용 약관</h1>
    <p className="dd-auth-explainer">안전한 동네 돌봄을 위해 약관을 확인해 주세요.</p>
    {loading ? <p role="status" className="dd-auth-explainer">약관을 불러오는 중이에요…</p> : error ? <div role="alert" className="dd-auth-error">{error}<button type="button" className="dd-auth-retry" onClick={() => window.location.reload()}>다시 불러오기</button></div> : <>
      <div className="dd-terms-all">
        <label><input type="checkbox" checked={allChecked} onChange={(e) => setAll(e.target.checked)} /> <strong>약관 전체 동의하기 (선택 항목 포함)</strong></label>
      </div>
      <p className="dd-auth-note">선택 항목에 동의하지 않아도 서비스를 이용할 수 있어요. 알림 설정은 언제든 내 정보 &gt; 설정에서 바꿀 수 있어요.</p>
      <div className="dd-terms-list">
        {terms.map((item) => <div className="dd-terms-row" key={item.termsId}>
          <label>
            <input type="checkbox" checked={agreed(item.termsId)} onChange={(e) => setAgreement(item.termsId, e.target.checked)} />
            <span><small className={item.required ? 'dd-terms-required' : 'dd-terms-optional'}>[{item.required ? '필수' : '선택'}]</small> {item.title}</span>
          </label>
          {item.hasContent && <button type="button" className="dd-terms-detail" onClick={() => { void openDetails(item.termsId) }}>자세히</button>}
        </div>)}
      </div>
      <button type="button" className="dd-auth-primary" disabled={!canProceed} onClick={() => navigate('/onboarding/verify')}>동의하고 계속</button>
    </>}
  </main>
  {(detailsPending || detail || detailError) && <div className="dd-terms-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { setDetail(null); setDetailError(''); setDetailsPending(false) } }}>
    <section className="dd-terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-dialog-title">
      <div className="dd-terms-modal-heading"><h2 id="terms-dialog-title">{detail?.title || '약관 자세히 보기'}</h2><button type="button" aria-label="닫기" onClick={() => { setDetail(null); setDetailError(''); setDetailsPending(false) }}>✕</button></div>
      <div className="dd-terms-modal-content">{detailsPending ? '불러오는 중…' : detailError ? <p role="alert">{detailError}</p> : detail?.content ?? '별도의 약관 전문이 없는 항목입니다.'}</div>
      <button type="button" className="dd-auth-primary" onClick={() => { setDetail(null); setDetailError(''); setDetailsPending(false) }}>확인</button>
    </section>
  </div>}
  </div>
}
