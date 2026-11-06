import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Save,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react'

import DashboardHeader from '../components/DashboardHeader'

import './SettingsPage.css'


interface CurrentUser {
  id: number
  name: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

type Theme = 'light' | 'dark'


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


function SettingsPage() {
  const currentUser = getCurrentUser()

  /* =========================================
     PROFILE
     ========================================= */

  const [name, setName] = useState(
    currentUser?.name ?? '',
  )

  const [email] = useState(
    currentUser?.email ?? '',
  )

  const [about, setAbout] =
    useState('')

  const [
    profileMessage,
    setProfileMessage,
  ] = useState('')


  /* =========================================
     PASSWORD
     ========================================= */

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('')

  const [
    newPassword,
    setNewPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false)

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false)

  const [
    passwordError,
    setPasswordError,
  ] = useState('')

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState('')

  const [
    isChangingPassword,
    setIsChangingPassword,
  ] = useState(false)


  /* =========================================
     THEME
     ========================================= */

  const [theme, setTheme] =
    useState<Theme>(() => {
      const savedTheme =
        localStorage.getItem('theme')

      return savedTheme === 'dark'
        ? 'dark'
        : 'light'
    })


  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      theme,
    )

    localStorage.setItem(
      'theme',
      theme,
    )
  }, [theme])


  /* =========================================
     LOAD ABOUT
     ========================================= */

  useEffect(() => {
    const savedAbout =
      localStorage.getItem('userAbout')

    if (savedAbout) {
      setAbout(savedAbout)
    }
  }, [])


  /* =========================================
     SAVE PROFILE
     ========================================= */

  const handleProfileSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setProfileMessage('')

    if (!name.trim()) {
      setProfileMessage(
        'Вкажіть ім’я користувача.',
      )

      return
    }

    if (currentUser) {
      const updatedUser: CurrentUser = {
        ...currentUser,
        name: name.trim(),
      }

      localStorage.setItem(
        'currentUser',
        JSON.stringify(updatedUser),
      )
    }

    localStorage.setItem(
      'userAbout',
      about.trim(),
    )

    setProfileMessage(
      'Зміни успішно збережено.',
    )

    window.dispatchEvent(
      new Event('storage'),
    )
  }


  /* =========================================
     CHANGE PASSWORD
     ========================================= */

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setPasswordError('')
    setPasswordMessage('')

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordError(
        'Заповніть усі поля.',
      )

      return
    }

    if (newPassword.length < 8) {
      setPasswordError(
        'Новий пароль повинен містити щонайменше 8 символів.',
      )

      return
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        'Нові паролі не збігаються.',
      )

      return
    }

    if (
      currentPassword ===
      newPassword
    ) {
      setPasswordError(
        'Новий пароль повинен відрізнятися від поточного.',
      )

      return
    }

    const accessToken =
      localStorage.getItem(
        'accessToken',
      )

    if (!accessToken) {
      setPasswordError(
        'Сесію завершено. Увійдіть у систему повторно.',
      )

      return
    }

    try {
      setIsChangingPassword(true)

      const response = await fetch(
        'http://127.0.0.1:8000/auth/change-password',
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            current_password:
              currentPassword,

            new_password:
              newPassword,
          }),
        },
      )

      let data: {
        detail?: string
        message?: string
      } = {}

      try {
        data =
          await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Не вдалося змінити пароль.',
        )
      }

      setPasswordMessage(
        data.message ||
          'Пароль успішно змінено.',
      )

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (error) {
      if (error instanceof Error) {
        setPasswordError(
          error.message,
        )
      } else {
        setPasswordError(
          'Не вдалося змінити пароль.',
        )
      }
    } finally {
      setIsChangingPassword(false)
    }
  }


  /* =========================================
     JSX
     ========================================= */

  return (
    <main className="settings-page">
      <DashboardHeader />

      <section className="settings-container">

        {/* =====================================
            PAGE TITLE
            ===================================== */}

        <div className="settings-page-title">
          <div className="settings-title-icon">
            <Settings size={25} />
          </div>

          <div>
            <p>
              Твій профіль
            </p>

            <h1>
              Налаштування
            </h1>

            <span>
              Керуй особистими даними,
              безпекою та зовнішнім виглядом
              MOVA.
            </span>
          </div>
        </div>


        {/* =====================================
            PROFILE
            ===================================== */}

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              <UserRound size={22} />
            </div>

            <div>
              <h2>
                Особисті дані
              </h2>

              <p>
                Інформація про твій профіль
                MOVA.
              </p>
            </div>
          </div>

          <form
            className="settings-form"
            onSubmit={
              handleProfileSubmit
            }
          >
            <div className="settings-form-row">

              <label className="settings-field">
                <span>
                  Ім’я
                </span>

                <div className="settings-input">
                  <UserRound size={19} />

                  <input
                    type="text"
                    value={name}
                    placeholder="Ваше ім’я"
                    minLength={2}
                    maxLength={100}
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                    required
                  />
                </div>
              </label>


              <label className="settings-field">
                <span>
                  Електронна пошта
                </span>

                <div className="settings-input">
                  <Mail size={19} />

                  <input
                    type="email"
                    value={email}
                    readOnly
                  />
                </div>

                <small>
                  Електронну пошту змінити
                  неможливо.
                </small>
              </label>

            </div>


            <label className="settings-field">
              <span>
                Про себе
              </span>

              <textarea
                value={about}
                placeholder="Коротко розкажи про себе..."
                maxLength={500}
                onChange={(event) =>
                  setAbout(
                    event.target.value,
                  )
                }
              />

              <small className="settings-character-count">
                {about.length} / 500
              </small>
            </label>


            {profileMessage && (
              <div className="settings-success">
                <Check size={17} />

                {profileMessage}
              </div>
            )}


            <div className="settings-actions">
              <button
                className="settings-primary-button"
                type="submit"
              >
                <Save size={18} />

                Зберегти зміни
              </button>
            </div>
          </form>
        </section>


        {/* =====================================
            SECURITY
            ===================================== */}

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              <LockKeyhole size={22} />
            </div>

            <div>
              <h2>
                Безпека
              </h2>

              <p>
                Зміни пароль для входу у свій
                профіль.
              </p>
            </div>
          </div>


          <form
            className="settings-form"
            onSubmit={
              handlePasswordSubmit
            }
          >

            {/* CURRENT PASSWORD */}

            <label className="settings-field">
              <span>
                Поточний пароль
              </span>

              <div className="settings-input">
                <LockKeyhole size={19} />

                <input
                  type={
                    showCurrentPassword
                      ? 'text'
                      : 'password'
                  }
                  value={
                    currentPassword
                  }
                  placeholder="Введіть поточний пароль"
                  autoComplete="current-password"
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value,
                    )
                  }
                  required
                />

                <button
                  className="settings-password-toggle"
                  type="button"
                  aria-label={
                    showCurrentPassword
                      ? 'Приховати пароль'
                      : 'Показати пароль'
                  }
                  onClick={() =>
                    setShowCurrentPassword(
                      (value) => !value,
                    )
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>


            <div className="settings-form-row">

              {/* NEW PASSWORD */}

              <label className="settings-field">
                <span>
                  Новий пароль
                </span>

                <div className="settings-input">
                  <LockKeyhole size={19} />

                  <input
                    type={
                      showNewPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      newPassword
                    }
                    placeholder="Щонайменше 8 символів"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                    required
                  />

                  <button
                    className="settings-password-toggle"
                    type="button"
                    aria-label={
                      showNewPassword
                        ? 'Приховати пароль'
                        : 'Показати пароль'
                    }
                    onClick={() =>
                      setShowNewPassword(
                        (value) => !value,
                      )
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </label>


              {/* CONFIRM PASSWORD */}

              <label className="settings-field">
                <span>
                  Повторіть новий пароль
                </span>

                <div className="settings-input">
                  <LockKeyhole size={19} />

                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      confirmPassword
                    }
                    placeholder="Повторіть новий пароль"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    required
                  />

                  <button
                    className="settings-password-toggle"
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? 'Приховати пароль'
                        : 'Показати пароль'
                    }
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value,
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </label>

            </div>


            {/* ERROR */}

            {passwordError && (
              <p className="settings-error">
                {passwordError}
              </p>
            )}


            {/* SUCCESS */}

            {passwordMessage && (
              <div className="settings-success">
                <Check size={17} />

                {passwordMessage}
              </div>
            )}


            <div className="settings-actions">
              <button
                className="settings-primary-button"
                type="submit"
                disabled={
                  isChangingPassword
                }
              >
                <LockKeyhole size={18} />

                {isChangingPassword
                  ? 'Змінюємо пароль...'
                  : 'Змінити пароль'}
              </button>
            </div>

          </form>
        </section>


        {/* =====================================
            APPEARANCE
            ===================================== */}

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              {theme === 'dark' ? (
                <Moon size={22} />
              ) : (
                <Sun size={22} />
              )}
            </div>

            <div>
              <h2>
                Зовнішній вигляд
              </h2>

              <p>
                Обери тему оформлення MOVA.
              </p>
            </div>
          </div>


          <div className="settings-theme-options">

            {/* LIGHT THEME */}

            <button
              className={`settings-theme-option ${
                theme === 'light'
                  ? 'settings-theme-option--active'
                  : ''
              }`}
              type="button"
              onClick={() =>
                setTheme('light')
              }
            >
              <span className="settings-theme-icon">
                <Sun size={22} />
              </span>

              <span className="settings-theme-info">
                <strong>
                  Світла тема
                </strong>

                <small>
                  Світле та ніжне оформлення
                  MOVA
                </small>
              </span>

              <span className="settings-radio">
                {theme === 'light' && (
                  <span />
                )}
              </span>
            </button>


            {/* DARK THEME */}

            <button
              className={`settings-theme-option ${
                theme === 'dark'
                  ? 'settings-theme-option--active'
                  : ''
              }`}
              type="button"
              onClick={() =>
                setTheme('dark')
              }
            >
              <span className="settings-theme-icon">
                <Moon size={22} />
              </span>

              <span className="settings-theme-info">
                <strong>
                  Темна тема
                </strong>

                <small>
                  Темне оформлення для
                  комфортного використання
                </small>
              </span>

              <span className="settings-radio">
                {theme === 'dark' && (
                  <span />
                )}
              </span>
            </button>

          </div>
        </section>

      </section>
    </main>
  )
}


export default SettingsPage