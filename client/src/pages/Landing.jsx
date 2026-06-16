import { Link } from 'react-router-dom'

const Landing = () => {
  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>Fair Fund</h1>
        <div style={styles.navLinks}>
          <Link to="/login" style={styles.loginBtn}>Login</Link>
          <Link to="/register" style={styles.registerBtn}>Get Started</Link>
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <span style={styles.badge}>Built for Kenyans</span>
          <h2 style={styles.heroTitle}>Fair Loans.<br />Real Credit.<br />Your M-Pesa.</h2>
          <p style={styles.heroSubtitle}>
            Access credit based on your real financial profile.
            Transparent scoring. No hidden fees. Funds straight to your phone.
          </p>
          <div style={styles.heroBtns}>
            <Link to="/register" style={styles.primaryBtn}>Apply Now</Link>
            <Link to="/login" style={styles.secondaryBtn}>Sign In</Link>
          </div>
        </div>
        <div style={styles.heroStats}>
          <div style={styles.stat}>
            <span style={styles.statNumber}>5%</span>
            <span style={styles.statLabel}>Evaluation Fee</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <span style={styles.statNumber}>100</span>
            <span style={styles.statLabel}>Max Credit Score</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <span style={styles.statNumber}>24hr</span>
            <span style={styles.statLabel}>Review Time</span>
          </div>
        </div>
      </section>

      <section style={styles.howItWorks}>
        <h3 style={styles.sectionTitle}>How It Works</h3>
        <p style={styles.sectionSubtitle}>Five steps to access fair credit</p>
        <div style={styles.steps}>
          {[
            { num: '01', title: 'Create Account', desc: 'Sign up with your details and national ID' },
            { num: '02', title: 'Apply for a Loan', desc: 'Tell us how much you need and why' },
            { num: '03', title: 'Get Scored', desc: 'Our algorithm evaluates your application instantly' },
            { num: '04', title: 'Pay via M-Pesa', desc: 'Small 5% evaluation fee processed securely' },
            { num: '05', title: 'Receive Funds', desc: 'Approved loans disbursed directly to M-Pesa' },
          ].map((step) => (
            <div key={step.num} style={styles.step}>
              <span style={styles.stepNumber}>{step.num}</span>
              <h4 style={styles.stepTitle}>{step.title}</h4>
              <p style={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.whyUs}>
        <h3 style={styles.sectionTitle}>Why Fair Fund?</h3>
        <p style={styles.sectionSubtitle}>We built what the market was missing</p>
        <div style={styles.cards}>
          {[
            { title: 'Transparent Scoring', desc: 'See exactly how your credit score was calculated. Employment, income stability, repayment history — all visible to you.' },
            { title: 'Fair Fees', desc: '5% evaluation fee that scales with your loan. Someone borrowing KES 2,000 pays less than someone borrowing KES 200,000.' },
            { title: 'M-Pesa Native', desc: 'Everything runs on M-Pesa. Pay your evaluation fee and receive approved funds directly to your phone.' },
            { title: 'No Predatory Rates', desc: 'Fair Fund is built on transparency. No surprise charges, no exploitative interest rates buried in fine print.' },
          ].map((card) => (
            <div key={card.title} style={styles.card}>
              <div style={styles.cardAccent} />
              <h4 style={styles.cardTitle}>{card.title}</h4>
              <p style={styles.cardDesc}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.cta}>
        <h3 style={styles.ctaTitle}>Ready to apply?</h3>
        <p style={styles.ctaSubtitle}>Join thousands of Kenyans accessing fair credit today</p>
        <Link to="/register" style={styles.ctaBtn}>Get Started</Link>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <h4 style={styles.footerLogo}>Fair Fund</h4>
          <p style={styles.footerTagline}>Fair credit for every Kenyan</p>
        </div>
        <p style={styles.footerCopy}>© 2026 Fair Fund. All rights reserved.</p>
      </footer>
    </div>
  )
}

const NAVY = '#0a1628'
const NAVY_LIGHT = '#112240'
const GOLD = '#c9a84c'
const GOLD_LIGHT = '#f0c96a'
const WHITE = '#ffffff'
const GRAY = '#8892b0'

const styles = {
  container: { fontFamily: 'Inter, sans-serif', color: WHITE, backgroundColor: NAVY },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', borderBottom: `1px solid ${NAVY_LIGHT}` },
  logo: { fontSize: '1.5rem', fontWeight: '800', color: GOLD, margin: 0, letterSpacing: '0.05em' },
  navLinks: { display: 'flex', gap: '1rem', alignItems: 'center' },
  loginBtn: { textDecoration: 'none', color: GOLD, fontWeight: '600' },
  registerBtn: { textDecoration: 'none', backgroundColor: GOLD, color: NAVY, padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: '700' },
  badge: { backgroundColor: NAVY_LIGHT, color: GOLD, padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', border: `1px solid ${GOLD}` },
  heroTitle: { fontSize: '3.5rem', fontWeight: '800', lineHeight: '1.15', margin: '1.5rem 0', color: WHITE },
  hero: { padding: '6rem 4rem', backgroundColor: NAVY, borderBottom: `1px solid ${NAVY_LIGHT}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },  heroContent: { maxWidth: '700px', marginBottom: '4rem', textAlign: 'center' },
  heroSubtitle: { fontSize: '1.1rem', color: GRAY, maxWidth: '500px', lineHeight: '1.7', margin: '0 auto' },
  heroBtns: { display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'center' },
  heroStats: { display: 'flex', gap: '3rem', alignItems: 'center', marginTop: '3rem', justifyContent: 'center' },
  primaryBtn: { textDecoration: 'none', backgroundColor: GOLD, color: NAVY, padding: '0.9rem 2rem', borderRadius: '8px', fontWeight: '700', fontSize: '1rem' },
  secondaryBtn: { textDecoration: 'none', border: `2px solid ${GOLD}`, color: GOLD, padding: '0.9rem 2rem', borderRadius: '8px', fontWeight: '700', fontSize: '1rem' },
  stat: { display: 'flex', flexDirection: 'column' },
  statNumber: { fontSize: '2rem', fontWeight: '800', color: GOLD },
  statLabel: { fontSize: '0.85rem', color: GRAY },
  statDivider: { width: '1px', height: '40px', backgroundColor: NAVY_LIGHT },
  howItWorks: { padding: '5rem 4rem', backgroundColor: NAVY_LIGHT },
  sectionTitle: { textAlign: 'center', fontSize: '2rem', fontWeight: '800', color: WHITE, marginBottom: '0.5rem' },
  sectionSubtitle: { textAlign: 'center', color: GRAY, marginBottom: '3rem' },
  steps: { display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' },
  step: { flex: '1', minWidth: '150px', textAlign: 'center', padding: '1.5rem' },
  stepNumber: { fontSize: '2.5rem', fontWeight: '800', color: GOLD },
  stepTitle: { color: WHITE, marginBottom: '0.5rem' },
  stepDesc: { color: GRAY, fontSize: '0.9rem' },
  whyUs: { padding: '5rem 4rem', backgroundColor: NAVY },
  cards: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' },
  card: { flex: '1', minWidth: '220px', backgroundColor: NAVY_LIGHT, padding: '2rem', borderRadius: '12px', border: `1px solid #1e3a5f` },
  cardAccent: { width: '40px', height: '4px', backgroundColor: GOLD, borderRadius: '2px', marginBottom: '1.2rem' },
  cardTitle: { color: WHITE, marginBottom: '0.8rem', fontSize: '1.1rem' },
  cardDesc: { color: GRAY, fontSize: '0.95rem', lineHeight: '1.6' },
  cta: { padding: '5rem 4rem', backgroundColor: GOLD, textAlign: 'center' },
  ctaTitle: { fontSize: '2.5rem', fontWeight: '800', color: NAVY, marginBottom: '1rem' },
  ctaSubtitle: { color: NAVY, opacity: 0.8, marginBottom: '2rem' },
  ctaBtn: { textDecoration: 'none', backgroundColor: NAVY, color: GOLD, padding: '1rem 2.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '1.1rem' },
  footer: { backgroundColor: NAVY_LIGHT, padding: '3rem 4rem', borderTop: `1px solid #1e3a5f` },
  footerContent: { marginBottom: '1rem' },
  footerLogo: { color: GOLD, fontSize: '1.2rem', margin: '0 0 0.3rem' },
  footerTagline: { color: GRAY, fontSize: '0.9rem', margin: 0 },
  footerCopy: { color: GRAY, fontSize: '0.85rem', margin: 0 },
}

export default Landing