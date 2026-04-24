'use client'

import type { Match } from '../data/mockData'
import SchedulePage from './SchedulePage'

interface Props {
  onOpen: (m: Match) => void
  onOpenLab?: () => void
}

export default function LiveScheduleDashboard({ onOpen, onOpenLab }: Props) {
  return <SchedulePage onOpen={onOpen} onOpenLab={onOpenLab} />
}
