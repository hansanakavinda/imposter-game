import { TERRAIN_TYPES, ARENA_WIDTH, ARENA_HEIGHT } from '../constants/tankConstants'

/**
 * Battlefield Map Definitions
 * Symmetrical tactical layouts ensuring fair competition for 1v1 and 2v2.
 */

export const MAP_PRESETS = [
  {
    id: 'crossfire-plaza',
    name: 'Crossfire Plaza',
    description: 'Central open plaza flanked by steel bunkers and stealth brush lanes',
    createTerrain: () => {
      const obstacles = []
      let idCounter = 1

      // 1. Central Steel Bunkers (Reflects shells for trickshots)
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 380, y: 200, width: 30, height: 110 })
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 590, y: 340, width: 30, height: 110 })

      // 2. Corner Hard Bunkers
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 200, y: 70, width: 70, height: 30 })
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 730, y: 550, width: 70, height: 30 })

      // 3. Destructible Brick Barricades (Provide temporary cover)
      obstacles.push({ id: `brick_${idCounter++}`, type: TERRAIN_TYPES.BRICK, x: 260, y: 240, width: 26, height: 80, hp: 2, maxHp: 2 })
      obstacles.push({ id: `brick_${idCounter++}`, type: TERRAIN_TYPES.BRICK, x: 714, y: 330, width: 26, height: 80, hp: 2, maxHp: 2 })
      obstacles.push({ id: `brick_${idCounter++}`, type: TERRAIN_TYPES.BRICK, x: 470, y: 130, width: 60, height: 26, hp: 2, maxHp: 2 })
      obstacles.push({ id: `brick_${idCounter++}`, type: TERRAIN_TYPES.BRICK, x: 470, y: 494, width: 60, height: 26, hp: 2, maxHp: 2 })

      // 4. Tall Grass Bushes (Stealth hiding spots)
      obstacles.push({ id: `bush_${idCounter++}`, type: TERRAIN_TYPES.BUSH, x: 180, y: 400, width: 110, height: 90 })
      obstacles.push({ id: `bush_${idCounter++}`, type: TERRAIN_TYPES.BUSH, x: 710, y: 160, width: 110, height: 90 })
      obstacles.push({ id: `bush_${idCounter++}`, type: TERRAIN_TYPES.BUSH, x: 445, y: 275, width: 110, height: 100 })

      // 5. Water Ponds (Bullets can pass, tanks cannot)
      obstacles.push({ id: `water_${idCounter++}`, type: TERRAIN_TYPES.WATER, x: 320, y: 480, width: 110, height: 60 })
      obstacles.push({ id: `water_${idCounter++}`, type: TERRAIN_TYPES.WATER, x: 570, y: 110, width: 110, height: 60 })

      // 6. Mud Swamps (Slows down speed)
      obstacles.push({ id: `mud_${idCounter++}`, type: TERRAIN_TYPES.MUD, x: 40, y: 300, width: 80, height: 100 })
      obstacles.push({ id: `mud_${idCounter++}`, type: TERRAIN_TYPES.MUD, x: 880, y: 250, width: 80, height: 100 })

      // 7. Explosive Fuel Barrels (Chain reaction hazards)
      const barrels = [
        { id: `barrel_${idCounter++}`, type: TERRAIN_TYPES.BARREL, x: 330, y: 240, radius: 14, hp: 1 },
        { id: `barrel_${idCounter++}`, type: TERRAIN_TYPES.BARREL, x: 670, y: 410, radius: 14, hp: 1 },
        { id: `barrel_${idCounter++}`, type: TERRAIN_TYPES.BARREL, x: 500, y: 90, radius: 14, hp: 1 },
        { id: `barrel_${idCounter++}`, type: TERRAIN_TYPES.BARREL, x: 500, y: 560, radius: 14, hp: 1 },
      ]

      return { obstacles, barrels }
    },
  },
  {
    id: 'riverland-ambush',
    name: 'Riverland Ambush',
    description: 'Split river crossing with dense ambush foliage and central explosive cache',
    createTerrain: () => {
      const obstacles = []
      let idCounter = 1

      // Dividing central river with two bridge clearings
      obstacles.push({ id: `water_${idCounter++}`, type: TERRAIN_TYPES.WATER, x: 485, y: 20, width: 30, height: 180 })
      obstacles.push({ id: `water_${idCounter++}`, type: TERRAIN_TYPES.WATER, x: 485, y: 450, width: 30, height: 180 })

      // Mud banks around the water
      obstacles.push({ id: `mud_${idCounter++}`, type: TERRAIN_TYPES.MUD, x: 440, y: 40, width: 45, height: 140 })
      obstacles.push({ id: `mud_${idCounter++}`, type: TERRAIN_TYPES.MUD, x: 515, y: 470, width: 45, height: 140 })

      // Steel Fortresses protecting flanking routes
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 280, y: 150, width: 40, height: 90 })
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 680, y: 410, width: 40, height: 90 })
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 280, y: 410, width: 40, height: 90 })
      obstacles.push({ id: `steel_${idCounter++}`, type: TERRAIN_TYPES.STEEL, x: 680, y: 150, width: 40, height: 90 })

      // Brick trenches
      obstacles.push({ id: `brick_${idCounter++}`, type: TERRAIN_TYPES.BRICK, x: 420, y: 270, width: 25, height: 110, hp: 2, maxHp: 2 })
      obstacles.push({ id: `brick_${idCounter++}`, type: TERRAIN_TYPES.BRICK, x: 555, y: 270, width: 25, height: 110, hp: 2, maxHp: 2 })

      // Large ambush brush
      obstacles.push({ id: `bush_${idCounter++}`, type: TERRAIN_TYPES.BUSH, x: 140, y: 250, width: 120, height: 150 })
      obstacles.push({ id: `bush_${idCounter++}`, type: TERRAIN_TYPES.BUSH, x: 740, y: 250, width: 120, height: 150 })

      // Explosive barrels in the middle passage
      const barrels = [
        { id: `barrel_${idCounter++}`, type: TERRAIN_TYPES.BARREL, x: 460, y: 325, radius: 14, hp: 1 },
        { id: `barrel_${idCounter++}`, type: TERRAIN_TYPES.BARREL, x: 540, y: 325, radius: 14, hp: 1 },
      ]

      return { obstacles, barrels }
    },
  },
]

/**
 * Generate spawn positions based on mode
 */
export function getSpawnPoints(mode = '1v1') {
  if (mode === '1v1') {
    return {
      p1: { x: 90, y: ARENA_HEIGHT / 2, angle: 0, team: 'blue' },
      p2: { x: ARENA_WIDTH - 90, y: ARENA_HEIGHT / 2, angle: Math.PI, team: 'red' },
    }
  }

  // 2v2 Team Spawns
  return {
    p1: { x: 90, y: 180, angle: 0, team: 'blue' },
    p2: { x: 90, y: ARENA_HEIGHT - 180, angle: 0, team: 'blue' },
    p3: { x: ARENA_WIDTH - 90, y: 180, angle: Math.PI, team: 'red' },
    p4: { x: ARENA_WIDTH - 90, y: ARENA_HEIGHT - 180, angle: Math.PI, team: 'red' },
  }
}

/**
 * Get random battlefield map
 */
export function getBattlefieldMap(mapIndex = 0) {
  const preset = MAP_PRESETS[mapIndex % MAP_PRESETS.length]
  const { obstacles, barrels } = preset.createTerrain()
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    obstacles,
    barrels,
  }
}
