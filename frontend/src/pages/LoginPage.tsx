import {
  useState,
  type FormEvent,
} from 'react'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import './AuthPages.css'


interface LoginApiResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    name: string
    email: string
    is_active: boolean
    is_verified: boolean
    created_at: string
  }
}


function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [showPassword, setShowPassword] =
    useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] =
    useState('')
  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const isVerified =
    searchParams.get('verified') === 'true'

  const isRegistered =
    searchParams.get('registered') === 'true'

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      )

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(
          responseData.detail ??
            'Не вдалося виконати вхід',
        )
      }

      const loginData =
        responseData as LoginApiResponse

      localStorage.setItem(
        'accessToken',
        loginData.access_token,
      )

      localStorage.setItem(
        'currentUser',
        JSON.stringify(loginData.user),
      )

      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage(
          'Сталася невідома помилка',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div
        className={
          'auth-background auth-background-one'
        }
      />

      <div
        className={
          'auth-background auth-background-two'
        }
      />

      <Link className="auth-back" to="/">
        <ArrowLeft size={20} />
        На головну
      </Link>

      <section className="auth-card">
        <Link className="auth-logo" to="/">
          <span className="auth-logo-symbol">
            M
          </span>

          <span>
            <strong>MOVA</strong>
            <small>ЩОДЕННИК ЕМОЦІЙ</small>
          </span>
        </Link>

        <div className="auth-heading">
          <p>Раді бачити знову</p>

          <h1>Увійдіть у свій профіль</h1>

          <span>
            Продовжуйте вести щоденник і
            спостерігати за змінами емоційного
            стану.
          </span>
        </div>

        {isVerified && (
          <p className="auth-success">
            Електронну пошту підтверджено.
            Тепер ви можете увійти.
          </p>
        )}

        {isRegistered && !isVerified && (
          <p className="auth-success">
            Профіль створено. Перевірте пошту
            та підтвердьте реєстрацію.
          </p>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label>
            Електронна пошта

            <span className="auth-input">
              <Mail size={20} />

              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </span>
          </label>

          <label>
            Пароль

            <span className="auth-input">
              <LockKeyhole size={20} />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                name="password"
                placeholder="Введіть пароль"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                minLength={8}
                required
              />

              <button
                className="password-toggle"
                type="button"
                aria-label={
                  showPassword
                    ? 'Приховати пароль'
                    : 'Показати пароль'
                }
                onClick={() =>
                  setShowPassword(
                    !showPassword,
                  )
                }
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </span>
          </label>

          {errorMessage && (
            <p className="auth-error">
              {errorMessage}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Виконується вхід...'
              : 'Увійти'}
          </button>
        </form>

        <p className="auth-switch">
          Ще не маєте профілю?
          <Link to="/register">
            Зареєструватися
          </Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage