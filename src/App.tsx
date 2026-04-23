import { ScrollContainer } from '@/components/layout/ScrollContainer'
import { HeroSection } from '@/components/sections/HeroSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { SkillsSection } from '@/components/sections/SkillsSection'
import { ProjectsSection } from '@/components/sections/ProjectsSection'
import { ContactSection } from '@/components/sections/ContactSection'
import { GlobalCanvas } from '@/components/three/GlobalCanvas'

export default function App() {
  return (
    <>
      <GlobalCanvas />
      <ScrollContainer>
        {/* Synthetic Scroll Track: defines total scroll duration */}
        <div id="global-scroll-track" style={{ height: '2000vh' }} />

        {/* Master Visual Container: fixed on screen, sections overlap */}
        <main 
          id="main-content" 
          className="fixed inset-0 z-10 w-full h-full text-white pointer-events-none"
        >
          <HeroSection />
          <AboutSection />
          <SkillsSection />
          <ProjectsSection />
          <ContactSection />
        </main>
      </ScrollContainer>
    </>
  )
}
