import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import './AuthPages.css'

function RegisterPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password !== passwordConfirmation) {
      setError('Введені паролі не збігаються')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Не вдалося створити профіль',
        )
      }

      navigate('/login?registered=true')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не вдалося з’єднатися із сервером',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background auth-background-one" />
      <div className="auth-background auth-background-two" />

      <Link className="auth-back" to="/">
        <ArrowLeft size={20} />
        На головну
      </Link>

      <section className="auth-card auth-card-register">
        <Link className="auth-logo" to="/">
          <span className="auth-logo-symbol">M</span>

          <span>
            <strong>MOVA</strong>
            <small>ЩОДЕННИК ЕМОЦІЙ</small>
          </span>
        </Link>

        <div className="auth-heading">
          <p>Створення профілю</p>
          <h1>Почніть розуміти свої емоції</h1>
          <span>
            Створіть особистий простір для записів і спостереження за
            емоційним станом.
          </span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Ім’я

            <span className="auth-input">
              <UserRound size={20} />
              <input
                type="text"
                placeholder="Ваше ім’я"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </span>
          </label>

          <label>
            Електронна пошта

            <span className="auth-input">
              <Mail size={20} />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </span>
          </label>

          <label>
            Пароль

            <span className="auth-input">
              <LockKeyhole size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Щонайменше 8 символів"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </label>

          <label>
            Повторіть пароль

            <span className="auth-input">
              <LockKeyhole size={20} />
              <input
                type={showConfirmation ? 'text' : 'password'}
                placeholder="Повторіть пароль"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                minLength={8}
                maxLength={128}
                required
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowConfirmation(!showConfirmation)}
              >
                {showConfirmation ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button
            className="auth-submit"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Створення профілю...' : 'Створити профіль'}
          </button>
        </form>

        <p className="auth-switch">
          Уже маєте профіль?
          <Link to="/login">Увійти</Link>
        </p>
      </section>
    </main>
  )
}

export default RegisterPage