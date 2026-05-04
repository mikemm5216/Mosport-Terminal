'use client'

import type { Match } from '../data/mockData'
import HomeSchedulePage from './HomeSchedulePage'

interface Props {
  onOpen: (m: Match) => void
  onOpenLab?: () => void
}

export default function LiveScheduleDashboard({ onOpen, onOpenLab }: Props) {
  return <HomeSchedulePage onOpen={onOpen} onOpenLab={onOpenLab} />
}
