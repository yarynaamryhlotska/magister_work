import {

  BarChart3,

  CalendarDays,

  Camera,

  ChevronDown,

  FileText,

  Mic,

  Smile,

  Sparkles,

  TrendingDown,

  TrendingUp,

} from 'lucide-react'



import {

  useEffect,

  useMemo,

  useState,

} from 'react'



import DashboardHeader from '../components/DashboardHeader'

import './StatisticsPage.css'





type Period = '7days' | '30days' | '3months'



type EntryKind = 'text' | 'voice' | 'photo'





interface EmotionStat {

  name: string

  count: number

  percentage: number

  className: string

}





interface ChartPoint {

  label: string

  value: number

}





interface ActivityDay {

  day: number

  count: number

}





interface DiaryEntry {

  id?: number | string



  type?: string

  entry_type?: string



  emotion?: string

  emotion_name?: string



  confidence?: number | string



  created_at?: string

  createdAt?: string

  date?: string



  analysis_result?: {

    emotion?: string

    confidence?: number | string

  } | null

}





interface RawEntry extends DiaryEntry {}





interface DailySummary {

  date?: string



  text_entries_count?: number

  voice_entries_count?: number

  image_entries_count?: number

  photo_entries_count?: number



  text_count?: number

  voice_count?: number

  image_count?: number

  photo_count?: number



  total_entries?: number

}





interface EntryTypeStat {

  type: string

  count: number

  percentage: number

  icon: typeof FileText

  className: EntryKind

}





const API_URL =

  import.meta.env.VITE_API_URL ??

  'http\://localhost:8000'





const emotionConfig: Record<

  string,

  {

    name: string

    className: string

  }

> = {

  calm: {

    name: 'Спокій',

    className: 'calm',

  },



  joy: {

    name: 'Радість',

    className: 'joy',

  },



  happiness: {

    name: 'Радість',

    className: 'joy',

  },



  happy: {

    name: 'Радість',

    className: 'joy',

  },



  sadness: {

    name: 'Смуток',

    className: 'sadness',

  },



  sad: {

    name: 'Смуток',

    className: 'sadness',

  },



  fear: {

    name: 'Страх',

    className: 'fear',

  },



  anger: {

    name: 'Гнів',

    className: 'anger',

  },



  angry: {

    name: 'Гнів',

    className: 'anger',

  },



  neutral: {

    name: 'Нейтральний стан',

    className: 'calm',

  },



  'спокій': {

    name: 'Спокій',

    className: 'calm',

  },



  'радість': {

    name: 'Радість',

    className: 'joy',

  },



  'смуток': {

    name: 'Смуток',

    className: 'sadness',

  },



  'страх': {

    name: 'Страх',

    className: 'fear',

  },



  'гнів': {

    name: 'Гнів',

    className: 'anger',

  },



  'нейтральний стан': {

    name: 'Нейтральний стан',

    className: 'calm',

  },

}





function normalizeEmotion(value?: string) {

  const key =

    value

      ?.trim()

      .toLowerCase() ?? ''



  if (emotionConfig[key]) {

    return emotionConfig[key]

  }



  if (!value) {

    return {

      name: 'Невизначено',

      className: 'calm',

    }

  }



  return {

    name: value,

    className: 'calm',

  }

}





function normalizeConfidence(

  value?: number | string,

) {

  const parsed =

    typeof value === 'string'

      ? Number(value)

      : value ?? 0



  if (!Number.isFinite(parsed)) {

    return 0

  }



  if (parsed <= 1) {

    return parsed * 100

  }



  return parsed

}





function normalizeDiaryEntry(

  entry: RawEntry,

): DiaryEntry {

  const emotion =

    entry.analysis_result?.emotion ??

    entry.emotion ??

    entry.emotion_name



  const confidence =

    entry.analysis_result?.confidence ??

    entry.confidence



  return {

    ...entry,

    emotion,

    confidence: normalizeConfidence(

      confidence,

    ),

  }

}





function getEntryDate(entry: DiaryEntry) {

  const rawDate =

    entry.created_at ??

    entry.createdAt ??

    entry.date



  if (!rawDate) {

    return null

  }



  const date = new Date(rawDate)



  if (Number.isNaN(date.getTime())) {

    return null

  }



  return date

}





function getSummaryDate(

  summary: DailySummary,

) {

  if (!summary.date) {

    return null

  }



  const date = new Date(summary.date)



  if (Number.isNaN(date.getTime())) {

    return null

  }



  return date

}





