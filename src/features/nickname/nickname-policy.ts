const MIN_NICKNAME_LENGTH = 2
const MAX_NICKNAME_LENGTH = 20

export const NICKNAME_LENGTH_HINT = `닉네임을 ${MIN_NICKNAME_LENGTH}~${MAX_NICKNAME_LENGTH}자로 입력해 주세요.`

type NicknameValidation =
  | { valid: true; value: string }
  | { valid: false; reason: string }

export function validateNickname(raw: string): NicknameValidation {
  const value = raw.trim()

  // 앱에서 강제 닉네임 변경을 표시할 때 사용하는 값입니다.
  if (value === '이용제한') {
    return { valid: false, reason: '사용할 수 없는 닉네임입니다.' }
  }
  if (value.length < MIN_NICKNAME_LENGTH || value.length > MAX_NICKNAME_LENGTH) {
    return { valid: false, reason: NICKNAME_LENGTH_HINT }
  }
  return { valid: true, value }
}
