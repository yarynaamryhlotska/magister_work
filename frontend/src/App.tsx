import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import DashboardPage from './pages/DashboardPage'
import DayDetailsPage from './pages/DayDetailsPage'
import EntryDetailsPage from './pages/EntryDetailsPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import PhotoEntryPage from './pages/PhotoEntryPage'
import RegisterPage from './pages/RegisterPage'
import SettingsPage from './pages/SettingsPage'
import StatisticsPage from './pages/StatisticsPage'
import TextEntryPage from './pages/TextEntryPage'
import VoiceEntryPage from './pages/VoiceEntryPage'
import AboutPage from './pages/AboutPage'

function hasActiveSession() {
  return Boolean(
    localStorage.getItem('accessToken'),
  )
}


function PublicHomeRoute() {
  if (hasActiveSession()) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    )
  }

  return <HomePage />
}


function ProtectedDashboardRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <DashboardPage />
}


function ProtectedTextRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <TextEntryPage />
}


function ProtectedVoiceRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <VoiceEntryPage />
}


function ProtectedPhotoRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <PhotoEntryPage />
}


function ProtectedHistoryRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <HistoryPage />
}


function ProtectedEntryDetailsRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <EntryDetailsPage />
}


function ProtectedDayDetailsRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <DayDetailsPage />
}


function ProtectedSettingsRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <SettingsPage />
}


function ProtectedStatisticsRoute() {
  if (!hasActiveSession()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <StatisticsPage />
}


function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<PublicHomeRoute />}
        />
      <Route
        path="/about"
        element={<AboutPage />}
        />
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

        <Route
          path="/dashboard"
          element={<ProtectedDashboardRoute />}
        />

        <Route
          path="/dashboard/text"
          element={<ProtectedTextRoute />}
        />

        <Route
          path="/dashboard/voice"
          element={<ProtectedVoiceRoute />}
        />

        <Route
          path="/dashboard/photo"
          element={<ProtectedPhotoRoute />}
        />

        <Route
          path="/dashboard/history"
          element={<ProtectedHistoryRoute />}
        />

        <Route
          path="/dashboard/history/:entryId"
          element={<ProtectedEntryDetailsRoute />}
        />

        <Route
          path="/dashboard/day/:summaryDate"
          element={<ProtectedDayDetailsRoute />}
        />

        <Route
          path="/dashboard/settings"
          element={<ProtectedSettingsRoute />}
        />

        <Route
          path="/dashboard/statistics"
          element={<ProtectedStatisticsRoute />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  )
}


export default App