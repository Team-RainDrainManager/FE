import { CAMERA } from './config'

type PermissionFn = () => Promise<'granted' | 'denied'>
type PermissionApi = { requestPermission?: PermissionFn }

/**
 * 아이폰은 움직임·기울기 센서를 쓰려면 버튼을 누른 순간에 권한을 물어야 합니다.
 * 카메라를 여는 버튼의 클릭 처리 함수 안에서 바로 부르세요. 거절해도 촬영은 할 수 있습니다.
 */
export async function requestMotionPermission(): Promise<void> {
  const motion = (window as unknown as { DeviceMotionEvent?: PermissionApi }).DeviceMotionEvent
  const orientation = (window as unknown as { DeviceOrientationEvent?: PermissionApi })
    .DeviceOrientationEvent
  const asks: Promise<'granted' | 'denied'>[] = []
  if (motion?.requestPermission) asks.push(motion.requestPermission())
  if (orientation?.requestPermission) asks.push(orientation.requestPermission())
  try {
    await Promise.all(asks)
  } catch {
    // 권한을 쓸 수 없으면 화면 변화량으로 흔들림을 잽니다.
  }
}

/** 폰이 멈춰 있는지와 얼마나 기울었는지 센서로 따라갑니다. */
export class MotionWatcher {
  available = false
  beta: number | null = null
  private lastMovingAt = 0

  private onMotion = (event: DeviceMotionEvent) => {
    const rotation = event.rotationRate
    const acceleration = event.acceleration
    const hasRotation =
      rotation?.alpha != null && rotation.beta != null && rotation.gamma != null
    const hasAcceleration =
      acceleration?.x != null && acceleration.y != null && acceleration.z != null
    if (!hasRotation && !hasAcceleration) return
    this.available = true
    const rotationSpeed = hasRotation
      ? Math.hypot(rotation.alpha!, rotation.beta!, rotation.gamma!)
      : 0
    const accelerationSize = hasAcceleration
      ? Math.hypot(acceleration.x!, acceleration.y!, acceleration.z!)
      : 0
    if (
      rotationSpeed > CAMERA.live.maxRotationDegPerSec ||
      accelerationSize > CAMERA.live.maxAccel
    ) {
      this.lastMovingAt = performance.now()
    }
  }

  private onOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta !== null) this.beta = event.beta
  }

  start() {
    this.lastMovingAt = performance.now()
    window.addEventListener('devicemotion', this.onMotion)
    window.addEventListener('deviceorientation', this.onOrientation)
  }

  stop() {
    window.removeEventListener('devicemotion', this.onMotion)
    window.removeEventListener('deviceorientation', this.onOrientation)
  }

  /** 마지막으로 움직인 뒤 지난 시간(ms). 센서가 없으면 null입니다. */
  stillFor(now: number): number | null {
    return this.available ? now - this.lastMovingAt : null
  }
}
