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
        <main id="main-content" className="relative z-10 w-full overflow-hidden text-white bg-transparent">
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
