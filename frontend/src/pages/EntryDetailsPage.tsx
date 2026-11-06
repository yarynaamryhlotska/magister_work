import {
  ArrowLeft,
  CalendarDays,
  Camera,
  FileText,
  Mic,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import './EntryDetailsPage.css'


interface AnalysisResult {
  id?: number
  emotion?: string | null
  confidence?: number | null

  anger_score?: number | null
  disgust_score?: number | null
  fear_score?: number | null
  joy_score?: number | null
  neutral_score?: number | null
  sadness_score?: number | null
  surprise_score?: number | null

  recommendation?: string | null
}


interface TextEntry {
  id?: number
  content?: string | null
}


interface VoiceEntry {
  id?: number
  file_path?: string | null
  duration_seconds?: number | null
  transcription?: string | null
}


interface ImageEntry {
  id?: number
  file_path?: string | null
}


interface DiaryEntry {
  id: number
  status: string
  created_at: string

  text_entry?: TextEntry | null
  voice_entry?: VoiceEntry | null
  image_entry?: ImageEntry | null
  analysis_result?: AnalysisResult | null
}


const emotionNames: Record<string, string> = {
  angry: 'Злість',
  anger: 'Злість',

  disgust: 'Відраза',

  fear: 'Страх',

  happy: 'Радість',
  joy: 'Радість',

  neutral: 'Нейтральний стан',

  sad: 'Сум',
  sadness: 'Сум',

  surprise: 'Здивування',
}


const emotionScoreNames: Record<string, string> = {
  anger_score: 'Злість',
  disgust_score: 'Відраза',
  fear_score: 'Страх',
  joy_score: 'Радість',
  neutral_score: 'Нейтральний стан',
  sadness_score: 'Сум',
  surprise_score: 'Здивування',
}


function formatPercent(
  value?: number | null,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '0.0%'
  }

  const percent =
    value <= 1
      ? value * 100
      : value

  return `${percent.toFixed(1)}%`
}


function getPercentNumber(
  value?: number | null,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0
  }

  return value <= 1
    ? value * 100
    : value
}


