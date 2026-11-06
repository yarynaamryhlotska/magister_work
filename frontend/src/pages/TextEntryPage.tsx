import {
  Check,
  FileText,
  LoaderCircle,
  Save,
  Sparkles,
} from 'lucide-react'

import {
  useMemo,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import DashboardHeader from '../components/DashboardHeader'

import './TextEntryPage.css'


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


interface TextEntry {
  id: number
  content: string
}


interface DiaryEntry {
  id: number
  user_id: number
  status: string
  created_at: string
  updated_at: string

  text_entry: TextEntry | null
  analysis_result: AnalysisResult | null
}


type EmotionInfo = {
  key: string
  name: string
  emoji: string
  description: string
}


const MAX_TEXT_LENGTH = 3000


const emotionInfo: Record<string, EmotionInfo> = {
  anger: {
    key: 'anger',
    name: 'Злість',
    emoji: '😠',
    description:
      'У тексті переважають ознаки злості або роздратування.',
  },

  angry: {
    key: 'anger',
    name: 'Злість',
    emoji: '😠',
    description:
      'У тексті переважають ознаки злості або роздратування.',
  },

  disgust: {
    key: 'disgust',
    name: 'Відраза',
    emoji: '😖',
    description:
      'У тексті помітні ознаки відрази або сильного неприйняття.',
  },

  fear: {
    key: 'fear',
    name: 'Страх',
    emoji: '😨',
    description:
      'У тексті переважають ознаки страху, хвилювання або тривоги.',
  },

  joy: {
    key: 'joy',
    name: 'Радість',
    emoji: '😄',
    description:
      'У тексті переважають позитивні емоції та відчуття радості.',
  },

  happy: {
    key: 'joy',
    name: 'Радість',
    emoji: '😄',
    description:
      'У тексті переважають позитивні емоції та відчуття радості.',
  },

  neutral: {
    key: 'neutral',
    name: 'Нейтральний стан',
    emoji: '😐',
    description:
      'Текст не містить яскраво вираженої домінуючої емоції.',
  },

  none: {
    key: 'neutral',
    name: 'Нейтральний стан',
    emoji: '😐',
    description:
      'Текст не містить яскраво вираженої домінуючої емоції.',
  },

  sadness: {
    key: 'sadness',
    name: 'Смуток',
    emoji: '😢',
    description:
      'У тексті переважають ознаки смутку або пригніченого настрою.',
  },

  sad: {
    key: 'sadness',
    name: 'Смуток',
    emoji: '😢',
    description:
      'У тексті переважають ознаки смутку або пригніченого настрою.',
  },

  surprise: {
    key: 'surprise',
    name: 'Здивування',
    emoji: '😮',
    description:
      'У тексті переважають ознаки здивування або несподіванки.',
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
        'Результат аналізу текстового запису.',
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
        'Результат аналізу текстового запису.',
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

    if (
      typeof detail === 'string'
    ) {
      return detail
    }
  }

  return fallback
}


function TextEntryPage() {
  const navigate = useNavigate()

  const [
    text,
    setText,
  ] = useState('')

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


  const characterCount =
    text.length


  const canAnalyze =
    text.trim().length > 0 &&
    text.length <= MAX_TEXT_LENGTH &&
    !isAnalyzing


  const result =
    analyzedEntry?.analysis_result ??
    null


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


  const handleTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value =
      event.target.value

    if (
      value.length >
      MAX_TEXT_LENGTH
    ) {
      return
    }

    setText(value)

   
    if (analyzedEntry) {
      setAnalyzedEntry(null)
    }

    if (error) {
      setError('')
    }
  }


  const handleAnalyze = async () => {
    const cleanText =
      text.trim()

    if (!cleanText) {
      setError(
        'Спочатку напиши кілька слів про свій день.',
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

      const response = await fetch(
        'http://127.0.0.1:8000/diary/entries',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            text_content:
              cleanText,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Не вдалося проаналізувати текст.',
          ),
        )
      }

      setAnalyzedEntry(
        data as DiaryEntry,
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не вдалося проаналізувати текст.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }


  const handleSave = async () => {
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

      const response = await fetch(
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
    } catch (requestError) {
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
    <main className="text-entry-page">

      <div className="text-entry-background text-entry-background-one" />
      <div className="text-entry-background text-entry-background-two" />


      {}
      <DashboardHeader />


      <section className="text-entry-content">

        <div className="text-entry-intro">

          <span className="text-entry-eyebrow">
            <FileText size={16} />
            Текстовий запис
          </span>

          <h1>
            Розкажи про свій день
          </h1>

          <p>
            Опиши події, думки та почуття.
            MOVA проаналізує текст і допоможе
            визначити емоцію, яка в ньому
            переважає.
          </p>

        </div>


        <div className="text-entry-layout">

          {}

          <article className="text-entry-card">

            <div className="text-entry-card-heading">

              <span className="text-entry-card-icon">
                <FileText size={22} />
              </span>

              <div>
                <strong>
                  Твій запис
                </strong>

                <small>
                  Напиши те, що зараз відчуваєш
                </small>
              </div>

            </div>


            <div className="text-entry-field">

              <textarea
                value={text}
                onChange={
                  handleTextChange
                }
                placeholder="Наприклад: сьогодні був насичений день. Я багато встигла, зустрілася з друзями і ввечері відчула спокій та задоволення..."
                maxLength={
                  MAX_TEXT_LENGTH
                }
                disabled={
                  isAnalyzing ||
                  isSaving
                }
              />

              <div className="text-entry-counter">
                {characterCount}
                {' / '}
                {MAX_TEXT_LENGTH}
              </div>

            </div>


            {error && (
              <div className="text-entry-error">
                {error}
              </div>
            )}


            <button
              className="text-entry-analyze"
              type="button"
              onClick={
                handleAnalyze
              }
              disabled={
                !canAnalyze ||
                isSaving
              }
            >

              {isAnalyzing ? (
                <>
                  <LoaderCircle
                    className="text-entry-spinner"
                    size={19}
                  />

                  Аналізуємо...
                </>
              ) : (
                <>
                  <Sparkles size={19} />

                  Аналізувати
                </>
              )}

            </button>

          </article>


          {}

          <article
            className={
              result
                ? 'text-result-card text-result-card-ready'
                : 'text-result-card'
            }
          >

            {!result ? (

              <div className="text-result-empty">

                <span>
                  <Sparkles size={29} />
                </span>

                <h2>
                  Результат аналізу
                </h2>

                <p>
                  Напиши текст та натисни
                  «Аналізувати». Тут з’явиться
                  визначена емоція та
                  впевненість моделі.
                </p>

              </div>

            ) : (

              <>
                <div className="text-result-top">

                  <span>
                    Результат аналізу
                  </span>

                  <span className="text-result-status">
                    <Check size={14} />

                    Проаналізовано
                  </span>

                </div>


                <div className="text-result-main">

                  <div className="text-result-emoji">
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


                <div className="text-result-confidence">

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


                  <div className="text-result-progress">

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


                <div className="text-result-description">

                  <Sparkles size={17} />

                  <p>
                    {
                      currentEmotion.description
                    }
                  </p>

                </div>


                <button
                  className="text-entry-save"
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
                        className="text-entry-spinner"
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


export default TextEntryPage