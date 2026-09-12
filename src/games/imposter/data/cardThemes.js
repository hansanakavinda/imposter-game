// Modern, clean, minimalist color themes for player cards.
// Imposters receive a random theme from the exact same pool.

export const CARD_THEMES = [
  {
    id: 'indigo',
    name: 'Indigo',
    cardBg: 'bg-zinc-900 border-indigo-500/40 shadow-indigo-950/50',
    headerBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    dot: 'bg-indigo-500',
    text: 'text-indigo-400',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    cardBg: 'bg-zinc-900 border-emerald-500/40 shadow-emerald-950/50',
    headerBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
  },
  {
    id: 'rose',
    name: 'Rose',
    cardBg: 'bg-zinc-900 border-rose-500/40 shadow-rose-950/50',
    headerBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
    text: 'text-rose-400',
  },
  {
    id: 'amber',
    name: 'Amber',
    cardBg: 'bg-zinc-900 border-amber-500/40 shadow-amber-950/50',
    headerBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
    text: 'text-amber-400',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    cardBg: 'bg-zinc-900 border-cyan-500/40 shadow-cyan-950/50',
    headerBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    dot: 'bg-cyan-500',
    text: 'text-cyan-400',
  },
  {
    id: 'purple',
    name: 'Purple',
    cardBg: 'bg-zinc-900 border-purple-500/40 shadow-purple-950/50',
    headerBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    dot: 'bg-purple-500',
    text: 'text-purple-400',
  },
  {
    id: 'teal',
    name: 'Teal',
    cardBg: 'bg-zinc-900 border-teal-500/40 shadow-teal-950/50',
    headerBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    dot: 'bg-teal-500',
    text: 'text-teal-400',
  },
  {
    id: 'orange',
    name: 'Orange',
    cardBg: 'bg-zinc-900 border-orange-500/40 shadow-orange-950/50',
    headerBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    dot: 'bg-orange-500',
    text: 'text-orange-400',
  },
  {
    id: 'sky',
    name: 'Sky',
    cardBg: 'bg-zinc-900 border-sky-500/40 shadow-sky-950/50',
    headerBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    dot: 'bg-sky-500',
    text: 'text-sky-400',
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    cardBg: 'bg-zinc-900 border-fuchsia-500/40 shadow-fuchsia-950/50',
    headerBg: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    dot: 'bg-fuchsia-500',
    text: 'text-fuchsia-400',
  },
  {
    id: 'lime',
    name: 'Lime',
    cardBg: 'bg-zinc-900 border-lime-500/40 shadow-lime-950/50',
    headerBg: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
    dot: 'bg-lime-500',
    text: 'text-lime-400',
  },
  {
    id: 'blue',
    name: 'Blue',
    cardBg: 'bg-zinc-900 border-blue-500/40 shadow-blue-950/50',
    headerBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
    text: 'text-blue-400',
  },
  {
    id: 'pink',
    name: 'Pink',
    cardBg: 'bg-zinc-900 border-pink-500/40 shadow-pink-950/50',
    headerBg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    dot: 'bg-pink-500',
    text: 'text-pink-400',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    cardBg: 'bg-zinc-900 border-yellow-500/40 shadow-yellow-950/50',
    headerBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    dot: 'bg-yellow-500',
    text: 'text-yellow-400',
  },
  {
    id: 'violet',
    name: 'Violet',
    cardBg: 'bg-zinc-900 border-violet-500/40 shadow-violet-950/50',
    headerBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    dot: 'bg-violet-500',
    text: 'text-violet-400',
  },
  {
    id: 'red',
    name: 'Red',
    cardBg: 'bg-zinc-900 border-red-500/40 shadow-red-950/50',
    headerBg: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-500',
    text: 'text-red-400',
  },
]

export function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function assignPlayerThemes(playerCount) {
  const shuffled = shuffleArray(CARD_THEMES)
  return Array.from({ length: playerCount }, (_, i) => shuffled[i % shuffled.length])
}
