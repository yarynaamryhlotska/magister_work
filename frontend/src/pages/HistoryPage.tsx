import {
  
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  History,
  Mic,
  Trash2,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'
import DashboardHeader from '../components/DashboardHeader'
import './HistoryPage.css'


interface AnalysisResult {
  id: number
  emotion: string
  confidence: number
  recommendation: string | null
  created_at: string
}

interface ImageEntry {
  id: number
  file_path: string
}

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

interface DiaryEntryListResponse {
  entries: DiaryEntry[]
  total: number
}


const API_URL = 'http://127.0.0.1:8000'


const EMOTION_NAMES: Record<string, string> = {
  angry: 'Злість',
  anger: 'Злість',
  ANGER: 'Злість',

  disgust: 'Відраза',
  DISGUST: 'Відраза',

  fear: 'Страх',
  FEAR: 'Страх',

  happy: 'Радість',
  joy: 'Радість',
  JOY: 'Радість',

  neutral: 'Нейтральний стан',
  NEUTRAL: 'Нейтральний стан',

  sad: 'Сум',
  sadness: 'Сум',
  SADNESS: 'Сум',

  surprise: 'Здивування',
  SURPRISE: 'Здивування',
}



function formatDay(dateString: string): string {
  const date = parseServerDate(dateString)

  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}




function parseServerDate(value: string): Date {
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    ? value
    : `${value}Z`

  return new Date(normalized)
}

function formatTime(dateString: string): string {
  const date = parseServerDate(dateString)

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



function getDateKey(dateString: string): string {
  const date = parseServerDate(dateString)

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`
}


function getEntryType(entry: DiaryEntry) {
  if (entry.image_entry) {
    return {
      name: 'Фото',
      icon: <Camera size={20} />,
    }
  }

  if (entry.voice_entry) {
    return {
      name: 'Голос',
      icon: <Mic size={20} />,
    }
  }

  return {
    name: 'Текст',
    icon: <FileText size={20} />,
  }
}


function getEmotion(entry: DiaryEntry) {
  const analysis = entry.analysis_result

  if (!analysis) {
    return 'Без аналізу'
  }

  return (
    EMOTION_NAMES[analysis.emotion] ??
    analysis.emotion
  )
}


function getEmotionEmoji(entry: DiaryEntry) {
  const emotion =
    entry.analysis_result?.emotion?.toLowerCase()

  switch (emotion) {
    case 'happy':
    case 'joy':
      return '😊'

    case 'sad':
    case 'sadness':
      return '😢'

    case 'angry':
    case 'anger':
      return '😠'

    case 'fear':
      return '😨'

    case 'surprise':
      return '😮'

    case 'disgust':
      return '🤢'

    case 'neutral':
      return '😐'

    default:
      return '○'
  }
}


function getConfidence(entry: DiaryEntry) {
  const analysis = entry.analysis_result

  if (!analysis) {
    return null
  }

  return (
    Math.round(
      analysis.confidence * 1000,
    ) / 10
  )
}


function getEntryPreview(entry: DiaryEntry) {
  if (entry.text_entry?.content) {
    return entry.text_entry.content
  }

  if (entry.voice_entry?.transcription) {
    return entry.voice_entry.transcription
  }

  if (entry.image_entry) {
    return 'Фотографію проаналізовано для визначення емоційного стану.'
  }

  return null
}


function getRecordWord(count: number) {
  const lastTwo = count % 100
  const last = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'записів'
  }

  if (last === 1) {
    return 'запис'
  }

  if (last >= 2 && last <= 4) {
    return 'записи'
  }

  return 'записів'
}


function HistoryPage() {
  const navigate = useNavigate()

  const [entries, setEntries] =
    useState<DiaryEntry[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [deletingId, setDeletingId] =
    useState<number | null>(null)

  const [collapsedDays, setCollapsedDays] =
    useState<Record<string, boolean>>({})


  useEffect(() => {
    const loadEntries = async () => {
      const token =
        localStorage.getItem('accessToken')

      if (!token) {
        navigate('/login', {
          replace: true,
        })

        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `${API_URL}/diary/entries`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (response.status === 401) {
          localStorage.removeItem(
            'accessToken',
          )

          localStorage.removeItem(
            'currentUser',
          )

          navigate('/login', {
            replace: true,
          })

          return
        }

        if (!response.ok) {
          throw new Error(
            'Не вдалося отримати історію.',
          )
        }

        const data =
          (await response.json()) as
            DiaryEntryListResponse

        const sortedEntries = [
          ...(data.entries ?? []),
        ].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        )

        setEntries(sortedEntries)
      } catch (requestError) {
        console.error(
          'Помилка завантаження історії:',
          requestError,
        )

        setError(
          'Не вдалося завантажити історію записів.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadEntries()
  }, [navigate])


  const groupedEntries = useMemo(() => {
    const groups: Record<
      string,
      DiaryEntry[]
    > = {}

    entries.forEach((entry) => {
      const key =
        getDateKey(entry.created_at)

      if (!groups[key]) {
        groups[key] = []
      }

      groups[key].push(entry)
    })

    return Object.entries(groups)
      .sort(
        ([dateA], [dateB]) =>
          dateB.localeCompare(dateA),
      )
      .map(([dateKey, dayEntries]) => ({
        dateKey,

        label: formatDay(
          dayEntries[0].created_at,
        ),

        entries: dayEntries.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        ),
      }))
  }, [entries])


  const openEntry = (
    entryId: number,
  ) => {
    navigate(
      `/dashboard/history/${entryId}`,
    )
  }


  const toggleDay = (
    dateKey: string,
  ) => {
    setCollapsedDays(
      (previous) => ({
        ...previous,

        [dateKey]:
          !previous[dateKey],
      }),
    )
  }


  const deleteEntry = async (
    entry: DiaryEntry,
  ) => {
    const confirmed =
      window.confirm(
        'Видалити цей запис? Цю дію неможливо скасувати.',
      )

    if (!confirmed) {
      return
    }

    const token =
      localStorage.getItem('accessToken')

    if (!token) {
      navigate('/login', {
        replace: true,
      })

      return
    }

    try {
      setDeletingId(entry.id)

      const response = await fetch(
        `${API_URL}/diary/entries/${entry.id}`,
        {
          method: 'DELETE',

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.status === 401) {
        localStorage.removeItem(
          'accessToken',
        )

        localStorage.removeItem(
          'currentUser',
        )

        navigate('/login', {
          replace: true,
        })

        return
      }

      if (!response.ok) {
        throw new Error(
          'Не вдалося видалити запис.',
        )
      }

      setEntries(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== entry.id,
          ),
      )
    } catch (deleteError) {
      console.error(
        'Помилка видалення:',
        deleteError,
      )

      window.alert(
        'Не вдалося видалити запис. Перевір DELETE endpoint у backend.',
      )
    } finally {
      setDeletingId(null)
    }
  }

return (
  <main className="history-page">

    <DashboardHeader />

    {/* CONTENT */}
    <section className="history-container">

      {/* PAGE TITLE */}
      <div className="history-title">

        <div className="history-title-icon">
          <History size={25} />
        </div>

        <div className="history-title-content">

          <p>
            Твій щоденник
          </p>

          <h1>
            Історія записів
          </h1>

          <span>
            Переглядай свої записи,
            згруповані за днями.
          </span>

        </div>

      </div>




        {/* SUMMARY */}
        {!isLoading && !error && (
          <div className="history-summary">

            <div className="history-summary-content">

              <span>
                Усього записів
              </span>

              <strong>
                {entries.length}
              </strong>

            </div>

            <div className="history-summary-icon">
              <History size={23} />
            </div>

          </div>
        )}


        {/* LOADING */}
        {isLoading && (
          <div className="history-message">

            <span className="history-state-icon">
              <History size={28} />
            </span>

            <strong>
              Завантажуємо історію...
            </strong>

            <p>
              Зачекай декілька секунд.
            </p>

          </div>
        )}


        {/* ERROR */}
        {error && (
          <div className="history-error">

            <span className="history-state-icon">
              !
            </span>

            <strong>
              Не вдалося завантажити записи
            </strong>

            <p>
              {error}
            </p>

          </div>
        )}


        {/* EMPTY */}
        {!isLoading &&
          !error &&
          entries.length === 0 && (

            <div className="history-empty">

              <span className="history-state-icon">
                <FileText size={30} />
              </span>

              <h2>
                Записів поки немає
              </h2>

              <p>
                Після збереження першого
                запису він з’явиться тут.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate('/dashboard')
                }
              >
                Створити запис
              </button>

            </div>
          )}


        {/* HISTORY */}
        {!isLoading &&
          !error &&
          groupedEntries.length > 0 && (

            <div className="history-days">

              {groupedEntries.map(
                (group) => {

                  const isCollapsed =
                    Boolean(
                      collapsedDays[
                        group.dateKey
                      ],
                    )

                  return (
                    <section
                      className={`history-day ${
                        isCollapsed
                          ? 'history-day--collapsed'
                          : ''
                      }`}
                      key={group.dateKey}
                    >

                      {/* DAY HEADER */}
                      <button
                        className="history-day-header"
                        type="button"
                        onClick={() =>
                          toggleDay(
                            group.dateKey,
                          )
                        }
                      >

                        <div className="history-day-date">

                          <span className="history-day-calendar">
                            <CalendarDays
                              size={20}
                            />
                          </span>

                          <div>

                            <strong>
                              {group.label}
                            </strong>

                            <span>
                              {
                                group.entries
                                  .length
                              }{' '}
                              {getRecordWord(
                                group.entries
                                  .length,
                              )}
                            </span>

                          </div>

                        </div>


                        <span className="history-day-arrow">

                          {isCollapsed ? (
                            <ChevronDown
                              size={20}
                            />
                          ) : (
                            <ChevronUp
                              size={20}
                            />
                          )}

                        </span>

                      </button>


                      {/* DAY ENTRIES */}
                      {!isCollapsed && (

                        <div className="history-day-entries">

                          {group.entries.map(
                            (entry) => {

                              const entryType =
                                getEntryType(
                                  entry,
                                )

                              const emotion =
                                getEmotion(
                                  entry,
                                )

                              const emotionEmoji =
                                getEmotionEmoji(
                                  entry,
                                )

                              const confidence =
                                getConfidence(
                                  entry,
                                )

                              const preview =
                                getEntryPreview(
                                  entry,
                                )

                              return (
                                <article
                                  className="history-entry"
                                  key={entry.id}
                                >

                                  <div className="history-entry-icon">
                                    {
                                      entryType.icon
                                    }
                                  </div>


                                  <div className="history-entry-main">

                                    <div className="history-entry-heading">

                                      <div className="history-entry-title">

                                        <span className="history-entry-type">
                                          {
                                            entryType.name
                                          }
                                        </span>

                                        <h2>
                                          <span className="history-emotion-emoji">
                                            {
                                              emotionEmoji
                                            }
                                          </span>

                                          {emotion}
                                        </h2>

                                      </div>


                                      <div className="history-entry-time">

                                        <CalendarDays
                                          size={15}
                                        />

                                        <span>
                                          {formatTime(
                                            entry.created_at,
                                          )}
                                        </span>

                                      </div>

                                    </div>


                                    {confidence !==
                                      null && (

                                      <div className="history-entry-confidence">

                                        <div className="history-confidence-info">

                                          <span>
                                            Впевненість моделі
                                          </span>

                                          <strong>
                                            {
                                              confidence
                                            }
                                            %
                                          </strong>

                                        </div>


                                        <div className="history-progress">

                                          <span
                                            style={{
                                              width: `${Math.min(
                                                confidence,
                                                100,
                                              )}%`,
                                            }}
                                          />

                                        </div>

                                      </div>
                                    )}


                                    {preview && (

                                      <p className="history-entry-text">
                                        {preview}
                                      </p>

                                    )}


                                    <div className="history-entry-actions">

                                      <button
                                        className="history-view-button"
                                        type="button"
                                        onClick={() =>
                                          openEntry(
                                            entry.id,
                                          )
                                        }
                                      >
                                        <Eye
                                          size={17}
                                        />

                                        Переглянути
                                      </button>


                                      <button
                                        className="history-delete-button"
                                        type="button"
                                        disabled={
                                          deletingId ===
                                          entry.id
                                        }
                                        onClick={() =>
                                          void deleteEntry(
                                            entry,
                                          )
                                        }
                                      >
                                        <Trash2
                                          size={17}
                                        />

                                        {deletingId ===
                                        entry.id
                                          ? 'Видалення...'
                                          : 'Видалити'}
                                      </button>

                                    </div>

                                  </div>

                                </article>
                              )
                            },
                          )}

                        </div>
                      )}

                    </section>
                  )
                },
              )}

            </div>
          )}

      </section>

    </main>
  )
}


export default HistoryPage