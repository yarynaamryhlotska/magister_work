import {
  Check,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Square,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import DashboardHeader from '../components/DashboardHeader'

import './VoiceEntryPage.css'


interface AnalysisResult {
  id: number
  emotion: string
  confidence: number

  anger_score?: number | null
  disgust_score?: number | null
  fear_score?: number | null
  joy_score?: number | null
  neutral_score?: number | null
  sadness_score?: number | null
  surprise_score?: number | null

  recommendation: string | null
  created_at: string
}


interface VoiceEntry {
  id: number
  file_path: string
  duration_seconds: number | null
  transcription: string | null
}


interface DiaryEntry {
  id: number
  user_id: number
  status: string
  created_at: string
  updated_at: string

  voice_entry: VoiceEntry | null
  analysis_result: AnalysisResult | null
}


type EmotionInfo = {
  key: string
  name: string
  emoji: string
  description: string
}


const emotionInfo: Record<string, EmotionInfo> = {
  anger: {
    key: 'anger',
    name: 'Злість',
    emoji: '😠',
    description:
      'У записі переважають ознаки злості або роздратування.',
  },

  angry: {
    key: 'anger',
    name: 'Злість',
    emoji: '😠',
    description:
      'У записі переважають ознаки злості або роздратування.',
  },

  disgust: {
    key: 'disgust',
    name: 'Відраза',
    emoji: '😖',
    description:
      'У записі помітні ознаки відрази або сильного неприйняття.',
  },

  fear: {
    key: 'fear',
    name: 'Страх',
    emoji: '😨',
    description:
      'У записі переважають ознаки страху, хвилювання або тривоги.',
  },

  joy: {
    key: 'joy',
    name: 'Радість',
    emoji: '😄',
    description:
      'У записі переважають позитивні емоції та відчуття радості.',
  },

  happy: {
    key: 'joy',
    name: 'Радість',
    emoji: '😄',
    description:
      'У записі переважають позитивні емоції та відчуття радості.',
  },

  neutral: {
    key: 'neutral',
    name: 'Нейтральний стан',
    emoji: '😐',
    description:
      'У записі немає яскраво вираженої домінуючої емоції.',
  },

  none: {
    key: 'neutral',
    name: 'Нейтральний стан',
    emoji: '😐',
    description:
      'У записі немає яскраво вираженої домінуючої емоції.',
  },

  sadness: {
    key: 'sadness',
    name: 'Смуток',
    emoji: '😢',
    description:
      'У записі переважають ознаки смутку або пригніченого настрою.',
  },

  sad: {
    key: 'sadness',
    name: 'Смуток',
    emoji: '😢',
    description:
      'У записі переважають ознаки смутку або пригніченого настрою.',
  },

  surprise: {
    key: 'surprise',
    name: 'Здивування',
    emoji: '😮',
    description:
      'У записі переважають ознаки здивування або несподіванки.',
  },
}


function getEmotionInfo(
  emotion: string | null | undefined,
): EmotionInfo {
  if (!emotion) {
    return {
      key: 'neutral',
      name: 'Емоція',
      emoji: '🙂',
      description:
        'Результат аналізу голосового запису.',
    }
  }

  const key = emotion
    .trim()
    .toLowerCase()

  return (
    emotionInfo[key] ?? {
      key,
      name: emotion,
      emoji: '🙂',
      description:
        'Результат аналізу голосового запису.',
    }
  )
}


function getErrorMessage(
  data: unknown,
  fallback: string,
) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'detail' in data
  ) {
    const detail = (
      data as {
        detail?: unknown
      }
    ).detail

    if (typeof detail === 'string') {
      return detail
    }
  }

  return fallback
}


function formatTime(
  seconds: number,
) {
  const minutes = Math.floor(
    seconds / 60,
  )

  const remainingSeconds =
    seconds % 60

  return `${minutes
    .toString()
    .padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`
}


