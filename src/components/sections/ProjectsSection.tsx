export function ProjectsSection() {
  return (
    <section
      id="projects"
      aria-label="Projects"
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
        Projects
      </h2>
    </section>
  )
}
