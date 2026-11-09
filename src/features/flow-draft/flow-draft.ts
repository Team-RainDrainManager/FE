// 입양·점검처럼 서버 기록이 이어지는 흐름의 진행 상황을 창을 닫아도 남깁니다.
// 입력값과 서버 id는 localStorage에, 찍은 사진은 메모리와 탭 저장소(sessionStorage)에 둡니다.
// 사진까지 탭 저장소에 두는 이유: 청소하는 동안 폰이 잠겼다 돌아오면 브라우저가 새로고침할 수 있습니다.
// 로그인도 탭 저장소를 쓰므로 탭을 닫으면 사진과 로그인이 함께 사라집니다.

const PREFIX = 'ddorang:flow-draft:v1:'
/** 이 시간이 지난 진행 상황은 버리고 처음부터 합니다. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

type Stored<T> = { savedAt: number; data: T }
type Photos = Record<string, File | null>
type StoredPhoto = { name: string; lastModified: number; dataUrl: string }

const photoMemory = new Map<string, Photos>()
/** 탭 저장소에 저장했거나 저장 중인 사진입니다. 같은 사진을 다시 변환하지 않습니다. */
const persistedPhotos = new Map<string, File>()

const photoStorageKey = (key: string, name: string) => `${key}:photo:${name}`

function persistPhoto(key: string, name: string, file: File | null) {
  const storageKey = photoStorageKey(key, name)

  if (!file) {
    persistedPhotos.delete(storageKey)
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // 저장소를 쓸 수 없으면 지울 것도 없습니다.
    }
    return
  }

  if (persistedPhotos.get(storageKey) === file) return
  persistedPhotos.set(storageKey, file)

  const reader = new FileReader()
  reader.onload = () => {
    // 변환하는 사이에 다시 찍었거나 지웠으면 저장하지 않습니다.
    if (persistedPhotos.get(storageKey) !== file) return
    const stored: StoredPhoto = {
      name: file.name,
      lastModified: file.lastModified,
      dataUrl: String(reader.result),
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(stored))
    } catch {
      // 용량이 모자라면 메모리에만 남습니다. 새로고침하면 다시 찍으면 됩니다.
    }
  }
  reader.readAsDataURL(file)
}

function restorePhoto(key: string, name: string): File | null {
  try {
    const raw = sessionStorage.getItem(photoStorageKey(key, name))
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredPhoto
    const binary = atob(stored.dataUrl.split(',')[1])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const file = new File([bytes], stored.name, {
      type: 'image/jpeg',
      lastModified: stored.lastModified,
    })
    persistedPhotos.set(photoStorageKey(key, name), file)
    return file
  } catch {
    return null
  }
}

export function flowDraftKey(
  flow: 'adoption' | 'inspection',
  account: number | null,
  ...ids: Array<string | number | undefined>
): string {
  return [PREFIX + flow, account ?? 'unknown', ...ids.map((id) => id ?? '-')].join(':')
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const stored = JSON.parse(raw) as Stored<T>
    if (Date.now() - stored.savedAt > DRAFT_TTL_MS) {
      clearDraft(key)
      return null
    }
    return stored.data
  } catch {
    return null
  }
}

export function loadDraftPhoto(key: string, name: string): File | null {
  return photoMemory.get(key)?.[name] ?? restorePhoto(key, name)
}

export function saveDraft<T>(key: string, data: T, photos: Photos): void {
  photoMemory.set(key, photos)
  for (const [name, file] of Object.entries(photos)) {
    persistPhoto(key, name, file)
  }
  try {
    const stored: Stored<T> = { savedAt: Date.now(), data }
    localStorage.setItem(key, JSON.stringify(stored))
  } catch {
    // 저장소를 쓸 수 없는 브라우저면 이번 탭의 메모리에만 남습니다.
  }
}

export function clearDraft(key: string): void {
  const photos = photoMemory.get(key)
  photoMemory.delete(key)
  for (const name of new Set([...Object.keys(photos ?? {}), 'before', 'after'])) {
    persistPhoto(key, name, null)
  }
  try {
    localStorage.removeItem(key)
  } catch {
    // 저장소를 쓸 수 없으면 지울 것도 없습니다.
  }
}
