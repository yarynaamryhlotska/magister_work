import {
  ArrowRight,
  Camera,
  FileText,
  Mic,
  Moon,
  Sparkles,
} from 'lucide-react'

import '../App.css'

function HomePage() {
  return (
    <main className="app">
      <header className="header">
        <a className="logo" href="/">
          <span className="logo-mark">M</span>
          <span>
            <strong>MOVA</strong>
            <small>щоденник емоцій</small>
          </span>
        </a>

        <nav className="navigation">
          <a href="/about">Про систему</a>

          <button
            className="icon-button"
            type="button"
            aria-label="Змінити тему"
          >
            <Moon size={19} />
          </button>

          <button className="language-button" type="button">
            UA
          </button>

          <a className="login-link" href="/login">
            Увійти
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <Sparkles size={16} />
            Мультимодальний цифровий щоденник
          </div>

          <h1>
            Зрозумій свої емоції.
            <span>Почуй себе.</span>
          </h1>

          <p>
            Записуй думки текстом, голосом або фотографією.
            MOVA допоможе визначити емоційний стан, побачити
            його зміни та сформувати персональну рекомендацію.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="/register">
              Розпочати
              <ArrowRight size={19} />
            </a>

            <a className="secondary-button" href="/about">
              Дізнатися більше
            </a>
          </div>
        </div>

        <div className="emotion-card">
          <div className="card-top">
            <span>Сьогоднішній стан</span>
            <span className="status">Проаналізовано</span>
          </div>

          <div className="emotion-result">
            <div className="emotion-icon">😊</div>
            <div>
              <small>Основна емоція</small>
              <h2>Радість</h2>
              <p>Впевненість аналізу — 86%</p>
            </div>
          </div>

          <div className="emotion-scale">
            <div>
              <span>Радість</span>
              <strong>86%</strong>
            </div>
            <div className="scale">
              <span style={{ width: '86%' }} />
            </div>
          </div>

          <p className="recommendation">
            Збережи цей момент. Сьогодні гарний день для
            приємних справ, позитивних емоцій та турботи
            про себе.
          </p>
        </div>
      </section>

      <section className="features" id="possibilities">
        <article>
          <div className="feature-icon">
            <FileText size={25} />
          </div>
          <h3>Текст</h3>
          <p>Опиши події дня та власні думки у зручній формі.</p>
        </article>

        <article>
          <div className="feature-icon">
            <Mic size={25} />
          </div>
          <h3>Голос</h3>
          <p>Запиши голосове повідомлення, щоб передати інтонацію.</p>
        </article>

        <article>
          <div className="feature-icon">
            <Camera size={25} />
          </div>
          <h3>Фото</h3>
          <p>Додай фотографію для аналізу виразу обличчя.</p>
        </article>
      </section>
    </main>
  )
}

export default HomePage
