/** 한글 2~6자, 영문 2~12자, 숫자 2~6자. 혼용 시 숫자는 해당 문자 한 개로 계산. */
export type NicknameValidation = { valid: true; length: number; max: number } | { valid: false; reason: string; length: number; max: number }

export function validateNickname(raw: string): NicknameValidation {
  const value = raw.trim()
  if (!value || raw !== value) return { valid: false, reason: '공백 없이 입력해 주세요.', length: value.length, max: 12 }
  if (value === '이용제한') return { valid: false, reason: '사용할 수 없는 닉네임입니다.', length: value.length, max: 6 }

  const hangul = /^[가-힣0-9]+$/.test(value)
  const latin = /^[A-Za-z0-9]+$/.test(value)
  if (!hangul && !latin) {
    return { valid: false, reason: '한글과 영어를 혼합하거나 특수문자·공백을 사용할 수 없습니다.', length: value.length, max: 12 }
  }
  const max = /[가-힣]/.test(value) || /^\d+$/.test(value) ? 6 : 12
  if (value.length < 2 || value.length > max) {
    return { valid: false, reason: `닉네임은 ${max === 6 ? '2~6' : '2~12'}자로 입력해 주세요.`, length: value.length, max }
  }
  return { valid: true, length: value.length, max }
}
