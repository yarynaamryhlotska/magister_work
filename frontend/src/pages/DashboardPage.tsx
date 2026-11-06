import {
  BarChart3,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Mic,
  Plus,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import DashboardHeader from '../components/DashboardHeader'
import './DashboardPage.css'


interface CurrentUser {
  id: number
  name: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}


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


interface DailyEmotionSummary {
  id?: number
  summary_date?: string
  date?: string

  emotion: string
  confidence: number

  anger_score?: number | null
  disgust_score?: number | null
  fear_score?: number | null
  joy_score?: number | null
  neutral_score?: number | null
  sadness_score?: number | null
  surprise_score?: number | null

  recommendation?: string | null

  entries_count?: number
  total_entries?: number

  created_at?: string
  updated_at?: string
}


type CalendarDay = {
  date: Date
  dateKey: string

  day: number

  isCurrentMonth: boolean

  entries: DiaryEntry[]

  summary: DailyEmotionSummary | null

  emotion: string | null
}



const API_URL = 'http://127.0.0.1:8000'


const WEEKDAYS = [
  'Пн',
  'Вт',
  'Ср',
  'Чт',
  'Пт',
  'Сб',
  'Нд',
]


const emotionNames: Record<string, string> = {
  ANGER: 'Злість',
  angry: 'Злість',

  DISGUST: 'Відраза',
  disgust: 'Відраза',

  FEAR: 'Страх',
  fear: 'Страх',

  JOY: 'Радість',
  joy: 'Радість',
  happy: 'Радість',

  NEUTRAL: 'Нейтральний стан',
  neutral: 'Нейтральний стан',

  SADNESS: 'Смуток',
  sadness: 'Смуток',
  sad: 'Смуток',

  SURPRISE: 'Здивування',
  surprise: 'Здивування',
}


const emotionEmoji: Record<string, string> = {
  ANGER: '😠',
  angry: '😠',

  DISGUST: '😖',
  disgust: '😖',

  FEAR: '😨',
  fear: '😨',

  JOY: '😄',
  joy: '😄',
  happy: '😄',

  NEUTRAL: '😐',
  neutral: '😐',

  SADNESS: '😢',
  sadness: '😢',
  sad: '😢',

  SURPRISE: '😮',
  surprise: '😮',
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


function getDayEmotionFromEntries(
  dayEntries: DiaryEntry[],
): string | null {
  const emotions = [
    'ANGER',
    'DISGUST',
    'FEAR',
    'JOY',
    'NEUTRAL',
    'SADNESS',
    'SURPRISE',
  ] as const

  let bestEmotion: string | null = null
  let bestAverage = -Infinity

  for (const emotion of emotions) {
    const scoreKey =
      `${emotion.toLowerCase()}_score` as
        keyof AnalysisResult

    const scores = dayEntries
      .map((entry) => entry.analysis_result?.[scoreKey])
      .filter(
        (score): score is number =>
          typeof score === 'number' &&
          Number.isFinite(score),
      )

    if (scores.length === 0) continue

    const average =
      scores.reduce((sum, score) => sum + score, 0) /
      scores.length

    if (average > bestAverage) {
      bestAverage = average
      bestEmotion = emotion
    }
  }

  return bestEmotion
}


function getCurrentUser(): CurrentUser | null {

  const savedUser =
    localStorage.getItem('currentUser')

  if (!savedUser) {
    return null
  }

  try {
    return JSON.parse(
      savedUser,
    ) as CurrentUser
  } catch {
    return null
  }
}


function getDateKey(date: Date): string {

  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0')

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}


function getSummaryDate(
  summary: DailyEmotionSummary,
): string | null {

  if (summary.summary_date) {
    return summary.summary_date.slice(0, 10)
  }

  if (summary.date) {
    return summary.date.slice(0, 10)
  }

  return null
}


function DashboardPage() {

  const navigate = useNavigate()

  const currentUser = getCurrentUser()
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  const savedTheme = localStorage.getItem('theme')

  return savedTheme === 'dark'
    ? 'dark'
    : 'light'
})

useEffect(() => {
  document.documentElement.setAttribute(
    'data-theme',
    theme,
  )

  localStorage.setItem('theme', theme)
}, [theme])

const handleThemeToggle = () => {
  setTheme((currentTheme) =>
    currentTheme === 'light'
      ? 'dark'
      : 'light',
  )
}


  const [
    entries,
    setEntries,
  ] = useState<DiaryEntry[]>([])


  const [
    dailySummaries,
    setDailySummaries,
  ] = useState<DailyEmotionSummary[]>([])


  const [
    isLoadingEntries,
    setIsLoadingEntries,
  ] = useState(true)


  const [
    calendarDate,
    setCalendarDate,
  ] = useState(() => {

    const today = new Date()

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    )
  })


  

  useEffect(() => {

    const loadEntries = async () => {

      const token =
        localStorage.getItem(
          'accessToken',
        )

      if (!token) {
        setIsLoadingEntries(false)
        return
      }

      try {

        setIsLoadingEntries(true)

        const response = await fetch(
          `${API_URL}/diary/entries`,
          {
            method: 'GET',

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {

          console.error(
            'Помилка завантаження записів:',
            response.status,
          )

          setEntries([])

          return
        }

        const data =
          (await response.json()) as
            DiaryEntryListResponse


        const sortedEntries = [
          ...(data.entries ?? []),
        ].sort(
          (a, b) =>
            new Date(
              b.created_at,
            ).getTime() -
            new Date(
              a.created_at,
            ).getTime(),
        )


        setEntries(sortedEntries)

      } catch (error) {

        console.error(
          'Не вдалося завантажити історію:',
          error,
        )

        setEntries([])

      } finally {

        setIsLoadingEntries(false)
      }
    }


    void loadEntries()

  }, [])


  

  useEffect(() => {

    const loadDailySummaries = async () => {

      const token =
        localStorage.getItem(
          'accessToken',
        )

      if (!token) {
        return
      }

      try {

        const response = await fetch(
          `${API_URL}/diary/daily-summaries`,
          {
            method: 'GET',

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        )


        if (!response.ok) {

          console.error(
            'Помилка завантаження підсумків днів:',
            response.status,
          )

          setDailySummaries([])

          return
        }


        const data = await response.json()



        if (Array.isArray(data)) {

          setDailySummaries(data)

        } else if (
          data &&
          Array.isArray(data.summaries)
        ) {

          setDailySummaries(
            data.summaries,
          )

        } else {

          setDailySummaries([])
        }

      } catch (error) {

        console.error(
          'Не вдалося завантажити підсумки днів:',
          error,
        )

        setDailySummaries([])
      }
    }


    void loadDailySummaries()

  }, [])



  const entriesByDate = useMemo(() => {

    const grouped =
      new Map<string, DiaryEntry[]>()


    entries.forEach((entry) => {

      const date =
        new Date(entry.created_at)

      const key =
        getDateKey(date)

      const existing =
        grouped.get(key) ?? []

      grouped.set(
        key,
        [
          ...existing,
          entry,
        ],
      )
    })


    return grouped

  }, [entries])




  const summariesByDate = useMemo(() => {

    const grouped =
      new Map<
        string,
        DailyEmotionSummary
      >()


    dailySummaries.forEach(
      (summary) => {

        const key =
          getSummaryDate(summary)

        if (!key) {
          return
        }

        grouped.set(
          key,
          summary,
        )
      },
    )


    return grouped

  }, [dailySummaries])


  const calendarDays =
    useMemo<CalendarDay[]>(() => {

      const year =
        calendarDate.getFullYear()

      const month =
        calendarDate.getMonth()


      const firstDay =
        new Date(
          year,
          month,
          1,
        )


      const lastDay =
        new Date(
          year,
          month + 1,
          0,
        )


      const mondayOffset =
        (firstDay.getDay() + 6) % 7


      const totalDays =
        lastDay.getDate()


      const cells: CalendarDay[] = []


  

      for (
        let index = 0;
        index < mondayOffset;
        index += 1
      ) {

        const date =
          new Date(
            year,
            month,
            index -
              mondayOffset +
              1,
          )

        cells.push({
          date,
          dateKey: getDateKey(date),

          day: date.getDate(),

          isCurrentMonth: false,

          entries: [],

          summary: null,

          emotion: null,
        })
      }



      for (
        let day = 1;
        day <= totalDays;
        day += 1
      ) {

        const date =
          new Date(
            year,
            month,
            day,
          )

        const key =
          getDateKey(date)


        const dayEntries =
          entriesByDate.get(key) ?? []


        const summary =
          summariesByDate.get(key) ??
          null


        const emotion =
  normalizeEmotion(summary?.emotion) ??
  getDayEmotionFromEntries(dayEntries)


        cells.push({
          date,
          dateKey: key,

          day,

          isCurrentMonth: true,

          entries: dayEntries,

          summary,

          emotion,
        })
      }

      while (
        cells.length % 7 !== 0
      ) {

        const previous =
          cells[
            cells.length - 1
          ]

        const date =
          new Date(
            previous.date,
          )

        date.setDate(
          date.getDate() + 1,
        )


        cells.push({
          date,
          dateKey:
            getDateKey(date),

          day:
            date.getDate(),

          isCurrentMonth: false,

          entries: [],

          summary: null,

          emotion: null,
        })
      }


      return cells

    }, [
      calendarDate,
      entriesByDate,
      summariesByDate,
    ])


  const analyzedEntries =
    useMemo(
      () =>
        entries.filter(
          (entry) =>
            Boolean(
              entry.analysis_result,
            ),
        ),
      [entries],
    )


  const emotionStatistics =
    useMemo(() => {

      const statistics =
        new Map<string, number>()


      analyzedEntries.forEach(
        (entry) => {

          const emotion =
            normalizeEmotion(
              entry.analysis_result
                ?.emotion,
            )

          if (!emotion) {
            return
          }


          statistics.set(
            emotion,

            (
              statistics.get(
                emotion,
              ) ?? 0
            ) + 1,
          )
        },
      )


      return [
        ...statistics.entries(),
      ].sort(
        (a, b) =>
          b[1] - a[1],
      )

    }, [analyzedEntries])



  const handleLogout = () => {

    localStorage.removeItem(
      'accessToken',
    )

    localStorage.removeItem(
      'currentUser',
    )

    navigate(
      '/',
      {
        replace: true,
      },
    )
  }


  const handleTextClick = () => {

    navigate(
      '/dashboard/text',
    )
  }


  const handleVoiceClick = () => {

    navigate(
      '/dashboard/voice',
    )
  }


  const handlePhotoClick = () => {

    navigate(
      '/dashboard/photo',
    )
  }


  const handleHistoryClick = () => {

    navigate(
      '/dashboard/history',
    )
  }


  const handlePreviousMonth = () => {

    setCalendarDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1,
        ),
    )
  }


  const handleNextMonth = () => {

    setCalendarDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1,
        ),
    )
  }


  const handleCurrentMonth = () => {

    const today =
      new Date()

    setCalendarDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    )
  }


  const handleCalendarDayClick = (
    day: CalendarDay,
  ) => {

    if (
      !day.isCurrentMonth ||
      day.entries.length === 0
    ) {
      return
    }


    navigate(
      `/dashboard/day/${day.dateKey}`,
    )
  }



  const monthTitle =
    new Intl.DateTimeFormat(
      'uk-UA',
      {
        month: 'long',
        year: 'numeric',
      },
    ).format(
      calendarDate,
    )


  const todayKey =
    getDateKey(
      new Date(),
    )


  return (
  <main className="dashboard-page">
    <DashboardHeader />

    {/* ================= WELCOME ================= */}


      <section className="dashboard-welcome">


        <div>

          <p className="dashboard-eyebrow">

            <Sparkles size={16} />

            Твій особистий простір

          </p>


          <h1>

            Вітаємо,{' '}

            <span>
              {currentUser?.name ??
                'користувачу'}
            </span>

          </h1>


          <p className="dashboard-description">

            Як ти почуваєшся сьогодні?
            Створи новий запис, а MOVA
            допоможе розпізнати емоції та
            сформувати рекомендацію.

          </p>

        </div>


        <div className="dashboard-date">

          <CalendarDays
            size={21}
          />

          <span>

            <small>
              Сьогодні
            </small>

            <strong>

              {new Intl.DateTimeFormat(
                'uk-UA',
                {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                },
              ).format(
                new Date(),
              )}

            </strong>

          </span>

        </div>


      </section>


      {/* ================= NEW ENTRY ================= */}

      <section
        className="dashboard-create"
        id="new-entry"
      >


        <div className="dashboard-section-title">

          <div>

            <p>
              Новий запис
            </p>

            <h2>
              Розкажи про свій день
            </h2>

          </div>


          <span>
            Обери один або декілька форматів
          </span>

        </div>


        <div className="dashboard-entry-types">


          {/* TEXT */}

          <button
            className="dashboard-entry-card"
            type="button"
            onClick={
              handleTextClick
            }
          >

            <span className="entry-card-icon">
              <FileText size={25} />
            </span>

            <span>

              <strong>
                Текст
              </strong>

              <small>
                Опиши події, думки та почуття
              </small>

            </span>

            <Plus size={20} />

          </button>


          {/* VOICE */}

          <button
            className="dashboard-entry-card"
            type="button"
            onClick={
              handleVoiceClick
            }
          >

            <span className="entry-card-icon">
              <Mic size={25} />
            </span>

            <span>

              <strong>
                Голос
              </strong>

              <small>
                Запиши голосове повідомлення
              </small>

            </span>

            <Plus size={20} />

          </button>


          {/* PHOTO */}

          <button
            className="dashboard-entry-card"
            type="button"
            onClick={
              handlePhotoClick
            }
          >

            <span className="entry-card-icon">
              <Camera size={25} />
            </span>

            <span>

              <strong>
                Фото
              </strong>

              <small>
                Додай фотографію обличчя
              </small>

            </span>

            <Plus size={20} />

          </button>


        </div>

      </section>


      {/* ================= OVERVIEW ================= */}

      <section className="dashboard-overview">


        {/* ================= CALENDAR ================= */}

        <article
          className="dashboard-panel dashboard-calendar-panel"
          id="history"
        >


          <div className="dashboard-panel-heading">

            <span>

              <CalendarDays
                size={19}
              />

              Емоційний календар

            </span>


            <button
              type="button"
              onClick={
                handleHistoryClick
              }
            >
              Вся історія
            </button>

          </div>


          {isLoadingEntries ? (

            <div className="dashboard-empty-state">

              <span>
                <History size={27} />
              </span>

              <h3>
                Завантаження...
              </h3>

              <p>
                Формуємо твій
                емоційний календар.
              </p>

            </div>

          ) : entries.length === 0 ? (

            <div className="dashboard-empty-state">

              <span>
                <CalendarDays
                  size={27}
                />
              </span>

              <h3>
                Записів поки немає
              </h3>

              <p>
                Після першого запису
                тут з’явиться твій
                емоційний календар.
              </p>

            </div>

          ) : (

            <div className="emotion-calendar">


              {/* MONTH NAVIGATION */}

              <div className="emotion-calendar-toolbar">


                <button
                  type="button"
                  className="calendar-arrow"
                  onClick={
                    handlePreviousMonth
                  }
                  aria-label="Попередній місяць"
                >

                  <ChevronLeft
                    size={18}
                  />

                </button>


                <button
                  type="button"
                  className="calendar-month"
                  onClick={
                    handleCurrentMonth
                  }
                  title="Повернутися до поточного місяця"
                >

                  {monthTitle}

                </button>


                <button
                  type="button"
                  className="calendar-arrow"
                  onClick={
                    handleNextMonth
                  }
                  aria-label="Наступний місяць"
                >

                  <ChevronRight
                    size={18}
                  />

                </button>


              </div>


              {/* WEEKDAYS */}

              <div className="emotion-calendar-weekdays">

                {WEEKDAYS.map(
                  (weekday) => (

                    <span
                      key={weekday}
                    >
                      {weekday}
                    </span>

                  ),
                )}

              </div>


              {/* DAYS */}

              <div className="emotion-calendar-grid">


                {calendarDays.map(
                  (day, index) => {


                    if (
                      !day.isCurrentMonth
                    ) {

                      return (

                        <div
                          key={
                            `${day.dateKey}-${index}`
                          }
                          className="calendar-day calendar-day-outside"
                          aria-hidden="true"
                        />

                      )
                    }


                    const isToday =
                      day.dateKey ===
                      todayKey


                    const hasEntries =
                      day.entries.length > 0


                    const emoji =
                      day.emotion
                        ? emotionEmoji[
                            day.emotion
                          ] ?? '🙂'
                        : null


                    const emotionName =
                      day.emotion
                        ? emotionNames[
                            day.emotion
                          ] ??
                          day.emotion
                        : null


                    const className = [

                      'calendar-day',

                      hasEntries
                        ? 'calendar-day-has-entry'
                        : '',

                      isToday
                        ? 'calendar-day-today'
                        : '',

                    ]
                      .filter(Boolean)
                      .join(' ')


                    return (

                      <button
                        key={day.dateKey}
                        type="button"
                        className={
                          className
                        }
                        onClick={() =>
                          handleCalendarDayClick(
                            day,
                          )
                        }
                        disabled={
                          !hasEntries
                        }
                        title={
                          hasEntries
                            ? `${day.day} — ${
                                emotionName ??
                                'Є записи'
                              }, записів: ${
                                day.entries.length
                              }`
                            : `${day.day} — записів немає`
                        }
                      >


                        {/* NUMBER */}

                        <span className="calendar-day-number">
                          {day.day}
                        </span>


                        {/* DAILY EMOTION */}

                        
{emoji ? (
  <span className="calendar-emotion">
    {emoji}
  </span>
) : hasEntries ? (
  <span
    className="calendar-emotion"
    title="Емоцію дня ще не визначено"
  >
    ❔
  </span>
) : (
  <span
    className="calendar-no-entry"
    aria-hidden="true"
  />
)}



                        {/* ENTRY COUNT */}

                        {hasEntries &&
                          day.entries.length >
                            1 && (

                            <span className="calendar-entry-count">

                              {
                                day.entries
                                  .length
                              }

                            </span>

                          )}


                      </button>

                    )
                  },
                )}


              </div>


              {/* LEGEND */}

              <div className="emotion-calendar-legend">

                <span>
                  <i className="calendar-legend-empty" />
                  Немає запису
                </span>

                <span>
                  😄 Радість
                </span>

                <span>
                  😐 Нейтрально
                </span>

                <span>
                  😢 Смуток
                </span>

              </div>


            </div>

          )}


        </article>


        {/* ================= STATISTICS ================= */}

        <article
          className="dashboard-panel"
          id="statistics"
        >


          <div className="dashboard-panel-heading">

            <span>

              <BarChart3
                size={19}
              />

              Статистика

            </span>


            <button
  type="button"
  onClick={() => navigate('/dashboard/statistics')}
>
  Детальніше
</button>

          </div>


          {entries.length === 0 ? (

            <div className="dashboard-empty-state">

              <span>
                <BarChart3
                  size={27}
                />
              </span>

              <h3>
                Ще недостатньо даних
              </h3>

              <p>
                Статистика з’явиться
                після створення та
                аналізу записів.
              </p>

            </div>

          ) : analyzedEntries.length === 0 ? (

            <div className="dashboard-empty-state">

              <span>
                <BarChart3
                  size={27}
                />
              </span>

              <h3>
                Немає проаналізованих записів
              </h3>

              <p>
                Після аналізу емоцій
                тут з’явиться статистика.
              </p>

            </div>

          ) : (

            <div className="dashboard-statistics-content">


              <div className="statistics-summary">

                <strong>
                  {
                    analyzedEntries.length
                  }
                </strong>

                <span>
                  проаналізовано записів
                </span>

              </div>


              <div className="statistics-emotions">


                {emotionStatistics
                  .slice(
                    0,
                    4,
                  )
                  .map(
                    ([
                      emotion,
                      count,
                    ]) => {


                      const percentage =
                        Math.round(
                          (
                            count /
                            analyzedEntries.length
                          ) *
                            100,
                        )


                      return (

                        <div
                          className="statistics-emotion-row"
                          key={
                            emotion
                          }
                        >

                          <div>

                            <span>

                              {
                                emotionEmoji[
                                  emotion
                                ] ??
                                '🙂'
                              }

                            </span>


                            <strong>

                              {
                                emotionNames[
                                  emotion
                                ] ??
                                emotion
                              }

                            </strong>


                            <small>

                              {
                                percentage
                              }
                              %

                            </small>

                          </div>


                          <div className="statistics-progress">

                            <span
                              style={{
                                width:
                                  `${percentage}%`,
                              }}
                            />

                          </div>


                        </div>

                      )
                    },
                  )}


              </div>


            </div>

          )}


        </article>


      </section>


    </main>
  )
}


export default DashboardPage