export interface ScrollState {
  progress: number
  velocity: number
  direction: 1 | -1 | 0
}

export type SectionId = 'hero' | 'about' | 'skills' | 'projects' | 'contact'

export interface ProjectData {
  id: string
  title: string
  description: string
  tags: string[]
  href?: string
}