function formatDate(
  date: string,
) {
  return new Intl.DateTimeFormat(
    'uk-UA',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(
    new Date(date),
  )
}


function formatDuration(
  seconds?: number | null,
) {
  if (
    seconds === null ||
    seconds === undefined ||
    Number.isNaN(seconds)
  ) {
    return null
  }

  const totalSeconds =
    Math.max(
      0,
      Math.round(seconds),
    )

  const minutes =
    Math.floor(
      totalSeconds / 60,
    )

  const remainingSeconds =
    totalSeconds % 60

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`
}


function getMediaUrl(
  filePath?: string | null,
) {
  if (!filePath) {
    return null
  }

  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://')
  ) {
    return filePath
  }

  const normalizedPath =
    filePath.startsWith('/')
      ? filePath
      : `/${filePath}`

  return `http://127.0.0.1:8000${normalizedPath}`
}


function EntryDetailsPage() {
  const navigate =
    useNavigate()

  const {
    entryId,
  } = useParams()


  const [
    entry,
    setEntry,
  ] = useState<DiaryEntry | null>(
    null,
  )


  const [
    isLoading,
    setIsLoading,
  ] = useState(true)


  const [
    error,
    setError,
  ] = useState('')


  useEffect(() => {
    const loadEntry =
      async () => {
        if (!entryId) {
          setError(
            'Не вдалося визначити запис.',
          )

          setIsLoading(false)

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
          setIsLoading(true)
          setError('')


          const response =
            await fetch(
              `http://127.0.0.1:8000/diary/entries/${entryId}`,
              {
                method: 'GET',

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            )


          if (!response.ok) {
            let message =
              'Не вдалося завантажити запис.'


            try {
              const data =
                await response.json()

              if (data?.detail) {
                message =
                  data.detail
              }
            } catch {
              // Залишаємо стандартне повідомлення.
            }


            throw new Error(
              message,
            )
          }


          const data =
            await response.json()


          setEntry(data)
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Сталася помилка.',
          )
        } finally {
          setIsLoading(false)
        }
      }


    loadEntry()
  }, [
    entryId,
    navigate,
  ])


  const analysis =
    entry?.analysis_result


  const emotion =
    analysis?.emotion
      ? (
          emotionNames[
            analysis.emotion
              .toLowerCase()
          ] ??
          analysis.emotion
        )
      : 'Без результату'


  /*
   * Формуємо список усіх
   * доступних оцінок емоцій.
   */

  const scores =
    analysis
      ? Object.entries(
          emotionScoreNames,
        )
          .map(
            ([
              key,
              label,
            ]) => ({
              key,
              label,

              value:
                analysis[
                  key as keyof AnalysisResult
                ],
            }),
          )
          .filter(
            item =>
              typeof item.value ===
              'number',
          )
          .sort(
            (a, b) =>
              Number(b.value) -
              Number(a.value),
          )
      : []


  /*
   * Показуємо три
   * найімовірніші емоції.
   */

  const topThreeScores =
    scores.slice(
      0,
      3,
    )


  const mainScore =
    topThreeScores[0]


  const secondaryScores =
    topThreeScores.slice(
      1,
      3,
    )


  /*
   * URL медіафайлів.
   */

  const imageUrl =
    getMediaUrl(
      entry?.image_entry
        ?.file_path,
    )


  const voiceUrl =
    getMediaUrl(
      entry?.voice_entry
        ?.file_path,
    )


  const voiceDuration =
    formatDuration(
      entry?.voice_entry
        ?.duration_seconds,
    )


  /*
   * Визначаємо тип запису.
   */

  const entryType =
    entry?.image_entry
      ? 'photo'
      : entry?.voice_entry
        ? 'voice'
        : 'text'


  /*
   * Завантаження.
   */

  if (isLoading) {
    return (
      <main className="entry-details-page">

        <div className="entry-details-status">

          <div className="entry-details-loader" />

          <p>
            Завантажуємо запис...
          </p>

        </div>

      </main>
    )
  }


  /*
   * Помилка.
   */

  if (
    error ||
    !entry
  ) {
    return (
      <main className="entry-details-page">

        <div className="entry-details-status">

          <FileText size={34} />

          <h2>
            Не вдалося відкрити запис
          </h2>

          <p>
            {
              error ||
              'Запис не знайдено.'
            }
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/dashboard/history',
              )
            }
          >
            <ArrowLeft size={18} />

            До історії
          </button>

        </div>

      </main>
    )
  }


  return (
    <main className="entry-details-page">

      {/* =========================
          HEADER
      ========================= */}

      <header className="entry-details-header">

        <button
          className="entry-details-back"
          type="button"
          onClick={() =>
            navigate(
              '/dashboard/history',
            )
          }
        >
          <ArrowLeft size={18} />

          Назад
        </button>


        <button
          className="entry-details-logo"
          type="button"
          onClick={() =>
            navigate(
              '/dashboard',
            )
          }
        >

          <span className="entry-details-logo-mark">
            M
          </span>

          <span>

            <strong>
              MOVA
            </strong>

            <small>
              ЩОДЕННИК ЕМОЦІЙ
            </small>

          </span>

        </button>


        <div className="entry-details-header-space" />

      </header>


      {/* =========================
          CONTENT
      ========================= */}

      <section className="entry-details-container">


        {/* HEADING */}

        <div className="entry-details-heading">

          <span className="entry-details-heading-icon">

            {entryType === 'photo' && (
              <Camera size={26} />
            )}

            {entryType === 'voice' && (
              <Mic size={26} />
            )}

            {entryType === 'text' && (
              <FileText size={26} />
            )}

          </span>


          <div>

            <p>
              Запис #{entry.id}
            </p>

            <h1>
              Деталі запису
            </h1>

            <span>
              Переглянь результат аналізу
              свого емоційного стану.
            </span>

          </div>

        </div>


        {/* =========================
            MAIN CARD
        ========================= */}

        <article className="entry-details-card">


          {/* CARD HEADER */}

          <div className="entry-details-card-top">

            <div className="entry-details-type">

              {entryType === 'photo' && (
                <>
                  <Camera size={18} />
                  Фото
                </>
              )}


              {entryType === 'voice' && (
                <>
                  <Mic size={18} />
                  Голос
                </>
              )}


              {entryType === 'text' && (
                <>
                  <FileText size={18} />
                  Текст
                </>
              )}

            </div>


            <div className="entry-details-date">

              <CalendarDays size={17} />

              <span>
                {
                  formatDate(
                    entry.created_at,
                  )
                }
              </span>

            </div>

          </div>


          {/* =========================
              MEDIA + RESULT
          ========================= */}

          <section className="entry-details-main">


            {/* PHOTO */}

            {entry.image_entry && (

              <div className="entry-details-photo-wrapper">

                {imageUrl ? (

                  <img
                    className="entry-details-photo"
                    src={imageUrl}
                    alt="Фото запису"
                  />

                ) : (

                  <div className="entry-details-photo-empty">

                    <Camera size={34} />

                    <span>
                      Фото недоступне
                    </span>

                  </div>

                )}

              </div>

            )}


            {/* VOICE */}

            {entry.voice_entry && (

              <div className="entry-details-voice">

                <div className="entry-details-voice-header">

                  <div className="entry-details-voice-icon">

                    <Mic size={26} />

                  </div>


                  <div>

                    <strong>
                      Голосовий запис
                    </strong>

                    <span>
                      Прослухай збережене
                      голосове повідомлення
                    </span>

                  </div>

                </div>


                {voiceUrl ? (

                  <div className="entry-details-audio-wrapper">

                    <audio
                      className="entry-details-audio"
                      controls
                      preload="metadata"
                      src={voiceUrl}
                    >
                      Ваш браузер не підтримує
                      відтворення аудіо.
                    </audio>


                    {voiceDuration && (

                      <span className="entry-details-voice-duration">

                        Тривалість:
                        {' '}
                        {voiceDuration}

                      </span>

                    )}

                  </div>

                ) : (

                  <div className="entry-details-voice-empty">

                    <Mic size={25} />

                    <span>
                      Голосовий файл недоступний
                    </span>

                  </div>

                )}


                {entry.voice_entry
                  .transcription && (

                  <div className="entry-details-transcription">

                    <span>
                      Розпізнаний текст
                    </span>

                    <p>
                      {
                        entry.voice_entry
                          .transcription
                      }
                    </p>

                  </div>

                )}

              </div>

            )}


            {/* =========================
                ANALYSIS RESULT
            ========================= */}

            <div className="entry-details-result">

              <div className="entry-details-result-icon">

                <Sparkles size={25} />

              </div>


              <span className="entry-details-result-label">

                Результат аналізу

              </span>


              <h2>
                {emotion}
              </h2>


              {analysis && (

                <div className="entry-details-confidence">

                  <span>
                    Впевненість моделі
                  </span>

                  <strong>
                    {
                      formatPercent(
                        analysis.confidence,
                      )
                    }
                  </strong>

                </div>

              )}


              {/* MAIN EMOTION */}

              {mainScore && (

                <div className="entry-details-main-score">

                  <div>

                    <span>
                      {mainScore.label}
                    </span>

                    <strong>
                      {
                        formatPercent(
                          Number(
                            mainScore.value,
                          ),
                        )
                      }
                    </strong>

                  </div>


                  <div className="entry-details-score-track">

                    <div
                      className="entry-details-score-fill"
                      style={{
                        width:
                          `${Math.min(
                            getPercentNumber(
                              Number(
                                mainScore.value,
                              ),
                            ),
                            100,
                          )}%`,
                      }}
                    />

                  </div>

                </div>

              )}


              {/* OTHER EMOTIONS */}

              {secondaryScores.length > 0 && (

                <div className="entry-details-secondary">

                  <p>
                    Інші ймовірні емоції
                  </p>


                  {secondaryScores.map(
                    item => (

                      <div
                        className="entry-details-secondary-item"
                        key={item.key}
                      >

                        <div>

                          <span>
                            {item.label}
                          </span>

                          <strong>
                            {
                              formatPercent(
                                Number(
                                  item.value,
                                ),
                              )
                            }
                          </strong>

                        </div>


                        <div className="entry-details-score-track">

                          <div
                            className="entry-details-score-fill"
                            style={{
                              width:
                                `${Math.min(
                                  getPercentNumber(
                                    Number(
                                      item.value,
                                    ),
                                  ),
                                  100,
                                )}%`,
                            }}
                          />

                        </div>

                      </div>

                    ),
                  )}

                </div>

              )}

            </div>

          </section>


          {/* =========================
              TEXT ENTRY
          ========================= */}

          {entry.text_entry?.content && (

            <section className="entry-details-text">

              <span>
                Текст запису
              </span>

              <p>
                {
                  entry.text_entry
                    .content
                }
              </p>

            </section>

          )}


          {/* =========================
              RECOMMENDATION
          ========================= */}

          {analysis?.recommendation && (

            <section className="entry-details-recommendation">

              <div>

                <Sparkles size={19} />

                <span>
                  Рекомендація MOVA
                </span>

              </div>

              <p>
                {
                  analysis.recommendation
                }
              </p>

            </section>

          )}


          {/* =========================
              BOTTOM
          ========================= */}

          <div className="entry-details-bottom">

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/dashboard/history',
                )
              }
            >

              <ArrowLeft size={18} />

              Повернутися до історії

            </button>

          </div>

        </article>

      </section>

    </main>
  )
}


export default EntryDetailsPage