function VoiceEntryPage() {
  const navigate = useNavigate()

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null,
    )

  const mediaStreamRef =
    useRef<MediaStream | null>(
      null,
    )

  const audioChunksRef =
    useRef<Blob[]>([])

  const timerRef =
    useRef<number | null>(
      null,
    )

  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    )


  const [
    isRecording,
    setIsRecording,
  ] = useState(false)

  const [
    recordedBlob,
    setRecordedBlob,
  ] = useState<Blob | null>(
    null,
  )

  const [
    audioUrl,
    setAudioUrl,
  ] = useState('')

  const [
    recordingSeconds,
    setRecordingSeconds,
  ] = useState(0)

  const [
    isPlaying,
    setIsPlaying,
  ] = useState(false)

  const [
    analyzedEntry,
    setAnalyzedEntry,
  ] = useState<DiaryEntry | null>(
    null,
  )

  const [
    isAnalyzing,
    setIsAnalyzing,
  ] = useState(false)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')


  const result =
    analyzedEntry?.analysis_result ??
    null

  const transcription =
    analyzedEntry?.voice_entry
      ?.transcription ?? ''


  const currentEmotion =
    useMemo(
      () =>
        getEmotionInfo(
          result?.emotion,
        ),
      [result?.emotion],
    )


  const confidencePercent =
    result
      ? Math.round(
          Number(
            result.confidence,
          ) * 100,
        )
      : 0


  const stopMediaStream = () => {
    mediaStreamRef.current
      ?.getTracks()
      .forEach((track) => {
        track.stop()
      })

    mediaStreamRef.current = null
  }


  const stopTimer = () => {
    if (
      timerRef.current !== null
    ) {
      window.clearInterval(
        timerRef.current,
      )

      timerRef.current = null
    }
  }


  useEffect(() => {
    return () => {
      stopTimer()
      stopMediaStream()

      if (audioUrl) {
        URL.revokeObjectURL(
          audioUrl,
        )
      }
    }
  }, [audioUrl])


  const startRecording =
    async () => {
      try {
        setError('')
        setAnalyzedEntry(null)
        setIsPlaying(false)

        if (audioUrl) {
          URL.revokeObjectURL(
            audioUrl,
          )

          setAudioUrl('')
        }

        setRecordedBlob(null)
        setRecordingSeconds(0)

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getUserMedia
        ) {
          throw new Error(
            'Цей браузер не підтримує запис з мікрофона.',
          )
        }

        if (
          typeof MediaRecorder ===
          'undefined'
        ) {
          throw new Error(
            'Запис аудіо не підтримується цим браузером.',
          )
        }

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: true,
            })

        mediaStreamRef.current =
          stream

        let options:
          MediaRecorderOptions =
          {}

        if (
          MediaRecorder.isTypeSupported(
            'audio/webm;codecs=opus',
          )
        ) {
          options = {
            mimeType:
              'audio/webm;codecs=opus',
          }
        } else if (
          MediaRecorder.isTypeSupported(
            'audio/webm',
          )
        ) {
          options = {
            mimeType:
              'audio/webm',
          }
        }

        const recorder =
          new MediaRecorder(
            stream,
            options,
          )

        mediaRecorderRef.current =
          recorder

        audioChunksRef.current = []

        recorder.ondataavailable = (
          event,
        ) => {
          if (
            event.data.size > 0
          ) {
            audioChunksRef.current.push(
              event.data,
            )
          }
        }

        recorder.onstop = () => {
          const mimeType =
            recorder.mimeType ||
            'audio/webm'

          const blob =
            new Blob(
              audioChunksRef.current,
              {
                type: mimeType,
              },
            )

          if (blob.size === 0) {
            setError(
              'Не вдалося створити голосовий запис. Спробуй ще раз.',
            )

            stopMediaStream()
            return
          }

          const url =
            URL.createObjectURL(
              blob,
            )

          setRecordedBlob(blob)
          setAudioUrl(url)

          stopMediaStream()
        }

        recorder.start()

        setIsRecording(true)

        timerRef.current =
          window.setInterval(
            () => {
              setRecordingSeconds(
                (previous) =>
                  previous + 1,
              )
            },
            1000,
          )
      } catch (recordError) {
        stopTimer()
        stopMediaStream()

        setIsRecording(false)

        if (
          recordError instanceof
            DOMException &&
          (
            recordError.name ===
              'NotAllowedError' ||
            recordError.name ===
              'PermissionDeniedError'
          )
        ) {
          setError(
            'Надай браузеру доступ до мікрофона, щоб записати голос.',
          )

          return
        }

        setError(
          recordError instanceof Error
            ? recordError.message
            : 'Не вдалося увімкнути мікрофон.',
        )
      }
    }


  const stopRecording = () => {
    const recorder =
      mediaRecorderRef.current

    if (
      recorder &&
      recorder.state !==
        'inactive'
    ) {
      recorder.stop()
    }

    stopTimer()
    setIsRecording(false)
  }


  const resetRecording = () => {
    if (isRecording) {
      const recorder =
        mediaRecorderRef.current

      if (
        recorder &&
        recorder.state !==
          'inactive'
      ) {
        recorder.stop()
      }
    }

    stopTimer()
    stopMediaStream()

    if (audioUrl) {
      URL.revokeObjectURL(
        audioUrl,
      )
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    setAudioUrl('')
    setRecordedBlob(null)
    setRecordingSeconds(0)
    setIsRecording(false)
    setIsPlaying(false)
    setAnalyzedEntry(null)
    setError('')

    audioChunksRef.current = []
  }


  const togglePlayback =
    async () => {
      const audio =
        audioRef.current

      if (!audio) {
        return
      }

      try {
        if (audio.paused) {
          await audio.play()
        } else {
          audio.pause()
        }
      } catch {
        setError(
          'Не вдалося відтворити голосовий запис.',
        )
      }
    }


  const handleAnalyze =
    async () => {
      if (!recordedBlob) {
        setError(
          'Спочатку запиши голосове повідомлення.',
        )

        return
      }

      const token =
        localStorage.getItem(
          'accessToken',
        )

      if (!token) {
        navigate(
          '/login',
          {
            replace: true,
          },
        )

        return
      }

      try {
        setIsAnalyzing(true)
        setError('')
        setAnalyzedEntry(null)

        const formData =
          new FormData()

        let extension = 'webm'

        if (
          recordedBlob.type.includes(
            'ogg',
          )
        ) {
          extension = 'ogg'
        } else if (
          recordedBlob.type.includes(
            'mp4',
          )
        ) {
          extension = 'm4a'
        }

        formData.append(
          'audio',
          recordedBlob,
          `voice.${extension}`,
        )

        const response =
          await fetch(
            'http://127.0.0.1:8000/diary/voice',
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              body: formData,
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'Не вдалося проаналізувати голосовий запис.',
            ),
          )
        }

        setAnalyzedEntry(
          data as DiaryEntry,
        )
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не вдалося проаналізувати голосовий запис.',
        )
      } finally {
        setIsAnalyzing(false)
      }
    }


  const handleSave =
    async () => {
      if (!analyzedEntry) {
        return
      }

      const token =
        localStorage.getItem(
          'accessToken',
        )

      if (!token) {
        navigate(
          '/login',
          {
            replace: true,
          },
        )

        return
      }

      try {
        setIsSaving(true)
        setError('')

        const response =
          await fetch(
            `http://127.0.0.1:8000/diary/${analyzedEntry.id}/complete`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'Не вдалося зберегти запис.',
            ),
          )
        }

        navigate(
          '/dashboard/history',
        )
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не вдалося зберегти запис.',
        )
      } finally {
        setIsSaving(false)
      }
    }


  return (
    <main className="voice-entry-page">

      <div className="voice-entry-background voice-entry-background-one" />
      <div className="voice-entry-background voice-entry-background-two" />


      {}
      <DashboardHeader />


      <section className="voice-entry-content">

        <div className="voice-entry-intro">

          <span className="voice-entry-eyebrow">
            <Mic size={16} />
            Голосовий запис
          </span>

          <h1>
            Розкажи, як минув твій день
          </h1>

          <p>
            Запиши голосове повідомлення.
            MOVA перетворить мовлення у текст
            та проаналізує емоційний стан.
          </p>

        </div>


        <div className="voice-entry-layout">

          {/* ==============================
              RECORDING
          ============================== */}

          <article className="voice-entry-card">

            <div className="voice-entry-card-heading">

              <span className="voice-entry-card-icon">
                <Mic size={22} />
              </span>

              <div>
                <strong>
                  Твій голос
                </strong>

                <small>
                  Розкажи про свої думки та почуття
                </small>
              </div>

            </div>


            <div
              className={
                isRecording
                  ? 'voice-recorder voice-recorder-active'
                  : 'voice-recorder'
              }
            >

              <div className="voice-recorder-icon">

                {isRecording ? (
                  <span className="voice-recording-pulse">
                    <Mic size={31} />
                  </span>
                ) : (
                  <Mic size={31} />
                )}

              </div>


              <div className="voice-recorder-time">
                {formatTime(
                  recordingSeconds,
                )}
              </div>


              <p>
                {isRecording
                  ? 'Запис триває. Говори природно та не поспішай.'
                  : recordedBlob
                    ? 'Запис готовий. Можеш прослухати його або записати ще раз.'
                    : 'Натисни кнопку нижче, щоб почати запис.'}
              </p>


              {!isRecording &&
                !recordedBlob && (
                  <button
                    className="voice-start-button"
                    type="button"
                    onClick={
                      startRecording
                    }
                    disabled={
                      isAnalyzing ||
                      isSaving
                    }
                  >
                    <Mic size={19} />
                    Почати запис
                  </button>
                )}


              {isRecording && (
                <button
                  className="voice-stop-button"
                  type="button"
                  onClick={
                    stopRecording
                  }
                >
                  <Square size={17} />
                  Зупинити запис
                </button>
              )}


              {!isRecording &&
                recordedBlob &&
                audioUrl && (
                  <div className="voice-recorded-actions">

                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onPlay={() =>
                        setIsPlaying(
                          true,
                        )
                      }
                      onPause={() =>
                        setIsPlaying(
                          false,
                        )
                      }
                      onEnded={() =>
                        setIsPlaying(
                          false,
                        )
                      }
                    />


                    <button
                      className="voice-play-button"
                      type="button"
                      onClick={
                        togglePlayback
                      }
                      disabled={
                        isAnalyzing ||
                        isSaving
                      }
                    >
                      {isPlaying ? (
                        <Pause
                          size={18}
                        />
                      ) : (
                        <Play
                          size={18}
                        />
                      )}

                      {isPlaying
                        ? 'Пауза'
                        : 'Прослухати'}
                    </button>


                    <button
                      className="voice-reset-button"
                      type="button"
                      onClick={
                        resetRecording
                      }
                      disabled={
                        isAnalyzing ||
                        isSaving
                      }
                    >
                      <RotateCcw
                        size={17}
                      />
                      Записати ще раз
                    </button>

                  </div>
                )}

            </div>


            {error && (
              <div className="voice-entry-error">
                {error}
              </div>
            )}


            {recordedBlob &&
              !isRecording && (
                <button
                  className="voice-entry-analyze"
                  type="button"
                  onClick={
                    handleAnalyze
                  }
                  disabled={
                    isAnalyzing ||
                    isSaving
                  }
                >

                  {isAnalyzing ? (
                    <>
                      <LoaderCircle
                        className="voice-entry-spinner"
                        size={19}
                      />
                      Аналізуємо...
                    </>
                  ) : (
                    <>
                      <Sparkles
                        size={19}
                      />
                      Аналізувати
                    </>
                  )}

                </button>
              )}

          </article>


          {/* ==============================
              RESULT
          ============================== */}

          <article
            className={
              result
                ? 'voice-result-card voice-result-card-ready'
                : 'voice-result-card'
            }
          >

            {!result ? (

              <div className="voice-result-empty">

                <span>
                  <Sparkles
                    size={29}
                  />
                </span>

                <h2>
                  Результат аналізу
                </h2>

                <p>
                  Запиши голосове повідомлення
                  та натисни «Аналізувати».
                  Тут з’явиться визначена
                  емоція та результат аналізу.
                </p>

              </div>

            ) : (

              <>
                <div className="voice-result-top">

                  <span>
                    Результат аналізу
                  </span>

                  <span className="voice-result-status">
                    <Check size={14} />
                    Проаналізовано
                  </span>

                </div>


                <div className="voice-result-main">

                  <div className="voice-result-emoji">
                    {
                      currentEmotion.emoji
                    }
                  </div>

                  <div>

                    <small>
                      Основна емоція
                    </small>

                    <h2>
                      {
                        currentEmotion.name
                      }
                    </h2>

                    <p>
                      Впевненість аналізу —{' '}
                      <strong>
                        {confidencePercent}%
                      </strong>
                    </p>

                  </div>

                </div>


                <div className="voice-result-confidence">

                  <div>
                    <span>
                      {
                        currentEmotion.name
                      }
                    </span>

                    <strong>
                      {confidencePercent}%
                    </strong>
                  </div>


                  <div className="voice-result-progress">
                    <span
                      style={{
                        width:
                          `${Math.min(
                            100,
                            Math.max(
                              0,
                              confidencePercent,
                            ),
                          )}%`,
                      }}
                    />
                  </div>

                </div>


                {transcription && (
                  <div className="voice-transcription">

                    <div className="voice-transcription-title">
                      <Mic size={16} />
                      <strong>
                        Розпізнаний текст
                      </strong>
                    </div>

                    <p>
                      {transcription}
                    </p>

                  </div>
                )}


                <div className="voice-result-description">

                  <Sparkles size={17} />

                  <p>
                    {
                      currentEmotion.description
                    }
                  </p>

                </div>


                <button
                  className="voice-entry-save"
                  type="button"
                  onClick={
                    handleSave
                  }
                  disabled={
                    isSaving
                  }
                >

                  {isSaving ? (
                    <>
                      <LoaderCircle
                        className="voice-entry-spinner"
                        size={19}
                      />
                      Зберігаємо...
                    </>
                  ) : (
                    <>
                      <Save size={19} />
                      Зберегти запис
                    </>
                  )}

                </button>
              </>

            )}

          </article>

        </div>

      </section>

    </main>
  )
}


export default VoiceEntryPage