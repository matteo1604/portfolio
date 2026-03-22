export function ContactSection() {
  return (
    <section
      id="contact"
      aria-label="Contact"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-5xl)',
          color: 'var(--text-secondary)',
          letterSpacing: '-0.02em',
        }}
      >
        Contact
      </h2>
    </section>
  )
}
