// Extensive dictionary of categories, words, and tailored single-word imposter hints.
// Single-word hints give the imposter an anchor/theme without giving away the exact word!

export const CATEGORIES = [
  {
    id: 'food',
    name: 'Food & Drinks',
    icon: '🍕',
    words: [
      { word: 'Pizza', hint: 'Italian' },
      { word: 'Sushi', hint: 'Japanese' },
      { word: 'Ice Cream', hint: 'Frozen' },
      { word: 'Burger', hint: 'Patty' },
      { word: 'Coffee', hint: 'Caffeine' },
      { word: 'Pancakes', hint: 'Breakfast' },
      { word: 'Tacos', hint: 'Mexican' },
      { word: 'Chocolate', hint: 'Cocoa' },
      { word: 'Popcorn', hint: 'Cinema' },
      { word: 'Ramen', hint: 'Broth' },
      { word: 'Donut', hint: 'Glaze' },
      { word: 'Watermelon', hint: 'Melon' },
      { word: 'Spaghetti', hint: 'Pasta' },
      { word: 'Sandwich', hint: 'Bread' },
      { word: 'Lemonade', hint: 'Citrus' },
      { word: 'French Fries', hint: 'Potato' },
      { word: 'Croissant', hint: 'Pastry' },
      { word: 'Hot Dog', hint: 'Sausage' },
      { word: 'Cheesecake', hint: 'Dessert' },
      { word: 'Guacamole', hint: 'Avocado' },
    ],
  },
  {
    id: 'places',
    name: 'Places & Locations',
    icon: '🌍',
    words: [
      { word: 'Airport', hint: 'Flights' },
      { word: 'Hospital', hint: 'Medical' },
      { word: 'Cinema', hint: 'Screen' },
      { word: 'Beach', hint: 'Coast' },
      { word: 'Gym', hint: 'Fitness' },
      { word: 'Library', hint: 'Books' },
      { word: 'Amusement Park', hint: 'Rides' },
      { word: 'Hotel', hint: 'Lodging' },
      { word: 'Museum', hint: 'Exhibits' },
      { word: 'Zoo', hint: 'Wildlife' },
      { word: 'Bakery', hint: 'Oven' },
      { word: 'Space Station', hint: 'Orbit' },
      { word: 'Castle', hint: 'Medieval' },
      { word: 'Camping Site', hint: 'Campfire' },
      { word: 'Supermarket', hint: 'Groceries' },
      { word: 'Subway Station', hint: 'Underground' },
      { word: 'Aquarium', hint: 'Marine' },
      { word: 'Casino', hint: 'Jackpot' },
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: '🐾',
    words: [
      { word: 'Penguin', hint: 'Antarctica' },
      { word: 'Kangaroo', hint: 'Australia' },
      { word: 'Chameleon', hint: 'Camouflage' },
      { word: 'Dolphin', hint: 'Marine' },
      { word: 'Elephant', hint: 'Trunk' },
      { word: 'Lion', hint: 'Predator' },
      { word: 'Owl', hint: 'Nocturnal' },
      { word: 'Koala', hint: 'Eucalyptus' },
      { word: 'Panda', hint: 'Bamboo' },
      { word: 'Cheetah', hint: 'Sprint' },
      { word: 'Octopus', hint: 'Tentacles' },
      { word: 'Giraffe', hint: 'Height' },
      { word: 'Sloth', hint: 'Slow' },
      { word: 'Flamingo', hint: 'Pink' },
      { word: 'Shark', hint: 'Fin' },
      { word: 'Beaver', hint: 'Dams' },
      { word: 'Peacock', hint: 'Plumage' },
    ],
  },
  {
    id: 'objects',
    name: 'Everyday Objects',
    icon: '💡',
    words: [
      { word: 'Toothbrush', hint: 'Bristles' },
      { word: 'Umbrella', hint: 'Rain' },
      { word: 'Headphones', hint: 'Audio' },
      { word: 'Mirror', hint: 'Reflection' },
      { word: 'Scissors', hint: 'Cutting' },
      { word: 'Pillow', hint: 'Bedding' },
      { word: 'Backpack', hint: 'Luggage' },
      { word: 'Sunglasses', hint: 'Eyewear' },
      { word: 'Candle', hint: 'Wax' },
      { word: 'Wristwatch', hint: 'Time' },
      { word: 'Flashlight', hint: 'Beam' },
      { word: 'Guitar', hint: 'Strings' },
      { word: 'Keys', hint: 'Locks' },
      { word: 'Soap', hint: 'Lather' },
      { word: 'Passport', hint: 'Border' },
      { word: 'Thermos', hint: 'Insulated' },
    ],
  },
  {
    id: 'movies',
    name: 'Movies & Pop Culture',
    icon: '🎬',
    words: [
      { word: 'Harry Potter', hint: 'Magic' },
      { word: 'Spider-Man', hint: 'Webs' },
      { word: 'Titanic', hint: 'Shipwreck' },
      { word: 'Batman', hint: 'Gotham' },
      { word: 'Jurassic Park', hint: 'Dinosaurs' },
      { word: 'Star Wars', hint: 'Galaxy' },
      { word: 'Frozen', hint: 'Ice' },
      { word: 'Shrek', hint: 'Swamp' },
      { word: 'Toy Story', hint: 'Playroom' },
      { word: 'Finding Nemo', hint: 'Reef' },
      { word: 'The Matrix', hint: 'Simulation' },
      { word: 'Lion King', hint: 'Savannah' },
      { word: 'Barbie', hint: 'Fashion' },
      { word: 'Avengers', hint: 'Heroes' },
    ],
  },
  {
    id: 'sports',
    name: 'Sports & Hobbies',
    icon: '⚽',
    words: [
      { word: 'Basketball', hint: 'Hoop' },
      { word: 'Soccer', hint: 'Pitch' },
      { word: 'Bowling', hint: 'Pins' },
      { word: 'Chess', hint: 'Strategy' },
      { word: 'Swimming', hint: 'Pool' },
      { word: 'Tennis', hint: 'Racket' },
      { word: 'Surfing', hint: 'Waves' },
      { word: 'Skiing', hint: 'Slopes' },
      { word: 'Boxing', hint: 'Ring' },
      { word: 'Golf', hint: 'Clubs' },
      { word: 'Skateboarding', hint: 'Ramps' },
      { word: 'Yoga', hint: 'Stretching' },
      { word: 'Fishing', hint: 'Angling' },
      { word: 'Archery', hint: 'Target' },
    ],
  },
  {
    id: 'jobs',
    name: 'Jobs & Professions',
    icon: '💼',
    words: [
      { word: 'Doctor', hint: 'Medicine' },
      { word: 'Chef', hint: 'Kitchen' },
      { word: 'Pilot', hint: 'Cockpit' },
      { word: 'Firefighter', hint: 'Rescue' },
      { word: 'Detective', hint: 'Mystery' },
      { word: 'Astronaut', hint: 'Cosmos' },
      { word: 'Teacher', hint: 'Classroom' },
      { word: 'Magician', hint: 'Illusion' },
      { word: 'Photographer', hint: 'Camera' },
      { word: 'Judge', hint: 'Courtroom' },
      { word: 'Architect', hint: 'Blueprints' },
      { word: 'Archaeologist', hint: 'Excavation' },
    ],
  },
]

// Pick a random word from a category, or across all categories if 'any' is selected
export function getRandomWordPair(categoryId = 'any') {
  let pool = []
  if (categoryId === 'any') {
    pool = CATEGORIES.flatMap((cat) =>
      cat.words.map((w) => ({ ...w, categoryName: cat.name, categoryIcon: cat.icon }))
    )
  } else {
    const found = CATEGORIES.find((c) => c.id === categoryId)
    if (found) {
      pool = found.words.map((w) => ({ ...w, categoryName: found.name, categoryIcon: found.icon }))
    } else {
      pool = CATEGORIES[0].words.map((w) => ({
        ...w,
        categoryName: CATEGORIES[0].name,
        categoryIcon: CATEGORIES[0].icon,
      }))
    }
  }

  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}
