'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const VOICES = [
  { id: 'af_heart',   label: 'Heart',   g: '♀' },
  { id: 'af_bella',   label: 'Bella',   g: '♀' },
  { id: 'af_sarah',   label: 'Sarah',   g: '♀' },
  { id: 'am_adam',    label: 'Adam',    g: '♂' },
  { id: 'am_michael', label: 'Michael', g: '♂' },
  { id: 'bf_emma',    label: 'Emma',    g: '♀' },
  { id: 'bm_george',  label: 'George',  g: '♂' },
]

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

type Stage = 'idle' | 'loading' | 'synthesizing' | 'playing' | 'paused' | 'done' | 'error'

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [text])
    .map(s => s.trim())
    .filter(s => s.length > 4)
}

export function TTSPanel({ text, onClose }: { text: string; onClose: () => void }) {
  const [stage, setStage]         = useState<Stage>('idle')
  const [modelPct, setModelPct]   = useState(0)
  const [voice, setVoice]         = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('aziza_default_voice') ?? 'af_heart') : 'af_heart'
  )
  const [speed, setSpeed]         = useState(1)
  const [idx, setIdx]             = useState(0)
  const [error, setError]         = useState<string | null>(null)

  const sentences  = useRef<string[]>([])
  const ttsRef     = useRef<any>(null)
  const audioCtx   = useRef<AudioContext | null>(null)
  const sourceNode = useRef<AudioBufferSourceNode | null>(null)
  const stageRef   = useRef<Stage>('idle')
  const voiceRef   = useRef(voice)
  const speedRef   = useRef(speed)

  stageRef.current = stage
  voiceRef.current = voice
  speedRef.current = speed

  useEffect(() => {
    sentences.current = splitSentences(text)
  }, [text])

  // Update current source speed on change
  useEffect(() => {
    if (sourceNode.current) sourceNode.current.playbackRate.value = speed
  }, [speed])

  async function loadModel(): Promise<any> {
    if (ttsRef.current) return ttsRef.current
    setStage('loading')
    try {
      const { KokoroTTS } = await import('kokoro-js')
      const tts = await (KokoroTTS as any).from_pretrained('onnx-community/Kokoro-82M-v1.0', {
        dtype: 'q8',
        progress_callback: (info: any) => {
          if (info.status === 'progress') setModelPct(Math.round(info.progress ?? 0))
        },
      })
      ttsRef.current = tts
      return tts
    } catch (e: any) {
      setError(e.message ?? 'Failed to load voice model')
      setStage('error')
      return null
    }
  }

  const playFrom = useCallback(async (startIdx: number) => {
    const tts = await loadModel()
    if (!tts) return

    const list = sentences.current
    if (startIdx >= list.length) { setStage('done'); return }

    setIdx(startIdx)
    setStage('synthesizing')

    try {
      const output = await tts.generate(list[startIdx], { voice: voiceRef.current })

      if (stageRef.current === 'idle' || stageRef.current === 'done') return

      const ctx = audioCtx.current ?? new AudioContext()
      audioCtx.current = ctx

      const buf = ctx.createBuffer(1, output.audio.length, output.sampling_rate)
      buf.copyToChannel(output.audio, 0)

      const src = ctx.createBufferSource()
      src.buffer = buf
      src.playbackRate.value = speedRef.current
      src.connect(ctx.destination)
      sourceNode.current = src

      setStage('playing')
      src.start()

      src.onended = () => {
        if (stageRef.current === 'playing') playFrom(startIdx + 1)
      }
    } catch (e: any) {
      setError(e.message ?? 'Synthesis failed')
      setStage('error')
    }
  }, [])

  function stop(resetIdx = true) {
    try { sourceNode.current?.stop() } catch {}
    if (resetIdx) setIdx(0)
    setStage('idle')
  }

  function pause() {
    try { sourceNode.current?.stop() } catch {}
    setStage('paused')
  }

  const isActive = stage === 'synthesizing' || stage === 'playing'
  const current  = sentences.current[idx] ?? ''

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ background: '#131210', borderColor: '#2E2820', animation: 'slide-up 250ms ease both' }}
    >
      {/* Model load progress bar */}
      {stage === 'loading' && (
        <div className="h-0.5" style={{ background: '#252118' }}>
          <div className="h-full transition-all duration-300" style={{ width: `${modelPct}%`, background: '#C8852A' }} />
        </div>
      )}

      <div className="px-5 pt-3 pb-4 max-w-2xl mx-auto">

        {/* Current sentence */}
        <div
          className="text-sm leading-relaxed mb-3 line-clamp-2 min-h-[2.5rem]"
          style={{
            color: isActive ? '#F0E8D8' : '#6A5840',
            fontFamily: "'Spectral', serif",
            fontStyle: 'italic',
          }}
        >
          {stage === 'loading'      ? `Loading voice model… ${modelPct}%`  :
           stage === 'idle'         ? (text.trim() ? 'Press play to start listening' : 'No text on this page — navigate to a text page') :
           stage === 'done'         ? 'Finished'                            :
           stage === 'error'        ? (error ?? 'Error')                    :
           stage === 'paused'       ? `Paused — ${current}`                 :
           current}
        </div>

        {/* Voice + Speed */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={voice}
            onChange={e => setVoice(e.target.value)}
            disabled={isActive}
            className="text-[0.72rem] px-2 py-1.5 rounded-lg flex-1"
            style={{ background: '#1C1915', border: '1px solid #2E2820', color: '#A8947C', outline: 'none' }}
          >
            {VOICES.map(v => (
              <option key={v.id} value={v.id}>{v.g} {v.label}</option>
            ))}
          </select>

          <div className="flex gap-1">
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-2 py-1 rounded text-[0.68rem] font-medium transition-colors"
                style={{
                  background: speed === s ? 'rgba(200,133,42,0.15)' : '#1C1915',
                  color: speed === s ? '#C8852A' : '#6A5840',
                  border: `1px solid ${speed === s ? '#C8852A' : '#2E2820'}`,
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <span className="text-[0.65rem] tabular-nums" style={{ color: '#6A5840' }}>
            {sentences.current.length > 0 ? `${idx + 1} / ${sentences.current.length}` : ''}
          </span>

          <div className="flex items-center gap-2">
            {/* Stop */}
            <button
              onClick={() => stop()}
              disabled={stage === 'idle' || stage === 'loading'}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: '#1C1915', color: '#6A5840' }}
              aria-label="Stop"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            </button>

            {/* Play / Pause / Resume */}
            {isActive ? (
              <button
                onClick={pause}
                className="w-12 h-12 flex items-center justify-center rounded-full"
                style={{ background: '#C8852A', color: '#0C0B09' }}
                aria-label="Pause"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={() => playFrom(stage === 'paused' || stage === 'done' ? idx : 0)}
                disabled={stage === 'loading'}
                className="w-12 h-12 flex items-center justify-center rounded-full"
                style={{ background: '#C8852A', color: '#0C0B09', opacity: stage === 'loading' ? 0.6 : 1 }}
                aria-label="Play"
              >
                {stage === 'loading' ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                )}
              </button>
            )}

            {/* Skip forward one sentence */}
            <button
              onClick={() => {
                stop(false)
                const next = Math.min(sentences.current.length - 1, idx + 1)
                setIdx(next)
                playFrom(next)
              }}
              disabled={!isActive && stage !== 'paused'}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: '#1C1915', color: '#6A5840' }}
              aria-label="Next sentence"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,4 15,12 5,20"/>
                <rect x="17" y="4" width="2" height="16" rx="1"/>
              </svg>
            </button>
          </div>

          {/* Close */}
          <button
            onClick={() => { stop(); onClose() }}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: '#1C1915', color: '#6A5840' }}
            aria-label="Close TTS panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
