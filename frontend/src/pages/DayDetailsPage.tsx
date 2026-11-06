import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronRight,
  FileText,
  Lightbulb,
  Mic,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import DashboardHeader from '../components/DashboardHeader'

import './DayDetailsPage.css'


const API_URL = 'http://127.0.0.1:8000'


/* =========================================================
   TYPES
   ========================================================= */

interface TextEntry {
  id: number
  content: string
}

interface VoiceEntry {
  id: number
  file_path: string
  duration_seconds: number | null
  transcription: string | null
}

interface ImageEntry {
  id: number
  file_path: string
}

interface AnalysisResult {
  id: number

  emotion: string
  confidence: number

  anger_score: number | null
  disgust_score: number | null
  fear_score: number | null
  joy_score: number | null
  neutral_score: number | null
  sadness_score: number | null
  surprise_score: number | null

  recommendation: string | null

  created_at: string
}

interface DiaryEntry {
  id: number
  user_id: number

  status: string

  created_at: string
  updated_at: string

  text_entry: TextEntry | null
  voice_entry: VoiceEntry | null
  image_entry: ImageEntry | null

  analysis_result: AnalysisResult | null
}

interface DailyEmotionSummary {
  id: number
  user_id: number

  summary_date: string

  emotion: string
  confidence: number

  anger_score: number
  disgust_score: number
  fear_score: number
  joy_score: number
  neutral_score: number
  sadness_score: number
  surprise_score: number

  entries_count: number

  text_entries_count: number
  voice_entries_count: number
  image_entries_count: number

  recommendation: string | null

  created_at: string
  updated_at: string
}

interface DailyEntriesResponse {
  date: string

  summary: DailyEmotionSummary | null

  entries: DiaryEntry[]

  total: number
}

type EntryType =
  | 'text'
  | 'voice'
  | 'photo'


/* =========================================================
   EMOTIONS
   ========================================================= */

const emotionNames: Record<string, string> = {
  ANGER: 'Злість',
  DISGUST: 'Відраза',
  FEAR: 'Страх',
  JOY: 'Радість',
  NEUTRAL: 'Нейтральний стан',
  SADNESS: 'Смуток',
  SURPRISE: 'Здивування',
}

const emotionEmoji: Record<string, string> = {
  ANGER: '😠',
  DISGUST: '😖',
  FEAR: '😨',
  JOY: '😄',
  NEUTRAL: '😐',
  SADNESS: '😢',
  SURPRISE: '😮',
}


function normalizeEmotion(
  emotion: string | null | undefined,
): string | null {
  if (!emotion) {
    return null
  }

  const normalized =
    emotion
      .trim()
      .toUpperCase()

  const aliases: Record<string, string> = {
    ANGRY: 'ANGER',
    ANGER: 'ANGER',

    DISGUST: 'DISGUST',

    FEAR: 'FEAR',

    HAPPY: 'JOY',
    HAPPINESS: 'JOY',
    JOY: 'JOY',

    NEUTRAL: 'NEUTRAL',
    NONE: 'NEUTRAL',

    SAD: 'SADNESS',
    SADNESS: 'SADNESS',

    SURPRISE: 'SURPRISE',
    SURPRISED: 'SURPRISE',
  }

  return aliases[normalized] ?? normalized
}


/* =========================================================
   HELPERS
   ========================================================= */

function formatDate(
  value: string,
): string {
  const date =
    new Date(
      `${value}T12:00:00`,
    )

  return new Intl.DateTimeFormat(
    'uk-UA',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(date)
}



function formatTime(value: string): string {
  const normalizedValue =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
      ? value
      : `${value}Z`

  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }

  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}



function getEntryType(
  entry: DiaryEntry,
): EntryType {
  if (entry.text_entry) {
    return 'text'
  }

  if (entry.voice_entry) {
    return 'voice'
  }

  return 'photo'
}


function getEntryTypeName(
  entry: DiaryEntry,
): string {
  const type =
    getEntryType(entry)

  if (type === 'text') {
    return 'Текст'
  }

  if (type === 'voice') {
    return 'Голос'
  }

  return 'Фото'
}


