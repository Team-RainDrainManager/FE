// 카메라 숫자 기준은 전부 여기서 고칩니다. 별도 표시가 없으면 값은 촬영기 앱(bitmul-camera)과 같습니다.
export const CAMERA = {
  /** 찍을 때 만드는 원본의 긴 변. 원본은 자르는 데만 쓰고 서버로 보내지 않습니다. */
  maxLongEdge: 1920,
  /** 촬영 틀이자 빨간 박스의 처음 위치 (사진 폭·높이 대비 비율) */
  guide: { x: 0.15, y: 0.25, w: 0.7, h: 0.5 },
  /** 빨간 박스를 한 변마다 이만큼(박스 크기 대비) 넓힌 범위가 흰 점선이고, 서버로 보내는 범위입니다. */
  contextPadding: 0.2,
  /** 빨간 박스 최소 크기 (사진 대비) */
  minBoxSize: 0.05,
  /** 서버로 보내는 잘린 사진 */
  upload: { longEdge: 768, jpegQuality: 0.9 },
  /** 찍기 전 실시간 검사 */
  live: {
    analysisWidth: 160,
    analysisFps: 8,
    /** 이 시간 동안 멈춰 있어야 멈췄다고 봅니다. */
    stableMs: 700,
    /** 자동 촬영 카운트다운 */
    countdownSteps: 3,
    countdownStepMs: 400,
    /** 움직임 센서 기준: 회전 속도(도/초)와 가속도(m/s²) */
    maxRotationDegPerSec: 15,
    maxAccel: 0.8,
    /** 센서가 없을 때 화면 변화량(0~255 평균 차이) 기준 */
    maxFrameDiff: 6,
    minSharpness: 35,
    /** 폰 기울기(beta): 0 = 바닥을 수직으로 내려다봄, 90 = 정면 */
    minTilt: -15,
    maxTilt: 60,
  },
  /** 어두움이 이 시간 동안 이어지면 촬영 화면마다 한 번 플래시를 자동으로 켭니다. */
  torch: { autoOnAfterMs: 1000, noteMs: 4000 },
  /** 찍은 뒤 품질 경고 */
  quality: { analysisWidth: 320, minSharpness: 25, minBrightness: 45, maxBrightness: 235 },
  /** 기본 카메라 앱으로 찍은 사진은 이 시간 안에 찍은 것만 받습니다. (이 앱에서 정한 값) */
  nativePhotoMaxAgeMs: 5 * 60 * 1000,
  /** 찍은 지 이 시간이 지난 사진은 다시 찍게 합니다. 서버 capture-max-age-minutes와 같은 값입니다. */
  photoMaxAgeMs: 30 * 60 * 1000,
  /** 이보다 멀면 서버가 사진을 받지 않습니다. 서버 location-mismatch-meters와 같은 값입니다. */
  locationLimitM: 50,
  /** 위치 오차가 이보다 크면 화면에 함께 보여 줍니다. */
  showAccuracyOverM: 25,
  /** 찍을 때의 위치를 이 시간까지만 믿습니다. 더 오래되면 보낼 때 다시 잽니다. */
  gpsMaxAgeMs: 30_000,
  /** 청소 후 촬영 때 겹쳐 보여 주는 청소 전 사진의 불투명도 */
  referenceOpacity: 0.35,
} as const
