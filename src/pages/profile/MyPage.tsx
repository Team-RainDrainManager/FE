import { useContext, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { getMe, getErrorMessage } from '../../apis/auth'
import { getActivities, downloadCertificate, registerCertificateName, CertificateNameRequired, type ActivityFilter } from '../../apis/my-page'
import { getMyAdoptions } from '../../apis/my-drains'
import { AccountId } from '../../features/missions/wallet'
import Character from '../../components/common/Character'
import './my-page.css'

const labels = { ALL: '전체', INSPECTION: '점검', REPORT: '제보', POINT: '포인트' } as const
const filters: ActivityFilter[] = ['ALL', 'INSPECTION', 'REPORT', 'POINT']
const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul',
})
function activityDate(value: string) {
  const time = Date.parse(value)
  return Number.isFinite(time) ? dateFormat.format(time) : ''
}
function metric(value?: number, unit = '') {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') + unit : '—'
}

export default function MyPage() {
  const account = useContext(AccountId)
  const me = useQuery({ queryKey: ['mypage', 'me', account], queryFn: getMe, staleTime: 0 })
  const [type, setType] = useState<ActivityFilter>('ALL')
  const memberId = account ?? me.data?.id
  const adopted = useQuery({
    queryKey: ['my-adoptions', memberId],
    queryFn: ({ signal }) => getMyAdoptions(signal),
    enabled: memberId != null,
    staleTime: 30_000,
  })
  const history = useInfiniteQuery({
    queryKey: ['mypage', 'activities', memberId, type],
    queryFn: ({ pageParam, signal }) => getActivities(type, pageParam, signal),
    enabled: memberId != null,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page, _pages, _lastCursor, cursors) =>
      page.nextCursor && !cursors.includes(page.nextCursor) ? page.nextCursor : undefined,
  })
  const certificate = useMutation({ mutationFn: downloadCertificate })
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const registration = useMutation({
    mutationFn: registerCertificateName,
    onSuccess: () => {
      setName('')
      setEditingName(false)
      certificate.reset()
      void me.refetch()
    },
  })
  const showNameForm = editingName || certificate.error instanceof CertificateNameRequired
  const user = me.data
  const activities = history.data?.pages.flatMap(page => page.activities) ?? []

  return <div className="dd-mypage">
    <section className="mp-card" aria-label="사용자 정보 및 활동 통계">
      <div className="mp-person">
        <div className="mp-face">{user?.profileImage
          ? <img src={user.profileImage} alt="" />
          : <Character type="state" state="happy" size={48} />}</div>
        <div>
          <h2>{user?.nickname || (me.isPending ? '불러오는 중…' : '사용자 정보')}</h2>
          {user?.email && <p>{user.email}</p>}
          {typeof user?.level === 'number' && <strong>Lv. {user.level}</strong>}
        </div>
      </div>
      {me.isError && <p role="alert">{getErrorMessage(me.error)} <button onClick={() => void me.refetch()}>다시 시도</button></p>}
      <dl className="mp-stats">
        <div><dt>포인트</dt><dd>{metric(user?.point, ' P')}</dd></div>
        <div><dt>참여 점수</dt><dd>{metric(user?.participationScore, '점')}</dd></div>
        <div><dt>누적 점검</dt><dd>{metric(user?.inspectionCount, '회')}</dd></div>
        <div><dt>봉사활동 시간</dt><dd>{metric(user?.volunteerMinutes, '분')}</dd></div>
      </dl>
      <Link className="mp-adoptions" to="/my-drains"><span>내가 입양한 또랑이</span><strong>{metric(user?.adoptionCount, '개')} ›</strong></Link>
      {adopted.data && adopted.data.adoptions.length > 0 && <ul className="mp-drains">
        {adopted.data.adoptions.map(item => <li key={item.adoptionId}><Link to={`/drains/${item.drainId}`}>{item.nickname}</Link></li>)}
      </ul>}
      {adopted.isError && <p role="alert">{getErrorMessage(adopted.error)} <button onClick={() => void adopted.refetch()}>다시 시도</button></p>}
    </section>

    <section className="mp-card">
      <h2>내 활동 내역</h2>
      <div className="mp-filters" role="group" aria-label="활동 유형">
        {filters.map(filter => <button key={filter} type="button" aria-pressed={filter === type} onClick={() => setType(filter)}>{labels[filter]}</button>)}
      </div>
      {history.isPending && memberId != null && <p role="status">활동 내역을 불러오는 중이에요.</p>}
      {history.isSuccess && !activities.length && <p>활동 내역이 없어요.</p>}
      {activities.length > 0 && <ul className="mp-history">{activities.map(item => <li key={item.type + ':' + item.id}>
        <div className="mp-row"><span>{labels[item.type]}</span><time dateTime={item.occurredAt}>{activityDate(item.occurredAt)}</time></div>
        <div className="mp-row"><b>{item.title}</b>{item.type === 'POINT' && typeof item.amount === 'number' && <strong>{item.amount > 0 ? '+' : ''}{metric(item.amount, ' P')}</strong>}</div>
        {item.description && <p>{item.description}</p>}
        {(item.drainName || item.status) && <small>{[item.drainName, item.status].filter(Boolean).join(' · ')}</small>}
      </li>)}</ul>}
      {history.isError && <p role="alert">{getErrorMessage(history.error)}</p>}
      {history.isError && !history.isFetchNextPageError && <button onClick={() => void history.refetch()}>다시 시도</button>}
      {(history.hasNextPage || history.isFetchNextPageError) && <button className="mp-more" disabled={history.isFetching} onClick={() => void history.fetchNextPage()}>
        {history.isFetchingNextPage ? '불러오는 중…' : history.isFetchNextPageError ? '다시 시도' : '더 보기'}
      </button>}
    </section>

    <section className="mp-card">
      <h2>활동 확인서</h2>
      <p>실명 등록과 인정된 점검 기록 1건 이상이 필요합니다. 1365 자원봉사포털 등록 전에는 공식 봉사 실적으로 인정되지 않습니다.</p>
      {showNameForm ? <form onSubmit={event => {
        event.preventDefault()
        if (name.trim() && !registration.isPending) registration.mutate(name.trim())
      }}>
        <label htmlFor="certificate-name" className="text-sm font-bold">확인서에 표시할 실명</label>
        <input id="certificate-name" className="my-2 block w-full rounded-xl border border-[var(--dd-line)] px-3 py-2" autoComplete="name" maxLength={20} required value={name} onChange={event => setName(event.target.value)} />
        <p>현재는 입력한 이름을 저장하는 시연 단계입니다.</p>
        <button type="button" disabled={registration.isPending} onClick={() => { setEditingName(false); setName(''); registration.reset(); certificate.reset() }}>취소</button>
        <button type="submit" className="mp-download" disabled={!name.trim() || registration.isPending}>{registration.isPending ? '저장 중…' : '실명 저장'}</button>
        {registration.isError && <p role="alert">{getErrorMessage(registration.error)}</p>}
      </form> : <button type="button" onClick={() => { registration.reset(); setEditingName(true) }}>확인서용 실명 등록</button>}
      {registration.isSuccess && !showNameForm && <p role="status">실명을 등록했습니다. 확인서를 다시 요청해 주세요.</p>}
      <button className="mp-download" disabled={certificate.isPending || showNameForm} onClick={() => certificate.mutate()}>
        {certificate.isPending ? 'PDF 준비 중…' : '확인서 PDF 다운로드'}
      </button>
      {certificate.isError && <p role="alert">{getErrorMessage(certificate.error)}</p>}
    </section>
  </div>
}
