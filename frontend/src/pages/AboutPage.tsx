import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Camera, BarChart3, FileText, Heart, Mic, ShieldCheck, Sparkles } from 'lucide-react'
import './AboutPage.css'

const features = [
  { icon: FileText, title: 'Записи текстом', description: 'Опиши свій день, думки та переживання. MOVA допоможе побачити емоційний відтінок запису.' },
  { icon: Mic, title: 'Голосові записи', description: 'Розповідай про свої почуття вголос, коли писати не хочеться.' },
  { icon: Camera, title: 'Аналіз фотографії', description: 'Додавай фотографію, щоб дослідити емоції за виразом обличчя.' },
  { icon: CalendarDays, title: 'Календар емоцій', description: 'Повертайся до минулих днів і помічай, як змінюється твій настрій.' },
  { icon: BookOpen, title: 'Історія записів', description: 'Зберігай важливі моменти й переглядай свої записи в одному місці.' },
  { icon: BarChart3, title: 'Статистика та динаміка', description: 'Спостерігай за тенденціями емоційного стану завдяки наочним графікам.' },
]

function AboutPage() {
  return (
    <main className="about-page">
      <header className="about-header">
        <a href="/" className="about-brand" aria-label="MOVA — головна">
          <span className="about-brand-mark">M</span>
          <span><strong>MOVA</strong><small>щоденник емоцій</small></span>
        </a>
        <nav className="about-nav" aria-label="Навігація">
          <a href="/">Головна</a>
          <a href="/login" className="about-login">Увійти</a>
        </nav>
      </header>

      <section className="about-hero">
        <div className="about-pill"><Sparkles size={16} /> Знайомство з MOVA</div>
        <h1>Твої емоції заслуговують <span>на увагу.</span></h1>
        <p>MOVA — цифровий щоденник, який допомагає зупинитися на мить, прислухатися до себе та краще розуміти власний емоційний стан. Записуй те, що відчуваєш, повертайся до важливих моментів і помічай зміни з часом.</p>
        <div className="about-actions">
          <a className="about-primary" href="/register">Почати користуватися <ArrowRight size={18} /></a>
          <a className="about-secondary" href="/"><ArrowLeft size={17} /> На головну</a>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-why-title">
        <div className="about-section-heading"><span>Чому MOVA?</span><h2 id="about-why-title">Простір, де можна бути собою</h2><p>Не потрібно добирати ідеальні слова. Просто обери спосіб, який підходить саме зараз.</p></div>
        <div className="about-benefits">
          <article><div className="about-benefit-icon"><Heart size={24} /></div><h3>Увага до себе</h3><p>Навчися помічати власні переживання й давати їм назву.</p></article>
          <article><div className="about-benefit-icon"><Sparkles size={24} /></div><h3>Підказки для щодня</h3><p>Отримуй рекомендації, які допоможуть осмислити свій стан.</p></article>
          <article><div className="about-benefit-icon"><ShieldCheck size={24} /></div><h3>Особистий простір</h3><p>Зберігай свою історію в персональному кабінеті.</p></article>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-features-title">
        <div className="about-section-heading"><span>Можливості системи</span><h2 id="about-features-title">Усе для твого щоденника емоцій</h2><p>Від першого запису до розуміння довгострокових змін.</p></div>
        <div className="about-features">{features.map(({ icon: Icon, title, description }) => <article key={title} className="about-feature"><div className="about-feature-icon"><Icon size={24} /></div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="about-section about-steps" aria-labelledby="about-how-title">
        <div className="about-section-heading"><span>Як це працює</span><h2 id="about-how-title">Три кроки до кращого розуміння себе</h2></div>
        <div className="about-step-grid"><article><strong>01</strong><h3>Поділися моментом</h3><p>Створи запис текстом, голосом або за допомогою фото.</p></article><article><strong>02</strong><h3>Переглянь результат</h3><p>Дізнайся визначену емоцію та ознайомся з рекомендацією.</p></article><article><strong>03</strong><h3>Помічай зміни</h3><p>Дивись календар, історію та статистику своїх записів.</p></article></div>
      </section>

      <section className="about-cta"><Sparkles size={26} /><h2>Почни краще розуміти себе вже сьогодні</h2><p>Іноді достатньо кількох хвилин, щоб почути власні почуття.</p><a className="about-primary" href="/register">Розпочати з MOVA <ArrowRight size={18} /></a></section>
      <footer className="about-footer">MOVA · Твій простір для розуміння емоцій</footer>
    </main>
  )
}

export default AboutPage
