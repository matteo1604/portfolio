export type SectionId = 'hero' | 'about' | 'skills' | 'projects' | 'contact'

export interface ProjectData {
  id: string
  title: string
  description: string
  tags: string[]
  href?: string
}
