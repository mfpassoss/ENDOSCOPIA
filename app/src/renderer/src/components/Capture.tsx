import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../toast'
import { errMsg } from '../util'

interface Props {
  examId: number
  nextLabel: string
  deviceId: string
  onDevice: (id: string) => void
  onCaptured: () => void
}

/** Preview ao vivo da placa de captura / câmera e captura de quadro (JPEG). */
export function Capture({ examId, nextLabel, deviceId, onDevice, onCaptured }: Props): JSX.Element {
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [busy, setBusy] = useState(false)

  const listDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(all.filter((d) => d.kind === 'videoinput'))
    } catch {
      /* ignora */
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    stop()
    setStatus('starting')
    setError('')
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('live')
      await listDevices() // após permissão, os nomes dos dispositivos ficam disponíveis
      if (!deviceId) {
        const id = stream.getVideoTracks()[0]?.getSettings().deviceId
        if (id) onDevice(id)
      }
    } catch (e) {
      setStatus('error')
      setError(errMsg(e))
    }
  }, [deviceId, listDevices, onDevice, stop])

  useEffect(() => {
    listDevices()
    start()
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  const capture = useCallback(async () => {
    const v = videoRef.current
    if (!v || status !== 'live' || busy) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = v.videoWidth
      canvas.height = v.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(v, 0, 0)
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      if (!blob) throw new Error('Falha ao capturar quadro')
      setFlash(true)
      setTimeout(() => setFlash(false), 300)
      await window.api.photos.capture(examId, await blob.arrayBuffer())
      onCaptured()
    } catch (e) {
      toast(errMsg(e), true)
    } finally {
      setBusy(false)
    }
  }, [busy, examId, onCaptured, status, toast])

  // Atalhos: Espaço ou F9 capturam (quando não está digitando num campo)
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === 'F9' || (e.code === 'Space' && !typing)) {
        e.preventDefault()
        capture()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [capture])

  return (
    <div className="capture">
      <div className="video-box">
        <video ref={videoRef} muted playsInline />
        <div className={'flash' + (flash ? ' on' : '')} />
        {status !== 'live' && (
          <div className="overlay">
            {status === 'starting' && 'Conectando ao dispositivo de vídeo…'}
            {status === 'idle' && 'Vídeo parado.'}
            {status === 'error' && (
              <>
                <b>Não foi possível abrir o vídeo.</b>
                <br />
                <span style={{ fontSize: 12 }}>{error}</span>
                <br />
                <span style={{ fontSize: 12 }}>Verifique se a placa de captura está conectada e se outro programa (ex.: Debut) não está usando o dispositivo.</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="capture-side">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Dispositivo de vídeo</label>
          <select value={deviceId} onChange={(e) => onDevice(e.target.value)}>
            <option value="">(padrão)</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Dispositivo ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
        <div className="next-slot">
          <span className="muted" style={{ fontSize: 12 }}>
            Próxima foto
          </span>
          <b>{nextLabel || 'Foto adicional'}</b>
        </div>
        <button className="btn accent lg" onClick={capture} disabled={status !== 'live' || busy}>
          📷 Capturar
        </button>
        <div className="muted" style={{ fontSize: 12 }}>
          Atalhos: <kbd>Espaço</kbd> ou <kbd>F9</kbd>. Cada captura entra na próxima legenda do modelo; você pode reordenar ou renomear depois.
        </div>
        <div className="row">
          {status === 'live' ? (
            <button className="btn sm" onClick={stop}>
              Parar vídeo
            </button>
          ) : (
            <button className="btn sm" onClick={start}>
              Reconectar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
