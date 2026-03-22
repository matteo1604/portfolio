export function AboutSection() {
  return (
    <section
      id="about"
      aria-label="About"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid var(--border-subtle)',
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
        About
      </h2>
    </section>
  )
}
