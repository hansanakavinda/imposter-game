export const CARD_COLORS = {
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green',
  YELLOW: 'yellow',
  WILD: 'wild',
}

export const CARD_TYPES = {
  NUMBER: 'number',
  SKIP: 'skip',
  REVERSE: 'reverse',
  DRAW_TWO: 'draw2',
  WILD: 'wild',
  WILD_DRAW_FOUR: 'wild4',
}

export const COLOR_CONFIG = {
  [CARD_COLORS.RED]: {
    name: 'Red',
    bg: 'bg-red-600',
    border: 'border-red-500',
    ring: 'ring-red-500',
    text: 'text-red-500',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    gradient: 'from-red-600 to-rose-700',
    hex: '#ef4444',
  },
  [CARD_COLORS.BLUE]: {
    name: 'Blue',
    bg: 'bg-blue-600',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
    text: 'text-blue-500',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    gradient: 'from-blue-600 to-indigo-700',
    hex: '#3b82f6',
  },
  [CARD_COLORS.GREEN]: {
    name: 'Green',
    bg: 'bg-emerald-600',
    border: 'border-emerald-500',
    ring: 'ring-emerald-500',
    text: 'text-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    gradient: 'from-emerald-600 to-teal-700',
    hex: '#10b981',
  },
  [CARD_COLORS.YELLOW]: {
    name: 'Yellow',
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    ring: 'ring-amber-400',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    gradient: 'from-amber-400 to-yellow-600',
    hex: '#f59e0b',
  },
  [CARD_COLORS.WILD]: {
    name: 'Wild',
    bg: 'bg-felt',
    border: 'border-edge-lit',
    ring: 'ring-purple-500',
    text: 'text-ink',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    gradient: 'from-felt via-purple-900/50 to-felt',
    hex: '#8b5cf6',
  },
}

export const PLAYABLE_COLORS = [
  CARD_COLORS.RED,
  CARD_COLORS.BLUE,
  CARD_COLORS.GREEN,
  CARD_COLORS.YELLOW,
]

export function getRankBadge(rank) {
  switch (rank) {
    case 1:
      return {
        label: '1st Place',
        shortLabel: '1st',
        medal: '🥇',
        title: 'Winner',
        text: 'text-amber-300',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        ring: 'ring-amber-400',
      }
    case 2:
      return {
        label: '2nd Place',
        shortLabel: '2nd',
        medal: '🥈',
        title: 'Runner-up',
        text: 'text-slate-200',
        badge: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
        ring: 'ring-slate-300',
      }
    case 3:
      return {
        label: '3rd Place',
        shortLabel: '3rd',
        medal: '🥉',
        title: '3rd Place',
        text: 'text-amber-500',
        badge: 'bg-amber-700/20 text-amber-400 border-amber-600/40',
        ring: 'ring-amber-600',
      }
    default:
      return {
        label: `${rank}th Place`,
        shortLabel: `${rank}th`,
        medal: '🏅',
        title: `${rank}th Place`,
        text: 'text-ink-muted',
        badge: 'bg-felt-high text-ink border-edge-lit',
        ring: 'ring-edge-lit',
      }
  }
}