function getEntryIcon(
  entry: DiaryEntry,
) {
  const type =
    getEntryType(entry)

  if (type === 'text') {
    return (
      <FileText
        size={20}
      />
    )
  }

  if (type === 'voice') {
    return (
      <Mic
        size={20}
      />
    )
  }

  return (
    <Camera
      size={20}
    />
  )
}


function getEntryPreview(
  entry: DiaryEntry,
): string {
  if (entry.text_entry) {
    const text =
      entry.text_entry.content.trim()

    if (text.length <= 110) {
      return text
    }

    return `${text.slice(0, 110)}…`
  }

  if (entry.voice_entry) {
    if (
      entry.voice_entry
        .transcription
    ) {
      const text =
        entry.voice_entry
          .transcription
          .trim()

      if (text.length <= 110) {
        return text
      }

      return `${text.slice(0, 110)}…`
    }

    if (
      entry.voice_entry
        .duration_seconds
    ) {
      return `Голосове повідомлення • ${Math.round(
        entry.voice_entry
          .duration_seconds,
      )} с`
    }

    return 'Голосове повідомлення'
  }

  if (entry.image_entry) {
    return 'Фотографія для аналізу емоцій'
  }

  return 'Запис щоденника'
}


/* =========================================================
   COMPONENT
   ========================================================= */

