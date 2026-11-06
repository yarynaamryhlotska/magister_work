import {
  LogOut,
  Moon,
  Settings,
  Sun,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import '../pages/DashboardPage.css'

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

function getInitialTheme(): Theme {
  const savedTheme =
    localStorage.getItem('theme')

  if (savedTheme === 'dark') {
    return 'dark'
  }

  return 'light'
}

function DashboardHeader() {
  const navigate = useNavigate()

  const currentUser =
    getCurrentUser()

  const [theme, setTheme] =
    useState<Theme>(
      getInitialTheme,
    )

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

  const handleThemeToggle = () => {
    setTheme(
      (currentTheme) =>
        currentTheme === 'light'
          ? 'dark'
          : 'light',
    )
  }

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

  const handleHistoryClick = () => {
    navigate(
      '/dashboard/history',
    )
  }

  const handleNewEntryClick = () => {
    navigate(
      '/dashboard#new-entry',
    )
  }

  const handleStatisticsClick = () => {
  navigate('/dashboard/statistics')
}

  return (
    <header className="dashboard-header">

      {/* ================= LOGO ================= */}

      <button
        className="dashboard-logo"
        type="button"
        onClick={() =>
          navigate('/dashboard')
        }
      >
        <span className="dashboard-logo-mark">
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


      {/* ================= NAVIGATION ================= */}

      <nav className="dashboard-navigation">

        <button
          type="button"
          onClick={
            handleNewEntryClick
          }
        >
          Новий запис
        </button>

        <button
          type="button"
          onClick={
            handleHistoryClick
          }
        >
          Історія
        </button>

        <button
          type="button"
          onClick={
            handleStatisticsClick
          }
        >
          Статистика
        </button>

      </nav>


      {/* ================= RIGHT SIDE ================= */}

      <div className="dashboard-user-actions">

        {/* THEME */}

        <button
          className="dashboard-icon-button"
          type="button"
          aria-label={
            theme === 'light'
              ? 'Увімкнути темну тему'
              : 'Увімкнути світлу тему'
          }
          title={
            theme === 'light'
              ? 'Темна тема'
              : 'Світла тема'
          }
          onClick={
            handleThemeToggle
          }
        >
          {theme === 'light' ? (
            <Moon size={18} />
          ) : (
            <Sun size={18} />
          )}
        </button>


        {/* SETTINGS */}

        <button
  className="dashboard-icon-button"
  type="button"
  aria-label="Налаштування"
  onClick={() =>
    navigate('/dashboard/settings')
  }
>
  <Settings size={18} />
</button>


        {/* USER */}

        <div className="dashboard-user">

          <span className="dashboard-avatar">
            {currentUser?.name
              ?.charAt(0)
              .toUpperCase() ??
              'К'}
          </span>

          <span>

            <strong>
              {currentUser?.name ??
                'Користувач'}
            </strong>

            <small>
              {currentUser?.email}
            </small>

          </span>

        </div>


        {/* LOGOUT */}

        <button
          className="dashboard-logout"
          type="button"
          onClick={
            handleLogout
          }
        >
          <LogOut size={18} />

          Вийти
        </button>

      </div>

    </header>
  )
}

export default DashboardHeader