function startOfDay(date: Date) {

  const result = new Date(date)



  result.setHours(0, 0, 0, 0)



  return result

}





function formatChartDate(date: Date) {

  return date.toLocaleDateString(

    'uk-UA',

    {

      day: '2-digit',

      month: '2-digit',

    },

  )

}





function getPeriodStart(

  period: Period,

  now = new Date(),

) {

  const startDate =

    new Date(now)



  if (period === '7days') {

    startDate.setDate(

      now.getDate() - 6,

    )

  } else if (

    period === '30days'

  ) {

    startDate.setDate(

      now.getDate() - 29,

    )

  } else {

    startDate.setMonth(

      now.getMonth() - 3,

    )

  }



  startDate.setHours(

    0,

    0,

    0,

    0,

  )



  return startDate

}





function readCount(

  value: unknown,

) {

  const number =

    Number(value ?? 0)



  if (

    !Number.isFinite(number) ||

    number < 0

  ) {

    return 0

  }



  return Math.round(number)

}



function normalizeEntryType(

  value?: string,

): EntryKind | null {

  const type =

    value

      ?.trim()

      .toLowerCase() ?? ''



  if (

    type === 'text' ||

    type === 'текст'

  ) {

    return 'text'

  }



  if (

    type === 'voice' ||

    type === 'audio' ||

    type === 'голос'

  ) {

    return 'voice'

  }



  if (

    type === 'photo' ||

    type === 'image' ||

    type === 'фото'

  ) {

    return 'photo'

  }



  return null

}