function DayDetailsPage() {
  const navigate =
    useNavigate()

  const {
    summaryDate,
  } = useParams<{
    summaryDate: string
  }>()

  const [
    data,
    setData,
  ] =
    useState<DailyEntriesResponse | null>(
      null,
    )

  const [
    summary,
    setSummary,
  ] =
    useState<DailyEmotionSummary | null>(
      null,
    )

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')


  /* =======================================================
     LOAD DAY
     ======================================================= */

  useEffect(() => {
    const loadDay = async () => {
      if (!summaryDate) {
        setError(
          'Не вдалося визначити дату.',
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

        /* -----------------------------------------------
           1. Завантажуємо всі записи конкретного дня
           ----------------------------------------------- */

        const entriesResponse =
          await fetch(
            `${API_URL}/diary/daily/${summaryDate}/entries`,
            {
              method: 'GET',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          )

        if (
          entriesResponse.status === 401
        ) {
          localStorage.removeItem(
            'accessToken',
          )

          navigate(
            '/login',
            {
              replace: true,
            },
          )

          return
        }

        if (!entriesResponse.ok) {
          let message =
            'Не вдалося завантажити записи цього дня.'

          try {
            const responseData =
              await entriesResponse.json()

            if (
              typeof responseData?.detail ===
              'string'
            ) {
              message =
                responseData.detail
            }
          } catch {
            // Залишаємо стандартний текст помилки.
          }

          throw new Error(
            message,
          )
        }

        const entriesData =
          (await entriesResponse.json()) as
            DailyEntriesResponse

        setData(
          entriesData,
        )

        if (entriesData.summary) {
          setSummary(
            entriesData.summary,
          )
        } else {
          setSummary(null)
        }

        const summaryResponse =
          await fetch(
            `${API_URL}/diary/daily-summaries/${summaryDate}`,
            {
              method: 'GET',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          )

        if (
          summaryResponse.status === 401
        ) {
          localStorage.removeItem(
            'accessToken',
          )

          localStorage.removeItem(
            'currentUser',
          )

          navigate(
            '/login',
            {
              replace: true,
            },
          )

          return
        }

        if (
          summaryResponse.status === 404
        ) {
          setSummary(
            entriesData.summary ?? null,
          )

          return
        }

        if (summaryResponse.ok) {
          const summaryData =
            (await summaryResponse.json()) as
              DailyEmotionSummary

          setSummary(
            summaryData,
          )
        }
      } catch (requestError) {
        console.error(
          requestError,
        )

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не вдалося завантажити записи цього дня.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadDay()
  }, [
    summaryDate,
    navigate,
  ])


  /* =======================================================
     DATA
     ======================================================= */

  const entries =
    useMemo(
      () =>
        [
          ...(data?.entries ?? []),
        ].sort(
          (a, b) =>
            new Date(
              b.created_at,
            ).getTime() -
            new Date(
              a.created_at,
            ).getTime(),
        ),
      [data],
    )

  const mainEmotion =
    normalizeEmotion(
      summary?.emotion,
    )

  const mainEmotionName =
    mainEmotion
      ? emotionNames[
          mainEmotion
        ] ?? mainEmotion
      : 'Не визначено'

  const mainEmotionEmoji =
    mainEmotion
      ? emotionEmoji[
          mainEmotion
        ] ?? '🙂'
      : '🙂'

  const confidence =
    summary
      ? Math.round(
          summary.confidence *
            100,
        )
      : 0


  /* =======================================================
     HANDLERS
     ======================================================= */

  const handleBack = () => {
    navigate(
      '/dashboard',
    )
  }

  const handleEntryClick = (
    entryId: number,
  ) => {
    navigate(
      `/dashboard/history/${entryId}`,
    )
  }


  /* =======================================================
     LOADING
     ======================================================= */

  if (isLoading) {
    return (
      <main className="day-details-page">

        <DashboardHeader />

        <div className="day-details-loading">
          <Sparkles
            size={28}
          />

          <strong>
            Формуємо підсумок дня...
          </strong>

          <span>
            Завантажуємо твої записи.
          </span>
        </div>

      </main>
    )
  }


  /* =======================================================
     ERROR
     ======================================================= */

  if (error) {
    return (
      <main className="day-details-page">

        <DashboardHeader />

        <div className="day-details-error">
          <Sparkles
            size={30}
          />

          <h2>
            Не вдалося відкрити день
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={handleBack}
          >
            <ArrowLeft
              size={18}
            />

            На головну
          </button>
        </div>

      </main>
    )
  }


  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <main className="day-details-page">

      {/* ===================================================
          GLOBAL DASHBOARD HEADER
          =================================================== */}

      <DashboardHeader />


      {/* ===================================================
          CONTENT
          =================================================== */}

      <div className="day-details-container">

        {/* PAGE TITLE */}

        <section className="day-details-title">

          <span className="day-details-title-icon">
            <CalendarDays
              size={27}
            />
          </span>

          <div>
            <span>
              Підсумок дня
            </span>

            <h1>
              {summaryDate
                ? formatDate(
                    summaryDate,
                  )
                : 'День'}
            </h1>

            <p>
              Загальний емоційний стан
              сформовано на основі всіх
              збережених записів цього дня.
            </p>
          </div>

        </section>


        {/* =================================================
            SUMMARY
            ================================================= */}

        {summary ? (

          <section className="day-summary-card">

            <div className="day-summary-top">

              <div className="day-summary-emotion-icon">
                {
                  mainEmotionEmoji
                }
              </div>

              <div className="day-summary-main">

                <span className="day-summary-label">
                  Основна емоція дня
                </span>

                <h2>
                  {
                    mainEmotionName
                  }
                </h2>

                <div className="day-summary-confidence">

                  <span>
                    Вираженість емоції
                  </span>

                  <strong>
                    {
                      confidence
                    }
                    %
                  </strong>

                </div>

              </div>

              <div className="day-summary-count">

                <strong>
                  {
                    summary.entries_count
                  }
                </strong>

                <span>
                  {summary.entries_count ===
                  1
                    ? 'запис'
                    : 'записів'}
                </span>

              </div>

            </div>


            {/* PROGRESS */}

            <div className="day-summary-progress">

              <span
                style={{
                  width:
                    `${Math.min(
                      confidence,
                      100,
                    )}%`,
                }}
              />

            </div>


            {/* TYPES */}

            <div className="day-summary-types">

              <div>
                <FileText
                  size={18}
                />

                <span>
                  Текст
                </span>

                <strong>
                  {
                    summary.text_entries_count
                  }
                </strong>
              </div>


              <div>
                <Mic
                  size={18}
                />

                <span>
                  Голос
                </span>

                <strong>
                  {
                    summary.voice_entries_count
                  }
                </strong>
              </div>


              <div>
                <Camera
                  size={18}
                />

                <span>
                  Фото
                </span>

                <strong>
                  {
                    summary.image_entries_count
                  }
                </strong>
              </div>

            </div>


            {/* RECOMMENDATION */}

            <div className="day-recommendation">

              <span className="day-recommendation-icon">
                <Lightbulb
                  size={21}
                />
              </span>

              <div>
                <span>
                  Рекомендація на основі дня
                </span>

                <p>
                  {
                    summary.recommendation ||
                    'Продовжуй фіксувати свій емоційний стан. Чим більше записів ти додаєш, тим повнішим стає підсумок дня.'
                  }
                </p>
              </div>

            </div>

          </section>

        ) : (

          <section className="day-summary-card day-summary-empty">

            <Sparkles
              size={30}
            />

            <h2>
              Підсумок ще не сформований
            </h2>

            <p>
              Записи цього дня є, але
              загальний емоційний підсумок
              поки відсутній.
            </p>

          </section>

        )}


        {/* =================================================
            ENTRIES
            ================================================= */}

        <section className="day-entries-section">

          <div className="day-entries-heading">

            <div>
              <span>
                Записи дня
              </span>

              <h2>
                Усі записи
              </h2>
            </div>

            <span className="day-entries-total">
              {data?.total ?? 0}
            </span>

          </div>


          {entries.length === 0 ? (

            <div className="day-entries-empty">

              <CalendarDays
                size={30}
              />

              <h3>
                Записів немає
              </h3>

              <p>
                У цей день ще немає
                збережених записів.
              </p>

            </div>

          ) : (

            <div className="day-entries-list">

              {entries.map(
                (entry) => {

                  const emotion =
                    normalizeEmotion(
                      entry
                        .analysis_result
                        ?.emotion,
                    )

                  const emotionName =
                    emotion
                      ? emotionNames[
                          emotion
                        ] ??
                        emotion
                      : 'Не визначено'

                  const emoji =
                    emotion
                      ? emotionEmoji[
                          emotion
                        ] ??
                        '🙂'
                      : '🙂'

                  const entryConfidence =
                    entry.analysis_result
                      ? Math.round(
                          entry
                            .analysis_result
                            .confidence *
                            100,
                        )
                      : 0

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className="day-entry-card"
                      onClick={() =>
                        handleEntryClick(
                          entry.id,
                        )
                      }
                    >

                      {/* ICON */}

                      <span className="day-entry-type-icon">
                        {
                          getEntryIcon(
                            entry,
                          )
                        }
                      </span>


                      {/* CONTENT */}

                      <div className="day-entry-content">

                        <div className="day-entry-meta">

                          <span className="day-entry-type">
                            {
                              getEntryTypeName(
                                entry,
                              )
                            }
                          </span>

                          <span className="day-entry-time">
                            {
                              formatTime(
                                entry.created_at,
                              )
                            }
                          </span>

                        </div>


                        <div className="day-entry-emotion">

                          <span>
                            {emoji}
                          </span>

                          <strong>
                            {
                              emotionName
                            }
                          </strong>

                          {entry.analysis_result && (
                            <small>
                              {
                                entryConfidence
                              }
                              %
                            </small>
                          )}

                        </div>


                        <p className="day-entry-preview">
                          {
                            getEntryPreview(
                              entry,
                            )
                          }
                        </p>


                        {entry.analysis_result && (

                          <div className="day-entry-progress">

                            <span
                              style={{
                                width:
                                  `${Math.min(
                                    entryConfidence,
                                    100,
                                  )}%`,
                              }}
                            />

                          </div>

                        )}

                      </div>


                      {/* OPEN */}

                      <span className="day-entry-open">
                        <ChevronRight
                          size={20}
                        />
                      </span>

                    </button>
                  )
                },
              )}

            </div>

          )}

        </section>

      </div>

    </main>
  )
}

export default DayDetailsPage