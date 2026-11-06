import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  X,
} from 'lucide-react'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  ChangeEvent,
} from 'react'

import { useNavigate } from 'react-router-dom'

import DashboardHeader from '../components/DashboardHeader'

import './PhotoEntryPage.css'


interface EmotionScores {
  angry?: number
  disgust?: number
  fear?: number
  happy?: number
  neutral?: number
  sad?: number
  surprise?: number
}


interface AnalysisResult {
  id?: number
  emotion: string
  confidence: number
  recommendation?: string | null
  created_at?: string
  scores?: EmotionScores | null

  anger_score?: number | null
  disgust_score?: number | null
  fear_score?: number | null
  joy_score?: number | null
  neutral_score?: number | null
  sadness_score?: number | null
  surprise_score?: number | null
}


interface PhotoAnalysisResponse {
  id?: number
  user_id?: number
  status?: string
  created_at?: string
  updated_at?: string

  analysis_result?: AnalysisResult | null

  emotion?: string
  confidence?: number
  recommendation?: string | null
  scores?: EmotionScores | null

  anger_score?: number | null
  disgust_score?: number | null
  fear_score?: number | null
  joy_score?: number | null
  neutral_score?: number | null
  sadness_score?: number | null
  surprise_score?: number | null
}


const emotionNames: Record<string, string> = {
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


function normalizeScore(
  value: number | null | undefined,
): number {
  if (typeof value !== 'number') {
    return 0
  }

  return value
}


function PhotoEntryPage() {
  const navigate = useNavigate()

  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null)

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null)

  const [isAnalyzing, setIsAnalyzing] =
    useState(false)

  const [isSaving, setIsSaving] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null)

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null)

  const [diaryEntryId, setDiaryEntryId] =
    useState<number | null>(null)


  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])


  const handleChoosePhoto = () => {
    fileInputRef.current?.click()
  }


  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      alert(
        'Будь ласка, обери фотографію.',
      )

      event.target.value = ''

      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const newPreviewUrl =
      URL.createObjectURL(file)

    setSelectedFile(file)
    setPreviewUrl(newPreviewUrl)

    setAnalysisResult(null)
    setDiaryEntryId(null)
    setErrorMessage(null)
  }


  const handleRemovePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(null)
    setPreviewUrl(null)

    setAnalysisResult(null)
    setDiaryEntryId(null)
    setErrorMessage(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }


  const handleAnalyzePhoto = async () => {
    if (!selectedFile) {
      alert(
        'Спочатку обери фотографію.',
      )

      return
    }

    const accessToken =
      localStorage.getItem('accessToken')

    if (!accessToken) {
      navigate('/login', {
        replace: true,
      })

      return
    }

    setIsAnalyzing(true)
    setErrorMessage(null)
    setAnalysisResult(null)
    setDiaryEntryId(null)

    try {
      const formData = new FormData()

      formData.append(
        'photo',
        selectedFile,
      )

      const response = await fetch(
        'http://127.0.0.1:8000/diary/photo',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          body: formData,
        },
      )

      const data =
        await response.json()

      console.log(
        'Відповідь backend:',
        data,
      )

      if (!response.ok) {
        let message =
          'Не вдалося проаналізувати фотографію.'

        if (
          typeof data?.detail === 'string'
        ) {
          message = data.detail
        }

        throw new Error(message)
      }

      const rawResult:
        PhotoAnalysisResponse =
        data

      const nestedResult =
        rawResult.analysis_result

      const emotion =
        nestedResult?.emotion ??
        rawResult.emotion

      const confidence =
        nestedResult?.confidence ??
        rawResult.confidence

      if (
        !emotion ||
        typeof confidence !== 'number'
      ) {
        console.error(
          'Невідомий формат відповіді:',
          data,
        )

        throw new Error(
          'Сервер виконав аналіз, але повернув результат у невідомому форматі.',
        )
      }

      const result: AnalysisResult = {
        ...nestedResult,

        emotion,

        confidence,

        recommendation:
          nestedResult?.recommendation ??
          rawResult.recommendation ??
          null,

        scores:
          nestedResult?.scores ??
          rawResult.scores ??
          null,

        anger_score:
          nestedResult?.anger_score ??
          rawResult.anger_score ??
          null,

        disgust_score:
          nestedResult?.disgust_score ??
          rawResult.disgust_score ??
          null,

        fear_score:
          nestedResult?.fear_score ??
          rawResult.fear_score ??
          null,

        joy_score:
          nestedResult?.joy_score ??
          rawResult.joy_score ??
          null,

        neutral_score:
          nestedResult?.neutral_score ??
          rawResult.neutral_score ??
          null,

        sadness_score:
          nestedResult?.sadness_score ??
          rawResult.sadness_score ??
          null,

        surprise_score:
          nestedResult?.surprise_score ??
          rawResult.surprise_score ??
          null,
      }

      setAnalysisResult(result)

      if (
        typeof rawResult.id === 'number'
      ) {
        setDiaryEntryId(
          rawResult.id,
        )
      } else {
        console.error(
          'Backend не повернув ID запису:',
          data,
        )

        throw new Error(
          'Не вдалося отримати ID створеного запису.',
        )
      }
    } catch (error) {
      console.error(
        'Помилка аналізу фото:',
        error,
      )

      if (error instanceof Error) {
        setErrorMessage(
          error.message,
        )
      } else {
        setErrorMessage(
          'Не вдалося проаналізувати фотографію.',
        )
      }
    } finally {
      setIsAnalyzing(false)
    }
  }


  const handleSaveEntry = async () => {
    if (
      !analysisResult ||
      diaryEntryId === null
    ) {
      setErrorMessage(
        'Спочатку проаналізуй фотографію.',
      )

      return
    }

    const accessToken =
      localStorage.getItem('accessToken')

    if (!accessToken) {
      navigate('/login', {
        replace: true,
      })

      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/diary/${diaryEntryId}/complete`,
        {
          method: 'PATCH',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        },
      )

      let data = null

      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        let message =
          'Не вдалося зберегти запис.'

        if (
          typeof data?.detail === 'string'
        ) {
          message = data.detail
        }

        throw new Error(message)
      }

      navigate('/dashboard', {
        replace: true,
      })
    } catch (error) {
      console.error(
        'Помилка збереження запису:',
        error,
      )

      if (error instanceof Error) {
        setErrorMessage(
          error.message,
        )
      } else {
        setErrorMessage(
          'Не вдалося зберегти запис.',
        )
      }
    } finally {
      setIsSaving(false)
    }
  }


  const getEmotionScores = () => {
    if (!analysisResult) {
      return []
    }

    if (
      analysisResult.scores &&
      typeof analysisResult.scores ===
        'object'
    ) {
      return Object.entries(
        analysisResult.scores,
      ).map(([emotion, score]) => ({
        emotion,

        score:
          typeof score === 'number'
            ? score
            : 0,
      }))
    }

    return [
      {
        emotion: 'angry',
        score: normalizeScore(
          analysisResult.anger_score,
        ),
      },
      {
        emotion: 'disgust',
        score: normalizeScore(
          analysisResult.disgust_score,
        ),
      },
      {
        emotion: 'fear',
        score: normalizeScore(
          analysisResult.fear_score,
        ),
      },
      {
        emotion: 'happy',
        score: normalizeScore(
          analysisResult.joy_score,
        ),
      },
      {
        emotion: 'neutral',
        score: normalizeScore(
          analysisResult.neutral_score,
        ),
      },
      {
        emotion: 'sad',
        score: normalizeScore(
          analysisResult.sadness_score,
        ),
      },
      {
        emotion: 'surprise',
        score: normalizeScore(
          analysisResult.surprise_score,
        ),
      },
    ]
  }


  const emotionScores =
    getEmotionScores()
      .filter(
        ({ emotion }) =>
          emotionNames[emotion] !==
          emotionNames[
            analysisResult?.emotion ?? ''
          ],
      )
      .sort(
        (a, b) =>
          b.score - a.score,
      )
      .slice(0, 2)


  return (
    <main className="photo-entry-page">

      {/* ЄДИНА ШАПКА ЯК НА DASHBOARD */}
      <DashboardHeader />


      <section className="photo-entry-container">

        <div className="photo-entry-heading">

          <div className="photo-heading-icon">
            <Camera size={25} />
          </div>

          <div>

            <p>
              Новий запис
            </p>

            <h1>
              Додай фотографію
            </h1>

            <span>
              Обери фотографію обличчя
              для визначення емоційного
              стану.
            </span>

          </div>

        </div>


        <input
          ref={fileInputRef}
          className="photo-file-input"
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          onChange={handleFileChange}
        />


        {!selectedFile ||
        !previewUrl ? (

          <button
            className="photo-upload-box"
            type="button"
            onClick={handleChoosePhoto}
          >

            <div className="photo-upload-icon">
              <ImagePlus size={34} />
            </div>

            <h2>
              Обрати фотографію
            </h2>

            <p>
              Натисни тут, щоб вибрати
              фотографію з комп’ютера
            </p>

            <span>
              JPG, JPEG або PNG
            </span>

          </button>

        ) : (

          <div className="photo-selected-card">

            <div className="photo-selected-top">

              <div>

                <span>
                  Вибране фото
                </span>

                <strong>
                  {selectedFile.name}
                </strong>

              </div>


              <button
                className="photo-delete-button"
                type="button"
                onClick={handleRemovePhoto}
                aria-label="Видалити фотографію"
                disabled={
                  isAnalyzing ||
                  isSaving
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="photo-preview-container">

              <img
                className="photo-preview"
                src={previewUrl}
                alt="Вибрана фотографія"
              />

            </div>


            <div className="photo-actions">

              <button
                className="photo-secondary-button"
                type="button"
                onClick={handleChoosePhoto}
                disabled={
                  isAnalyzing ||
                  isSaving
                }
              >
                <ImagePlus size={18} />

                Обрати інше фото
              </button>


              {!analysisResult ? (

                <button
                  className="photo-primary-button"
                  type="button"
                  onClick={handleAnalyzePhoto}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <LoaderCircle
                        className="photo-loader"
                        size={18}
                      />

                      Аналіз...
                    </>
                  ) : (
                    <>
                      <Camera size={18} />

                      Проаналізувати фото
                    </>
                  )}
                </button>

              ) : (

                <button
                  className="photo-primary-button"
                  type="button"
                  onClick={handleSaveEntry}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle
                        className="photo-loader"
                        size={18}
                      />

                      Збереження...
                    </>
                  ) : (
                    <>
                      <Check size={18} />

                      Зберегти запис
                    </>
                  )}
                </button>

              )}

            </div>


            {errorMessage && (

              <div className="photo-analysis-error">

                <strong>
                  Помилка
                </strong>

                <p>
                  {errorMessage}
                </p>

              </div>

            )}


            {analysisResult && (

              <div className="photo-analysis-result">

                <p className="photo-analysis-label">
                  Результат аналізу
                </p>

                <h2>
                  {emotionNames[
                    analysisResult.emotion
                  ] ??
                    analysisResult.emotion}
                </h2>


                <div className="photo-confidence-row">

                  <span>
                    Впевненість моделі
                  </span>

                  <strong>
                    {(
                      analysisResult.confidence *
                      100
                    ).toFixed(1)}
                    %
                  </strong>

                </div>


                <div className="photo-confidence-bar">

                  <div
                    className="photo-confidence-bar-fill"
                    style={{
                      width:
                        `${analysisResult.confidence * 100}%`,
                    }}
                  />

                </div>


                <p className="photo-secondary-title">
                  Інші ймовірні емоції
                </p>


                <div className="photo-secondary-emotions">

                  {emotionScores.map(
                    ({
                      emotion,
                      score,
                    }) => (

                      <div
                        className="photo-secondary-emotion"
                        key={emotion}
                      >

                        <span>
                          {emotionNames[
                            emotion
                          ] ?? emotion}
                        </span>

                        <strong>
                          {(
                            score * 100
                          ).toFixed(1)}
                          %
                        </strong>

                      </div>

                    ),
                  )}

                </div>


                {analysisResult
                  .recommendation && (

                  <div className="photo-recommendation">

                    <strong>
                      Рекомендація
                    </strong>

                    <p>
                      {
                        analysisResult
                          .recommendation
                      }
                    </p>

                  </div>

                )}

              </div>

            )}

          </div>

        )}

      </section>

    </main>
  )
}


export default PhotoEntryPage