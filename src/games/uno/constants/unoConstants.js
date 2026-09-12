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

/**
 * The four card colours, plus wild.
 *
 * These are the one place saturated colour belongs to a game's own material
 * rather than its ink, so they are real tokens (--color-card-* in index.css)
 * rather than raw Tailwind palette classes. Every class here is written out in
 * full: Tailwind scans source text for complete names, so a `bg-card-${color}`
 * built at runtime is never generated.
 *
 * `hex` is what .uno-table-light burns -- it has to stay in step with the
 * token, because CSS custom properties cannot be read back as a class.
 */
export const COLOR_CONFIG = {
  [CARD_COLORS.RED]: {
    name: 'Red',
    bg: 'bg-card-red',
    border: 'border-card-red',
    ring: 'ring-card-red',
    text: 'text-card-red',
    wash: 'bg-card-red/12 border-card-red/35 text-card-red',
    hex: '#e0443f',
  },
  [CARD_COLORS.BLUE]: {
    name: 'Blue',
    bg: 'bg-card-blue',
    border: 'border-card-blue',
    ring: 'ring-card-blue',
    text: 'text-card-blue',
    wash: 'bg-card-blue/12 border-card-blue/35 text-card-blue',
    hex: '#3b7fd4',
  },
  [CARD_COLORS.GREEN]: {
    name: 'Green',
    bg: 'bg-card-green',
    border: 'border-card-green',
    ring: 'ring-card-green',
    text: 'text-card-green',
    wash: 'bg-card-green/12 border-card-green/35 text-card-green',
    hex: '#3fa96b',
  },
  [CARD_COLORS.YELLOW]: {
    name: 'Yellow',
    bg: 'bg-card-yellow',
    border: 'border-card-yellow',
    ring: 'ring-card-yellow',
    text: 'text-card-yellow',
    wash: 'bg-card-yellow/12 border-card-yellow/35 text-card-yellow',
    hex: '#f0b429',
  },
  [CARD_COLORS.WILD]: {
    name: 'Wild',
    bg: 'bg-well',
    border: 'border-edge-lit',
    ring: 'ring-lamp',
    text: 'text-ink',
    wash: 'bg-lamp/10 border-lamp/30 text-lamp',
    // A wild with no colour declared is not a colour. The light goes plain
    // lamp-white rather than guessing one.
    hex: '#ffe7be',
  },
}

export const PLAYABLE_COLORS = [
  CARD_COLORS.RED,
  CARD_COLORS.BLUE,
  CARD_COLORS.GREEN,
  CARD_COLORS.YELLOW,
]

/**
 * Placement medal and wording. The three raw-palette class keys this used to
 * carry (`text`, `badge`, `ring`) had no readers left once the turn track was
 * rebuilt, so they are a single `tone` the ui/ primitives understand.
 */
export function getRankBadge(rank) {
  switch (rank) {
    case 1:
      return { label: '1st place', shortLabel: '1st', medal: '🥇', title: 'Winner', tone: 'uno' }
    case 2:
      return { label: '2nd place', shortLabel: '2nd', medal: '🥈', title: 'Runner-up', tone: 'neutral' }
    case 3:
      return { label: '3rd place', shortLabel: '3rd', medal: '🥉', title: '3rd place', tone: 'neutral' }
    default:
      return {
        label: `${rank}th place`,
        shortLabel: `${rank}th`,
        medal: '🏅',
        title: `${rank}th place`,
        tone: 'neutral',
      }
  }
}