function StatisticsPage() {

  const [period, setPeriod] =

    useState<Period>('30days')



  const [

    showPeriodMenu,

    setShowPeriodMenu,

  ] = useState(false)



  const [entries, setEntries] =

    useState<DiaryEntry[]>([])



  const [

    dailySummaries,

    setDailySummaries,

  ] = useState<DailySummary[]>([])



  const [loading, setLoading] =

    useState(true)



  const [error, setError] =

    useState('')





  /* =====================================================

     LOAD DATA

     \===================================================== */



  useEffect(() => {

    let cancelled = false



    const loadData = async () => {

      setLoading(true)

      setError('')



      const token =

        localStorage.getItem(

          'accessToken',

        )



      if (!token) {

        if (!cancelled) {

          setEntries([])

          setDailySummaries([])



          setError(

            'Необхідно увійти в систему.',

          )



          setLoading(false)

        }



        return

      }



      const headers = {

        Authorization:

          `Bearer ${token}`,

        Accept:

          'application/json',

      }



      try {

        

        const entriesResponse =

          await fetch(

            `${API_URL}/diary/entries`,

            {

              method: 'GET',

              headers,

            },

          )



        if (!entriesResponse.ok) {

          if (

            entriesResponse.status === 401

          ) {

            throw new Error(

              'Сесія завершилася. Увійди в систему повторно.',

            )

          }



          throw new Error(

            `Не вдалося завантажити записи (${entriesResponse.status}).`,

          )

        }



        const entriesData: unknown =

          await entriesResponse.json()



        let rawEntries: RawEntry[] = []



        if (

          Array.isArray(entriesData)

        ) {

          rawEntries =

            entriesData as RawEntry[]

        } else if (

          entriesData &&

          typeof entriesData === 'object'

        ) {

          const object =

            entriesData as Record<

              string,

              unknown

            >



          if (

            Array.isArray(

              object.entries,

            )

          ) {

            rawEntries =

              object.entries as RawEntry[]

          } else if (

            Array.isArray(

              object.items,

            )

          ) {

            rawEntries =

              object.items as RawEntry[]

          } else if (

            Array.isArray(

              object.data,

            )

          ) {

            rawEntries =

              object.data as RawEntry[]

          }

        }



        const normalizedEntries =

          rawEntries.map(

            normalizeDiaryEntry,

          )




        let summaries: DailySummary[] = []



        try {

          const summariesResponse =

            await fetch(

              `${API_URL}/diary/daily-summaries`,

              {

                method: 'GET',

                headers,

              },

            )



          if (summariesResponse.ok) {

            const summaryData: unknown =

              await summariesResponse.json()



            if (

              Array.isArray(summaryData)

            ) {

              summaries =

                summaryData as DailySummary[]

            } else if (

              summaryData &&

              typeof summaryData ===

                'object'

            ) {

              const object =

                summaryData as Record<

                  string,

                  unknown

                >



              if (

                Array.isArray(

                  object.summaries,

                )

              ) {

                summaries =

                  object.summaries as DailySummary[]

              } else if (

                Array.isArray(

                  object.items,

                )

              ) {

                summaries =

                  object.items as DailySummary[]

              } else if (

                Array.isArray(

                  object.data,

                )

              ) {

                summaries =

                  object.data as DailySummary[]

              }

            }

          } else {

            console.warn(

              'Daily summaries request failed:',

              summariesResponse.status,

            )

          }

        } catch (

          summariesError

        ) {

          console.warn(

            'Daily summaries loading error:',

            summariesError,

          )

        }



        if (!cancelled) {

          setEntries(

            normalizedEntries,

          )



          setDailySummaries(

            summaries,

          )

        }

      } catch (requestError) {

        console.error(

          'Statistics loading error:',

          requestError,

        )



        if (!cancelled) {

          setEntries([])

          setDailySummaries([])



          setError(

            requestError instanceof Error

              ? requestError.message

              : 'Не вдалося завантажити статистику.',

          )

        }

      } finally {

        if (!cancelled) {

          setLoading(false)

        }

      }

    }



    void loadData()



    return () => {

      cancelled = true

    }

  }, [])





  /* =====================================================

     PERIOD

     \===================================================== */



  const periodLabel =

    useMemo(() => {

      if (period === '7days') {

        return 'Останні 7 днів'

      }



      if (period === '3months') {

        return 'Останні 3 місяці'

      }



      return 'Останні 30 днів'

    }, [period])





  const filteredEntries =

    useMemo(() => {

      const now =

        new Date()



      const startDate =

        getPeriodStart(

          period,

          now,

        )



      return entries.filter(

        (entry) => {

          const date =

            getEntryDate(entry)



          if (!date) {

            return false

          }



          return (

            date >= startDate &&

            date <= now

          )

        },

      )

    }, [

      entries,

      period,

    ])





  const filteredSummaries =

    useMemo(() => {

      const now =

        new Date()



      const startDate =

        getPeriodStart(

          period,

          now,

        )



      return dailySummaries.filter(

        (summary) => {

          const date =

            getSummaryDate(summary)



          if (!date) {

           

            return true

          }



          return (

            date >= startDate &&

            date <= now

          )

        },

      )

    }, [

      dailySummaries,

      period,

    ])





  const totalEntries =

    filteredEntries.length





  /* =====================================================

     EMOTION STATISTICS

     \===================================================== */



  const emotionStats =

    useMemo<EmotionStat[]>(

      () => {

        const map =

          new Map<

            string,

            {

              count: number

              className: string

            }

          >()



        filteredEntries.forEach(

          (entry) => {

            const emotion =

              normalizeEmotion(

                entry.emotion ??

                  entry.emotion_name,

              )



            const current =

              map.get(

                emotion.name,

              )



            map.set(

              emotion.name,

              {

                count:

                  (current?.count ??

                    0) + 1,



                className:

                  emotion.className,

              },

            )

          },

        )



        return Array.from(

          map.entries(),

        )

          .map(

            ([

              name,

              value,

            ]) => ({

              name,



              count:

                value.count,



              percentage:

                totalEntries > 0

                  ? Math.round(

                      (

                        value.count /

                        totalEntries

                      ) * 100,

                    )

                  : 0,



              className:

                value.className,

            }),

          )

          .sort(

            (a, b) =>

              b.count -

              a.count,

          )

      },

      [

        filteredEntries,

        totalEntries,

      ],

    )





  const dominantEmotion =

    emotionStats[0] ?? {

      name: 'Немає даних',

      count: 0,

      percentage: 0,

      className: 'calm',

    }





  /* =====================================================

     AVERAGE CONFIDENCE

     \===================================================== */



  const averageConfidence =

    useMemo(() => {

      const confidenceValues =

        filteredEntries

          .map((entry) =>

            normalizeConfidence(

              entry.confidence,

            ),

          )

          .filter(

            (value) =>

              value > 0,

          )



      if (

        confidenceValues.length ===

        0

      ) {

        return 0

      }



      const sum =

        confidenceValues.reduce(

          (

            accumulator,

            value,

          ) =>

            accumulator +

            value,

          0,

        )



      return Math.round(

        sum /

          confidenceValues.length,

      )

    }, [filteredEntries])





  /* =====================================================

     ACTIVE DAYS

     \===================================================== */



  const activeDays =

    useMemo(() => {

      const days =

        new Set<string>()



      filteredEntries.forEach(

        (entry) => {

          const date =

            getEntryDate(entry)



          if (!date) {

            return

          }



          days.add(

            `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,

          )

        },

      )



      return days.size

    }, [filteredEntries])





  /* =====================================================

     ENTRY TYPES

     \===================================================== */



  const entryTypeCounts =

    useMemo(() => {


      if (

        filteredSummaries.length > 0

      ) {

        let text = 0

        let voice = 0

        let photo = 0



        let hasTypeData = false



        filteredSummaries.forEach(

          (summary) => {

            const textValue =

              summary.text_entries_count ??

              summary.text_count



            const voiceValue =

              summary.voice_entries_count ??

              summary.voice_count



            const photoValue =

              summary.image_entries_count ??

              summary.photo_entries_count ??

              summary.image_count ??

              summary.photo_count



            if (

              textValue !== undefined ||

              voiceValue !== undefined ||

              photoValue !== undefined

            ) {

              hasTypeData = true

            }



            text +=

              readCount(textValue)



            voice +=

              readCount(voiceValue)



            photo +=

              readCount(photoValue)

          },

        )



        if (hasTypeData) {

          return {

            text,

            voice,

            photo,

          }

        }

      }


      const counts = {

        text: 0,

        voice: 0,

        photo: 0,

      }



      filteredEntries.forEach(

        (entry) => {

          const type =

            normalizeEntryType(

              entry.type ??

                entry.entry_type,

            )



          if (!type) {

            return

          }



          counts[type] += 1

        },

      )



      return counts

    }, [

      filteredEntries,

      filteredSummaries,

    ])





  const typedEntriesTotal =

    entryTypeCounts.text +

    entryTypeCounts.voice +

    entryTypeCounts.photo





  const entryTypes =

    useMemo<EntryTypeStat[]>(

      () => {

        const denominator =

          typedEntriesTotal > 0

            ? typedEntriesTotal

            : totalEntries



        const percentage = (

          count: number,

        ) =>

          denominator > 0

            ? Math.round(

                (

                  count /

                  denominator

                ) * 100,

              )

            : 0



        return [

          {

            type: 'Текст',

            count:

              entryTypeCounts.text,

            percentage:

              percentage(

                entryTypeCounts.text,

              ),

            icon: FileText,

            className: 'text',

          },



          {

            type: 'Голос',

            count:

              entryTypeCounts.voice,

            percentage:

              percentage(

                entryTypeCounts.voice,

              ),

            icon: Mic,

            className: 'voice',

          },



          {

            type: 'Фото',

            count:

              entryTypeCounts.photo,

            percentage:

              percentage(

                entryTypeCounts.photo,

              ),

            icon: Camera,

            className: 'photo',

          },

        ]

      },

      [

        entryTypeCounts,

        typedEntriesTotal,

        totalEntries,

      ],

    )





  /* =====================================================

     CHART

     \===================================================== */



  const chartData =

    useMemo<ChartPoint[]>(

      () => {

        const numberOfPoints =

          period === '7days'

            ? 7

            : 8



        const daysBack =

          period === '7days'

            ? 6

            : period ===

                '30days'

              ? 29

              : 89



        const now =

          startOfDay(

            new Date(),

          )



        const start =

          new Date(now)



        start.setDate(

          now.getDate() -

            daysBack,

        )



        const totalDays =

          Math.max(

            1,

            Math.round(

              (

                now.getTime() -

                start.getTime()

              ) /

                (

                  1000 *

                  60 *

                  60 *

                  24

                ),

            ),

          )



        return Array.from(

          {

            length:

              numberOfPoints,

          },



          (_, index) => {

            const denominator =

              Math.max(

                numberOfPoints -

                  1,

                1,

              )



            const ratio =

              index /

              denominator



            const targetDate =

              new Date(start)



            targetDate.setDate(

              start.getDate() +

                Math.round(

                  totalDays *

                    ratio,

                ),

            )



            const rangeSize =

              period === '7days'

                ? 0

                : period ===

                    '30days'

                  ? 2

                  : 7



            const from =

              new Date(

                targetDate,

              )



            const to =

              new Date(

                targetDate,

              )



            from.setDate(

              from.getDate() -

                rangeSize,

            )



            from.setHours(

              0,

              0,

              0,

              0,

            )



            to.setDate(

              to.getDate() +

                rangeSize,

            )



            to.setHours(

              23,

              59,

              59,

              999,

            )



            const values =

              filteredEntries

                .filter(

                  (entry) => {

                    const date =

                      getEntryDate(

                        entry,

                      )



                    if (!date) {

                      return false

                    }



                    return (

                      date >= from &&

                      date <= to

                    )

                  },

                )

                .map((entry) =>

                  normalizeConfidence(

                    entry.confidence,

                  ),

                )

                .filter(

                  (value) =>

                    value > 0,

                )



            const value =

              values.length > 0

                ? Math.round(

                    values.reduce(

                      (

                        sum,

                        current,

                      ) =>

                        sum +

                        current,

                      0,

                    ) /

                      values.length,

                  )

                : 0



            return {

              label:

                formatChartDate(

                  targetDate,

                ),



              value,

            }

          },

        )

      },

      [

        filteredEntries,

        period,

      ],

    )





  const chartPoints =

    useMemo(() => {

      const width = 760

      const height = 230



      const horizontalPadding =

        24



      const verticalPadding =

        24



      const usableWidth =

        width -

        horizontalPadding * 2



      const usableHeight =

        height -

        verticalPadding * 2



      return chartData.map(

        (point, index) => {

          const denominator =

            Math.max(

              chartData.length -

                1,

              1,

            )



          const x =

            horizontalPadding +

            (

              index /

              denominator

            ) *

              usableWidth



          const normalizedValue =

            Math.min(

              Math.max(

                point.value,

                0,

              ),

              100,

            ) / 100



          const y =

            height -

            verticalPadding -

            normalizedValue *

              usableHeight



          return {

            ...point,

            x,

            y,

          }

        },

      )

    }, [chartData])





  const polylinePoints =

    chartPoints

      .map(

        (point) =>

          `${point.x},${point.y}`,

      )

      .join(' ')





  /* =====================================================

     TREND

     \===================================================== */



  const isPositiveTrend =

    useMemo(() => {

      const validPoints =

        chartData.filter(

          (point) =>

            point.value > 0,

        )



      if (

        validPoints.length < 2

      ) {

        return true

      }



      return (

        validPoints[

          validPoints.length -

            1

        ].value >=

        validPoints[0].value

      )

    }, [chartData])





  /* =====================================================

     ACTIVITY MONTH

     \===================================================== */



  const activityMonthDate =

    useMemo(() => {

      const dates =

        filteredEntries

          .map((entry) =>

            getEntryDate(entry),

          )

          .filter(

            (

              date,

            ): date is Date =>

              date !== null,

          )



      if (

        dates.length === 0

      ) {

        return new Date()

      }



      return new Date(

        Math.max(

          ...dates.map(

            (date) =>

              date.getTime(),

          ),

        ),

      )

    }, [filteredEntries])





  const activityMonthLabel =

    useMemo(

      () =>

        activityMonthDate.toLocaleDateString(

          'uk-UA',

          {

            month: 'long',

            year: 'numeric',

          },

        ),

      [activityMonthDate],

    )





  const activityDays =

    useMemo<ActivityDay[]>(

      () => {

        const year =

          activityMonthDate.getFullYear()



        const month =

          activityMonthDate.getMonth()



        const daysInMonth =

          new Date(

            year,

            month + 1,

            0,

          ).getDate()



        return Array.from(

          {

            length:

              daysInMonth,

          },



          (_, index) => {

            const day =

              index + 1



            const count =

              filteredEntries.filter(

                (entry) => {

                  const date =

                    getEntryDate(

                      entry,

                    )



                  if (!date) {

                    return false

                  }



                  return (

                    date.getFullYear() ===

                      year &&

                    date.getMonth() ===

                      month &&

                    date.getDate() ===

                      day

                  )

                },

              ).length



            return {

              day,

              count,

            }

          },

        )

      },

      [

        activityMonthDate,

        filteredEntries,

      ],

    )





  const firstDayOffset =

    useMemo(() => {

      const firstDay =

        new Date(

          activityMonthDate.getFullYear(),

          activityMonthDate.getMonth(),

          1,

        ).getDay()



      return (

        firstDay + 6

      ) % 7

    }, [activityMonthDate])





  const getActivityClass = (

    count: number,

  ) => {

    if (count >= 3) {

      return 'activity-level-3'

    }



    if (count === 2) {

      return 'activity-level-2'

    }



    if (count === 1) {

      return 'activity-level-1'

    }



    return 'activity-level-0'

  }





  /* =====================================================

     DONUT

     \===================================================== */



  const donutBackground =

    useMemo(() => {

      if (

        emotionStats.length ===

        0

      ) {

        return (

          'conic-gradient(' +

          '#f1e7e9 0 100%' +

          ')'

        )

      }



      const colors = [

        '#d67b91',

        '#e7aa70',

        '#8aa9ca',

        '#ad8bc4',

        '#bf7f88',

        '#8eb5a2',

      ]



      let current = 0



      const parts =

        emotionStats.map(

          (

            emotion,

            index,

          ) => {

            const start =

              current



            current +=

              emotion.percentage



            return `${

              colors[

                index %

                  colors.length

              ]

            } ${start}% ${current}%`

          },

        )



      return `conic-gradient(${parts.join(

        ', ',

      )})`

    }, [emotionStats])





  /* =====================================================

     INSIGHT

     \===================================================== */



  const insightText =

    useMemo(() => {

      if (

        totalEntries === 0

      ) {

        return {

          title:

            'За цей період ще немає достатньо даних для спостереження.',



          description:

            'Додай нові записи, і MOVA покаже зміни твого емоційного стану.',

        }

      }



      return {

        title:

          `За цей період найчастіше переважала емоція «${dominantEmotion.name}».`,



        description:

          isPositiveTrend

            ? 'Наприкінці обраного періоду показники мають позитивну динаміку.'

            : 'Наприкінці обраного періоду показники дещо знизилися.',

      }

    }, [

      dominantEmotion.name,

      isPositiveTrend,

      totalEntries,

    ])





  /* =====================================================

     JSX

     \===================================================== */



  return (

    <main className="statistics-page">

      <DashboardHeader />



      <section className="statistics-container">



        <div className="statistics-page-header">

          <div className="statistics-title">

            <div className="statistics-title-icon">

              <BarChart3 size={25} />

            </div>



            <div>

              <p>

                Твоя аналітика

              </p>



              <h1>

                Статистика емоцій

              </h1>



              <span>

                Спостерігай за змінами

                емоційного стану та

                активністю у щоденнику.

              </span>

            </div>

          </div>



          <div className="statistics-period">

            <button

              className="statistics-period-button"

              type="button"

              onClick={() =>

                setShowPeriodMenu(

                  (value) => !value,

                )

              }

            >

              <CalendarDays size={18} />



              {periodLabel}



              <ChevronDown size={17} />

            </button>



            {showPeriodMenu && (

              <div className="statistics-period-menu">

                <button

                  type="button"

                  className={

                    period === '7days'

                      ? 'active'

                      : ''

                  }

                  onClick={() => {

                    setPeriod('7days')

                    setShowPeriodMenu(false)

                  }}

                >

                  Останні 7 днів

                </button>



                <button

                  type="button"

                  className={

                    period === '30days'

                      ? 'active'

                      : ''

                  }

                  onClick={() => {

                    setPeriod('30days')

                    setShowPeriodMenu(false)

                  }}

                >

                  Останні 30 днів

                </button>



                <button

                  type="button"

                  className={

                    period === '3months'

                      ? 'active'

                      : ''

                  }

                  onClick={() => {

                    setPeriod('3months')

                    setShowPeriodMenu(false)

                  }}

                >

                  Останні 3 місяці

                </button>

              </div>

            )}

          </div>

        </div>





        {error && (

          <div

            style={{

              marginBottom: '20px',

            }}

          >

            {error}

          </div>

        )}





        <section className="statistics-summary">



          <article className="statistics-summary-card">

            <div className="statistics-summary-icon">

              <FileText size={21} />

            </div>



            <div>

              <span>

                Записів

              </span>



              <strong>

                {loading

                  ? '—'

                  : totalEntries}

              </strong>



              <small>

                за обраний період

              </small>

            </div>

          </article>





          <article className="statistics-summary-card">

            <div className="statistics-summary-icon">

              <Smile size={21} />

            </div>



            <div>

              <span>

                Найчастіша емоція

              </span>



              <strong className="statistics-summary-emotion">
  {loading
    ? '—'
    : dominantEmotion.name}
</strong>



              <small>

                {dominantEmotion.percentage}%{' '}

                усіх записів

              </small>

            </div>

          </article>





          <article className="statistics-summary-card">

            <div className="statistics-summary-icon">

              <Sparkles size={21} />

            </div>



            <div>

              <span>

                Середня впевненість

              </span>



              <strong>

                {loading

                  ? '—'

                  : `${averageConfidence}%`}

              </strong>



              <small>

                результатів аналізу

              </small>

            </div>

          </article>





          <article className="statistics-summary-card">

            <div className="statistics-summary-icon">

              <CalendarDays size={21} />

            </div>



            <div>

              <span>

                Активних днів

              </span>



              <strong>

                {loading

                  ? '—'

                  : activeDays}

              </strong>



              <small>

                із записами

              </small>

            </div>

          </article>



        </section>





        <section className="statistics-card statistics-chart-card">



          <div className="statistics-card-heading">

            <div>

              <span>

                Динаміка

              </span>



              <h2>

                Емоційний стан

              </h2>



              <p>

                Зміна загального

                емоційного показника

                протягом обраного періоду.

              </p>

            </div>



            <div className="statistics-trend">

              {isPositiveTrend ? (

                <TrendingUp size={18} />

              ) : (

                <TrendingDown size={18} />

              )}



              {isPositiveTrend

                ? 'Позитивна динаміка'

                : 'Негативна динаміка'}

            </div>

          </div>





          <div className="statistics-line-chart">

            <div className="statistics-chart-y-axis">

              <span>100</span>

              <span>75</span>

              <span>50</span>

              <span>25</span>

              <span>0</span>

            </div>



            <div className="statistics-chart-area">

              <div className="statistics-chart-grid">

                <span />

                <span />

                <span />

                <span />

                <span />

              </div>



              {chartPoints.length > 0 && (

                <svg

                  className="statistics-chart-svg"

                  viewBox="0 0 760 230"

                  preserveAspectRatio="none"

                  aria-label="Графік динаміки емоційного стану"

                >

                  <defs>

                    <linearGradient

                      id="statisticsAreaGradient"

                      x1="0"

                      y1="0"

                      x2="0"

                      y2="1"

                    >

                      <stop

                        offset="0%"

                        stopColor="currentColor"

                        stopOpacity="0.22"

                      />



                      <stop

                        offset="100%"

                        stopColor="currentColor"

                        stopOpacity="0"

                      />

                    </linearGradient>

                  </defs>



                  <polygon

                    className="statistics-chart-area-fill"

                    points={`

                      ${chartPoints[0].x},230

                      ${polylinePoints}

                      ${

                        chartPoints[

                          chartPoints.length - 1

                        ].x

                      },230

                    `}

                  />



                  <polyline

                    className="statistics-chart-line"

                    points={polylinePoints}

                    fill="none"

                  />



                  {chartPoints.map(

                    (point, index) => (

                      <g

                        key={`${point.label}-${index}`}

                      >

                        <circle

                          className="statistics-chart-point-ring"

                          cx={point.x}

                          cy={point.y}

                          r="7"

                        />



                        <circle

                          className="statistics-chart-point"

                          cx={point.x}

                          cy={point.y}

                          r="4"

                        />

                      </g>

                    ),

                  )}

                </svg>

              )}



              <div className="statistics-chart-labels">

                {chartData.map(

                  (point, index) => (

                    <span

                      key={`${point.label}-${index}`}

                    >

                      {point.label}

                    </span>

                  ),

                )}

              </div>

            </div>

          </div>



        </section>





        <section className="statistics-two-columns">



          <article className="statistics-card">



            <div className="statistics-card-heading">

              <div>

                <span>

                  Емоції

                </span>



                <h2>

                  Розподіл емоцій

                </h2>



                <p>

                  Частка кожної емоції

                  серед усіх записів.

                </p>

              </div>

            </div>





            <div className="emotion-distribution">



              <div

                className="emotion-donut"

                aria-label="Діаграма розподілу емоцій"

                style={{

                  background:

                    donutBackground,

                }}

              >

                <div className="emotion-donut-center">

                  <strong>

                    {totalEntries}

                  </strong>



                  <span>

                    записів

                  </span>

                </div>

              </div>





              <div className="emotion-legend">



                {emotionStats.length === 0 ? (

                  <div className="emotion-legend-row">

                    <span>

                      Даних ще немає

                    </span>

                  </div>

                ) : (

                  emotionStats.map(

                    (emotion) => (

                      <div

                        className="emotion-legend-row"

                        key={emotion.name}

                      >

                        <span

                          className={`emotion-dot ${emotion.className}`}

                        />



                        <span className="emotion-legend-name">

                          {emotion.name}

                        </span>



                        <strong>

                          {emotion.percentage}%

                        </strong>

                      </div>

                    ),

                  )

                )}



              </div>



            </div>



          </article>





          <article className="statistics-card">



            <div className="statistics-card-heading">

              <div>

                <span>

                  Частота

                </span>



                <h2>

                  Найчастіші емоції

                </h2>



                <p>

                  Скільки разів кожна

                  емоція була визначена

                  системою.

                </p>

              </div>

            </div>





            <div className="emotion-bars">



              {emotionStats.map(

                (emotion) => (

                  <div

                    className="emotion-bar-row"

                    key={emotion.name}

                  >

                    <div className="emotion-bar-info">

                      <span>

                        {emotion.name}

                      </span>



                      <strong>

                        {emotion.count}

                      </strong>

                    </div>



                    <div className="emotion-bar-track">

                      <span

                        className={`emotion-bar-fill ${emotion.className}`}

                        style={{

                          width:

                            `${emotion.percentage}%`,

                        }}

                      />

                    </div>

                  </div>

                ),

              )}



            </div>



          </article>



        </section>





        <section className="statistics-two-columns">



          <article className="statistics-card">



            <div className="statistics-card-heading">

              <div>

                <span>

                  Активність

                </span>



                <h2

                  style={{

                    textTransform:

                      'capitalize',

                  }}

                >

                  {activityMonthLabel}

                </h2>



                <p>

                  Дні, у які ти додавав

                  записи до щоденника.

                </p>

              </div>

            </div>





            <div className="activity-calendar">



              <div className="activity-weekdays">

                <span>Пн</span>

                <span>Вт</span>

                <span>Ср</span>

                <span>Чт</span>

                <span>Пт</span>

                <span>Сб</span>

                <span>Нд</span>

              </div>





              <div className="activity-days">



                {Array.from(

                  {

                    length:

                      firstDayOffset,

                  },

                  (_, index) => (

                    <span

                      className="activity-empty"

                      key={`empty-${index}`}

                    />

                  ),

                )}





                {activityDays.map(

                  (day) => (

                    <div

                      className={`activity-day ${

                        getActivityClass(

                          day.count,

                        )

                      }`}

                      key={day.day}

                      title={

                        day.count === 0

                          ? `${day.day} — записів немає`

                          : `${day.day} — ${day.count} записів`

                      }

                    >

                      {day.day}

                    </div>

                  ),

                )}



              </div>





              <div className="activity-legend">

                <span>

                  Менше

                </span>



                <i className="activity-level-0" />

                <i className="activity-level-1" />

                <i className="activity-level-2" />

                <i className="activity-level-3" />



                <span>

                  Більше

                </span>

              </div>



            </div>



          </article>





          <article className="statistics-card">



            <div className="statistics-card-heading">

              <div>

                <span>

                  Формат

                </span>



                <h2>

                  Типи записів

                </h2>



                <p>

                  Які способи ведення

                  щоденника ти використовуєш.

                </p>

              </div>

            </div>





            <div className="entry-types">



              {entryTypes.map(

                (entryType) => {

                  const Icon =

                    entryType.icon



                  return (

                    <div

                      className="entry-type-row"

                      key={entryType.type}

                    >

                      <div

                        className={`entry-type-icon ${entryType.className}`}

                      >

                        <Icon size={20} />

                      </div>



                      <div className="entry-type-content">



                        <div className="entry-type-info">

                          <span>

                            {entryType.type}

                          </span>



                          <strong>

                            {entryType.count}

                          </strong>

                        </div>



                        <div className="entry-type-track">

                          <span

                            className={

                              entryType.className

                            }

                            style={{

                              width:

                                `${entryType.percentage}%`,

                            }}

                          />

                        </div>



                      </div>



                      <span className="entry-type-percentage">

                        {entryType.percentage}%

                      </span>

                    </div>

                  )

                },

              )}



            </div>





            <div className="entry-types-total">

              <div>

                <FileText size={17} />



                <span>

                  Усього записів

                </span>

              </div>



              <strong>

                {totalEntries}

              </strong>

            </div>



          </article>



        </section>





        <section className="statistics-insight">



          <div className="statistics-insight-icon">

            <Sparkles size={22} />

          </div>



          <div>

            <span>

              Спостереження MOVA

            </span>



            <h3>

              {insightText.title}

            </h3>



            <p>

              {insightText.description}

            </p>

          </div>



        </section>



      </section>

    </main>

  )

}





export default StatisticsPage