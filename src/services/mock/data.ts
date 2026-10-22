import type {
  Card,
  CardColor,
  CardSet,
  ChangelogEntry,
  City,
  Condition,
  Deck,
  DeckCard,
  DeckComment,
  FaqEntry,
  Finish,
  Game,
  GameId,
  HelpArticle,
  Language,
  NewsItem,
  Rarity,
  SealedProduct,
  SetType,
  Store,
  TradeItem,
  UserProfile,
} from '../types'

import { createRandom, daysAgo, slugify } from './random'


const random = createRandom(20261018)

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

const allCapabilities = {
  catalogue: true,
  deckBuilder: true,
  legalities: true,
  scanner: true,
  trading: true,
}

export const games: Game[] = [
  {
    capabilities: allCapabilities,
    formats: ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Commander', 'Pauper'],
    hue: 25,
    id: 'mtg',
    name: 'Magic: The Gathering',
    shortName: 'MTG',
    tagline: 'The original trading card game, with decades of sets to collect.',
  },
  {
    capabilities: {
      ...allCapabilities,
      legalities: false,
    },
    formats: ['Standard'],
    hue: 300,
    id: 'riftbound',
    name: 'Riftbound',
    shortName: 'Riftbound',
    tagline: 'Champions, runes and battlefields from the Rift.',
  },
  {
    capabilities: {
      ...allCapabilities,
      legalities: false,
    },
    formats: ['Standard'],
    hue: 5,
    id: 'onepiece',
    name: 'One Piece Card Game',
    shortName: 'One Piece',
    tagline: 'Leaders, crews and DON!! cards on the Grand Line.',
  },
  {
    capabilities: {
      ...allCapabilities,
      deckBuilder: false,
      legalities: false,
    },
    formats: ['Premier'],
    hue: 220,
    id: 'swu',
    name: 'Star Wars: Unlimited',
    shortName: 'SWU',
    tagline: 'Leaders and units from across the galaxy.',
  },
  {
    capabilities: {
      ...allCapabilities,
      deckBuilder: false,
      legalities: false,
    },
    formats: ['Core', 'Infinity'],
    hue: 270,
    id: 'lorcana',
    name: 'Disney Lorcana',
    shortName: 'Lorcana',
    tagline: 'Glimmers, inks and enchanted foils.',
  },
  {
    capabilities: {
      ...allCapabilities,
      deckBuilder: false,
      legalities: false,
    },
    formats: ['Standard'],
    hue: 55,
    id: 'fusionworld',
    name: 'Dragon Ball Super: Fusion World',
    shortName: 'Fusion World',
    tagline: 'Iconic battles and parallel artwork.',
  },
  {
    capabilities: {
      ...allCapabilities,
      deckBuilder: false,
      legalities: false,
    },
    formats: ['Classic Constructed', 'Blitz'],
    hue: 0,
    id: 'fab',
    name: 'Flesh and Blood',
    shortName: 'FaB',
    tagline: 'Heroes, equipment and cold foils.',
  },
]

// ---------------------------------------------------------------------------
// Sets & cards
// ---------------------------------------------------------------------------

const setNames: Record<GameId, [string, SetType][]> = {
  fab: [['Ember Crown', 'expansion'], ['Tidal Forge', 'expansion'], ['Hero Deck: Rhian', 'starter'], ['Ironveil', 'expansion']],
  fusionworld: [['Awakened Pulse', 'expansion'], ['Blazing Aura', 'expansion'], ['Starter: Saiyan Pride', 'starter'], ['Dual Evolution', 'expansion']],
  lorcana: [['The Lantern Tide', 'expansion'], ['Rise of Glimmers', 'expansion'], ['Shimmering Isles', 'expansion'], ['Ink Archive', 'promo']],
  mtg: [
    ['Echoes of the Spire', 'expansion'],
    ['Shattered Meridian', 'expansion'],
    ['Wildgrove Uprising', 'expansion'],
    ['Spire Commander', 'commander'],
    ['Foundations of Aether', 'core'],
    ['Gilded Archive', 'masterpiece'],
    ['Store Championship Promos', 'promo'],
  ],
  onepiece: [['Pirate Legends', 'expansion'], ['Grand Fleet', 'expansion'], ['Starter: Red Horizon', 'starter'], ['Seas of Fortune', 'expansion']],
  riftbound: [['Origins', 'expansion'], ['Spiritforged', 'expansion'], ['Unleashed', 'expansion']],
  swu: [['Shadow Accord', 'expansion'], ['Rebel Spark', 'expansion'], ['Hyperspace Run', 'expansion'], ['Weekly Play Promos', 'promo']],
}

const adjectives = [
  'Ashen', 'Gilded', 'Silent', 'Verdant', 'Hollow', 'Radiant', 'Feral', 'Crimson', 'Wandering', 'Ancient',
  'Storm', 'Hidden', 'Iron', 'Lunar', 'Ember', 'Frost', 'Shadow', 'Sunlit', 'Restless', 'Sworn',
  'Gleaming', 'Thorned', 'Drowned', 'Fabled', 'Wicked', 'Valiant', 'Spectral', 'Brazen', 'Mire', 'Celestial',
]
const nouns = [
  'Wanderer', 'Sentinel', 'Oracle', 'Drake', 'Herald', 'Warden', 'Tactician', 'Alchemist', 'Colossus', 'Strider',
  'Archivist', 'Raider', 'Matriarch', 'Golem', 'Seer', 'Duelist', 'Familiar', 'Behemoth', 'Envoy', 'Reaver',
  'Lantern', 'Bastion', 'Covenant', 'Pact', 'Tempest', 'Relic', 'Banner', 'Crown', 'Sanctum', 'Rite',
]
const landNames = ['Misty Ridge', 'Sunken Grotto', 'Ember Flats', 'Verdant Hollow', 'Glacier Pass', 'Shattered Causeway', 'Ivory Steppe', 'Obsidian Vale']
const mtgTypes = ['Creature — Elf Druid', 'Creature — Human Knight', 'Creature — Dragon', 'Creature — Spirit', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Legendary Creature — Wizard', 'Planeswalker']
const genericTypes: Record<Exclude<GameId, 'mtg'>, string[]> = {
  fab: ['Action — Attack', 'Instant', 'Equipment — Head', 'Weapon — Sword', 'Defense Reaction'],
  fusionworld: ['Battle', 'Extra', 'Leader', 'Unit'],
  lorcana: ['Character — Storyborn Hero', 'Action — Song', 'Item', 'Location', 'Character — Dreamborn Villain'],
  onepiece: ['Character', 'Event', 'Leader', 'Stage'],
  riftbound: ['Unit', 'Champion Unit', 'Spell', 'Gear', 'Legend', 'Battlefield'],
  swu: ['Unit — Ground', 'Unit — Space', 'Event', 'Upgrade', 'Leader'],
}
const artists = ['Mira Okafor', 'Jonas Veld', 'Aiko Tanabe', 'Luca Ferraro', 'Sasha Morrow', 'Elena Brandt', 'Diego Salas', 'Priya Nair', 'Tomasz Wilk', 'Ines Duarte', 'Kenji Arai', 'Hana Lindqvist']
const flavor = [
  'Every map ends where the brave begin.',
  'The spire remembers what the city forgot.',
  'Some debts are paid in silence.',
  'It never asked for worship, only patience.',
  'Bring a lantern. Bring two.',
  null,
  null,
]
const rulesText = [
  'When this enters, draw a card.',
  'Whenever you cast a spell, put a +1/+1 counter on target creature you control.',
  'Flying. At the beginning of your upkeep, scry 1.',
  'Destroy target artifact or enchantment.',
  'Target player discards two cards.',
  'Creatures you control get +1/+0 until end of turn.',
  'Return target creature card from your graveyard to your hand.',
  'Counter target spell unless its controller pays 3.',
  'Search your library for a basic land card, put it onto the battlefield tapped.',
  'When this is put into a graveyard from anywhere, shuffle it into its owner\'s library.',
]
const mtgFormats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper']
const colorsPool: CardColor[] = ['W', 'U', 'B', 'R', 'G']

function makeCode(gameId: GameId, name: string, index: number) {
  const letters = name.replace(/[^A-Za-z ]/g, '').split(' ')
    .filter(Boolean)
  const base = letters.length >= 3
    ? letters.slice(0, 3).map(word => word[0])
      .join('')
    : (letters[0] ?? 'set').slice(0, 3)
  return `${gameId === 'mtg' ? '' : gameId.slice(0, 2)}${base}${index}`.toLowerCase()
}

function rarityFor(index: number): Rarity {
  if (index % 11 === 0) return 'mythic'
  if (index % 4 === 0) return 'rare'
  if (index % 3 === 0) return 'uncommon'
  return 'common'
}

const priceCeiling: Record<Rarity, number> = {
  common: 1.5,
  mythic: 160,
  rare: 45,
  special: 30,
  uncommon: 6,
}

export const sets: CardSet[] = []
export const cards: Card[] = []

for (const game of games) {
  setNames[game.id].forEach(([name, type], setIndex) => {
    const code = makeCode(game.id, name, setIndex + 1)
    const cardCount = type === 'promo' ? 12 : 36
    const setCards: Card[] = []

    for (let index = 1; index <= cardCount; index++) {
      const isLand = game.id === 'mtg' && index > cardCount - 6
      const cardName = isLand
        ? landNames[(index + setIndex) % landNames.length] ?? 'Wild Land'
        : `${random.pick(adjectives)} ${random.pick(nouns)}`
      const rarity = isLand ? 'common' : rarityFor(index)
      const finishes: Finish[] = random.chance(0.15) ? ['nonfoil', 'foil', 'etched'] : ['nonfoil', 'foil']
      const nonfoil = random.price(priceCeiling[rarity])
      const colors = isLand ? (['C'] as CardColor[]) : random.sample(colorsPool, random.int(1, 2))
      const legalities: Card['legalities'] = {}
      if (game.capabilities.legalities) {
        for (const format of mtgFormats) {
          legalities[format] = type === 'promo' && format === 'standard' ? 'not_legal' : random.chance(0.03) ? 'banned' : 'legal'
        }
      }

      setCards.push({
        artist: random.pick(artists),
        colors,
        cost: isLand ? 0 : random.int(1, 7),
        finishes,
        flavorText: random.pick(flavor),
        gameId: game.id,
        id: `${game.id}-${code}-${index}`,
        legalities,
        name: cardName,
        number: String(index),
        priceChange7d: Math.round((random.next() - 0.45) * 30) / 10,
        prices: {
          etched: finishes.includes('etched') ? Math.round(nonfoil * 2.4 * 100) / 100 : undefined,
          foil: Math.round(nonfoil * (1.4 + random.next()) * 100) / 100,
          nonfoil,
        },
        rarity,
        rulings: game.id === 'mtg' && random.chance(0.4)
          ? [
            {
              date: daysAgo(random.int(30, 400)),
              text: 'If the target becomes illegal before this resolves, it does nothing.',
            },
            {
              date: daysAgo(random.int(30, 400)),
              text: 'Copies created this way are not cast.',
            },
          ]
          : [],
        setCode: code,
        setName: name,
        slug: slugify(cardName),
        text: isLand ? 'Tap: Add one mana of any color in this land\'s identity.' : random.pick(rulesText),
        typeLine: isLand ? 'Land' : game.id === 'mtg' ? random.pick(mtgTypes) : random.pick(genericTypes[game.id]),
      })
    }

    cards.push(...setCards)
    sets.push({
      cardCount,
      code,
      gameId: game.id,
      marketCap: type === 'promo' ? null : Math.round(setCards.reduce((sum, card) => sum + (card.prices.nonfoil ?? 0), 0) * 40),
      name,
      releasedAt: daysAgo(30 + setIndex * 75 + random.int(0, 20)),
      type,
    })
  })
}

export const sealedProducts: SealedProduct[] = sets
  .filter(set => set.type === 'expansion' || set.type === 'core')
  .flatMap((set) => {
    const products: [SealedProduct['category'], string, string, number | null][] = [
      ['Booster Packs', `${set.name} Play Booster`, 'Play', random.price(8) + 3],
      ['Booster Packs', `${set.name} Collector Booster`, 'Collector', random.price(30) + 18],
      ['Booster Boxes', `${set.name} Play Booster Box`, 'Play', random.price(60) + 110],
      ['Bundles', `${set.name} Bundle`, 'Standard', random.price(20) + 40],
      ['Prerelease & Draft Kits', `${set.name} Prerelease Pack`, 'Prerelease Kit', random.price(10) + 22],
      ['Cases', `${set.name} Play Booster Box Case`, 'Play', null],
    ]
    return products.map(([category, name, variant, price], index) => ({
      category,
      gameId: set.gameId,
      id: `${set.code}-sealed-${index}`,
      name,
      price,
      setCode: set.code,
      variant,
    }))
  })

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export const cities: City[] = [
  {
    country: 'Italy',
    lat: 45.4642,
    lng: 9.19,
    name: 'Milan',
    slug: 'milan--italy',
    tradeCount: 412,
    traderCount: 268,
    unlockThreshold: 4,
  },
  {
    country: 'Italy',
    lat: 45.0703,
    lng: 7.6869,
    name: 'Turin',
    slug: 'turin--italy',
    tradeCount: 96,
    traderCount: 61,
    unlockThreshold: 4,
  },
  {
    country: 'Italy',
    lat: 45.3141,
    lng: 8.8544,
    name: 'Vigevano',
    slug: 'vigevano--italy',
    tradeCount: 0,
    traderCount: 1,
    unlockThreshold: 3,
  },
  {
    country: 'Italy',
    lat: 41.9028,
    lng: 12.4964,
    name: 'Rome',
    slug: 'rome--italy',
    tradeCount: 188,
    traderCount: 143,
    unlockThreshold: 4,
  },
  {
    country: 'Italy',
    lat: 44.4949,
    lng: 11.3426,
    name: 'Bologna',
    slug: 'bologna--italy',
    tradeCount: 54,
    traderCount: 39,
    unlockThreshold: 3,
  },
  {
    country: 'Bulgaria',
    lat: 42.6975,
    lng: 23.3242,
    name: 'Sofia',
    slug: 'sofia--bulgaria',
    tradeCount: 373,
    traderCount: 237,
    unlockThreshold: 3,
  },
  {
    country: 'Germany',
    lat: 52.52,
    lng: 13.405,
    name: 'Berlin',
    slug: 'berlin--germany',
    tradeCount: 140,
    traderCount: 97,
    unlockThreshold: 4,
  },
  {
    country: 'Spain',
    lat: 40.4168,
    lng: -3.7038,
    name: 'Madrid',
    slug: 'madrid--spain',
    tradeCount: 2,
    traderCount: 2,
    unlockThreshold: 3,
  },
]

const storePrefixes = ['The Mana', 'Dragon\'s', 'Critical', 'Golden', 'Rune', 'Pixel', 'Meeple', 'Arcane', 'Paper', 'Tabletop']
const storeSuffixes = ['Vault', 'Hoard', 'Hit Games', 'Goblin', 'Forge', 'Den', 'Corner', 'Emporium', 'Arena', 'Tavern']

export const stores: Store[] = cities.flatMap((city) => {
  const count = city.traderCount > 50 ? 7 : 4
  return Array.from({ length: count }, (_, index) => {
    const name = `${random.pick(storePrefixes)} ${random.pick(storeSuffixes)}${index > 3 ? ` ${city.name}` : ''}`
    return {
      address: `Via ${random.pick(['Roma', 'Garibaldi', 'Dante', 'Verdi', 'Mazzini'])} ${random.int(1, 120)}, ${city.name}, ${city.country}`,
      citySlug: city.slug,
      isHub: index === 0 && city.traderCount > 50,
      lat: city.lat + (random.next() - 0.5) * 0.08,
      lng: city.lng + (random.next() - 0.5) * 0.08,
      name,
      slug: slugify(`${name}-${city.name}`),
      traderCount: city.traderCount < city.unlockThreshold
        ? (index < city.traderCount ? 1 : 0)
        : Math.max(1, Math.round(city.traderCount / (index + 2))),
      website: random.chance(0.6) ? `https://example.com/${slugify(name)}` : null,
    }
  })
})

// ---------------------------------------------------------------------------
// Users & trade lists
// ---------------------------------------------------------------------------

const syllables = ['kai', 'zen', 'lo', 'mar', 'vex', 'ira', 'tor', 'nyx', 'bel', 'dra', 'sol', 'fen', 'rho', 'qui', 'ash']
const badgePool = ['Pioneer', 'Trailblazer', 'Collector', 'Deck Brewer', 'Trusted Trader']
const meetingPlaces = ['Store front counter', 'Café next door', 'Friday Night tables', 'Train station hall']
const tradeCities = cities.filter(city => city.traderCount >= city.unlockThreshold)

export const users: UserProfile[] = Array.from({ length: 48 }, (_, index) => {
  const city = index === 0 ? cities.find(c => c.slug === 'vigevano--italy') ?? random.pick(tradeCities) : random.pick(tradeCities)
  const cityStores = stores.filter(store => store.citySlug === city.slug)
  return {
    avatarHue: random.int(0, 360),
    badges: random.sample(badgePool, random.int(0, 2)),
    citySlugs: [city.slug],
    completedTrades: random.int(0, 90),
    games: random.sample(games.map(game => game.id), random.int(1, 4)),
    id: `user-${index}`,
    meetingPlaces: random.sample(meetingPlaces, random.int(1, 2)),
    memberSince: daysAgo(random.int(20, 700)),
    storeSlugs: random.sample(cityStores, random.int(1, Math.min(3, cityStores.length))).map(store => store.slug),
    username: `${random.pick(syllables)}${random.pick(syllables)}${random.chance(0.5) ? random.int(1, 99) : ''}`,
  }
})

const conditions: Condition[] = ['NM', 'NM', 'NM', 'NM', 'EX', 'GD', 'LP', 'M']
const languages: Language[] = ['en', 'en', 'en', 'en', 'it', 'de', 'ja', 'fr']

export const tradeItems: TradeItem[] = users.flatMap((user) => {
  const pool = cards.filter(card => user.games.includes(card.gameId))
  const citySlug = user.citySlugs[0] ?? 'milan--italy'
  const makeItem = (listType: TradeItem['listType']) => (card: Card, index: number): TradeItem => {
    const finish: Finish = random.chance(0.2) ? 'foil' : 'nonfoil'
    return {
      card,
      citySlug,
      condition: random.pick(conditions),
      finish,
      id: `${user.id}-${listType}-${index}`,
      language: random.pick(languages),
      listType,
      ownerUsername: user.username,
      price: card.prices[finish] ?? card.prices.nonfoil ?? 0,
      quantity: random.chance(0.8) ? 1 : random.int(2, 4),
      storeSlugs: user.storeSlugs,
      updatedAt: daysAgo(random.next() * 60),
    }
  }
  return [
    ...random.sample(pool, random.int(8, 40)).map(makeItem('haves')),
    ...random.sample(pool, random.int(2, 12)).map(makeItem('wants')),
  ]
})

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

function buildDeck(gameId: GameId, format: string): DeckCard[] {
  const pool = cards.filter(card => card.gameId === gameId)
  const lands = pool.filter(card => card.typeLine === 'Land')
  const spells = pool.filter(card => card.typeLine !== 'Land')

  if (format === 'Commander') {
    const commander = spells.find(card => card.typeLine.startsWith('Legendary')) ?? spells.at(0)
    const singles = random.sample(spells.filter(card => card !== commander), 62)
    const basics = random.sample(lands, Math.min(lands.length, 37))
    return [
      ...(commander ? [{
        card: commander,
        quantity: 1,
        section: 'commander' as const,
      }] : []),
      ...singles.map(card => ({
        card,
        quantity: 1,
        section: 'mainboard' as const,
      })),
      ...basics.map(card => ({
        card,
        quantity: 1,
        section: 'mainboard' as const,
      })),
    ]
  }

  const main: DeckCard[] = random.sample(spells, 9).map(card => ({
    card,
    quantity: 4,
    section: 'mainboard',
  }))
  if (gameId === 'mtg') {
    main.push(...random.sample(lands, 6).map(card => ({
      card,
      quantity: 4,
      section: 'mainboard' as const,
    })))
  }
  else {
    main.push(...random.sample(spells, 6).map(card => ({
      card,
      quantity: 4,
      section: 'mainboard' as const,
    })))
  }
  const sideboard = random.sample(spells, 5).map(card => ({
    card,
    quantity: 3,
    section: 'sideboard' as const,
  }))
  return [...main, ...sideboard]
}

const deckNames = ['Spire Control', 'Wildgrove Stompy', 'Ember Tempo', 'Ashen Reanimator', 'Gilded Artifacts', 'Lunar Tokens', 'Mono Red Aggro', 'Frost Walls', 'Drake Ramp', 'Shadow Rogues', 'Sunlit Lifegain', 'Iron Affinity']

export const decks: Deck[] = Array.from({ length: 30 }, (_, index) => {
  const gameId: GameId = index < 18 ? 'mtg' : index < 24 ? 'riftbound' : 'onepiece'
  const game = games.find(g => g.id === gameId)
  const format = gameId === 'mtg' ? random.pick(['Commander', 'Modern', 'Legacy', 'Standard', 'Commander']) : (game?.formats[0] ?? 'Standard')
  return {
    cards: buildDeck(gameId, format),
    commentCount: random.int(0, 6),
    description: 'A community list shared for inspiration. Swap pieces to fit your meta.',
    format,
    gameId,
    id: `deck-${index + 1}`,
    likes: random.int(0, 40),
    name: deckNames[index % deckNames.length] ?? 'Untitled deck',
    ownerUsername: random.pick(users).username,
    updatedAt: daysAgo(random.int(1, 120)),
  }
})

export const deckComments: Record<string, DeckComment[]> = Object.fromEntries(
  decks.map(deck => [
    deck.id,
    Array.from({ length: Math.min(deck.commentCount, 3) }, (_, index) => ({
      body: random.pick(['Love the curve on this.', 'Have you tried a second copy of the finisher?', 'Took this to FNM, went 3-1!', 'The sideboard plan is great.']),
      createdAt: daysAgo(random.int(1, 30)),
      id: `${deck.id}-c${index}`,
      username: random.pick(users).username,
    })),
  ]),
)

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const news: NewsItem[] = Array.from({ length: 8 }, (_, index) => ({
  author: random.pick(['Market Desk', 'Deck Lab', 'Price Watch']),
  id: `news-${index}`,
  publishedAt: daysAgo(index * 3 + 1),
  summary: random.pick([
    'The cards everyone is scrambling for this week, and why prices moved.',
    'A look at the budget pickups that keep showing up in winning lists.',
    'Which reprints are worth holding and which are worth trading away.',
  ]),
  title: random.pick(['Weekly Winners', 'Budget Brews', 'Reprint Watch', 'Format Spotlight', 'Market Movers']) + ` #${40 - index}`,
  url: '#',
}))

export const changelog: ChangelogEntry[] = [
  {
    added: ['Invite friends with a shareable QR code', 'Filter cards by artist across catalogue and trade views'],
    date: '2026-10-10',
    fixed: ['Deck import keeps commander pairs together'],
    improved: ['Signing up from a Trade button returns you to the card you were looking at'],
  },
  {
    added: ['Swap calculator for balancing in-person trades'],
    date: '2026-09-22',
    fixed: ['City pages show the right store count on mobile'],
    improved: ['Faster card search with keyboard navigation'],
  },
  {
    added: ['Opening-hand simulator and draw odds on deck pages'],
    date: '2026-09-01',
    fixed: [],
    improved: ['Store pages explain how close a city is to unlocking trading'],
  },
]

export const faq: FaqEntry[] = [
  {
    answer: 'Yes. Your Binder, Lists, decks and Matches cost nothing. If paid extras arrive later, trading itself stays free.',
    question: 'Does CardNearMe cost anything?',
  },
  {
    answer: 'Mark the cards you can part with as Haves and record your Wants. When another Trader in your City has a Have that fits one of your Wants, you get a Match. You agree the Trade in chat and hand the cards over face to face.',
    question: 'What happens in a Trade?',
  },
  {
    answer: 'No. A handful of Haves and Wants is enough to get Matches. You can bring the rest of your Collection in from a CSV whenever you like.',
    question: 'Must I enter every card I own?',
  },
  {
    answer: 'Pick a Store you both already go to. A shop with staff and other players around is the easiest place to check cards and hand them over.',
    question: 'Where do Traders meet?',
  },
  {
    answer: 'You choose one price source for the whole app, Cardmarket (EUR) or TCGplayer (USD), and every Printing shows its price from it.',
    question: 'Where do card prices come from?',
  },
]

function article(slug: string, title: string, summary: string, sections: [string, string][]): HelpArticle {
  return {
    sections: sections.map(([heading, body]) => ({
      body,
      heading,
    })),
    slug,
    summary,
    title,
  }
}

export const helpArticles: HelpArticle[] = [
  article('getting-started', 'Getting started', 'Your first few minutes: games, City and Stores.', [['Sign up', 'Register with email or a social login, then tell us which games you play.'], ['Join your Stores', 'Join the Stores you visit so we can find Matches among the Traders who go there too.']]),
  article('faq', 'FAQ', 'Short answers to the questions we hear most.', [['Question not here?', 'Write to us through the contact form and we will reply.']]),
  article('scanner', 'Card scanner', 'Turn a photo into a Collection entry.', [['What the scanner does', 'Your phone camera reads the card and suggests the Printing it belongs to. Confirm or correct it, then save.']]),
  article('collection', 'Your Collection', 'Record, import and sort the cards you own.', [['Typing in a card', 'Look up the Card, choose its Printing, then set condition, finish and how many you own.'], ['Bringing cards in from a file', 'Upload a CSV exported elsewhere, or paste one card per line.']]),
  article('trading', 'Haves, Wants and Lists', 'Tell other Traders what you offer and what you need.', [['Making a List', 'Group your Haves or your Wants into a List and choose who can see it.'], ['When you get a Match', 'If a Trader in your City has a Have that fits one of your Wants, we let you know.']]),
  article('decks', 'Deck building', 'Put a deck together and see which cards you already own.', [['Supported games', 'Only some games have a deck builder today; more will follow.']]),
  article('search', 'Searching', 'Narrow a long card list down fast.', [['Search box and facets', 'Press / to jump to search, then refine any card list with the filters beside it.']]),
  article('stores', 'Stores', 'Find the shops in your City and join them.', [['Joining a Store', 'Open the stores page, look up your City and join the Stores where you play.']]),
  article('account', 'Account settings', 'Profile, Stores, games and price source.', [['Price source', 'Switch every price in the app between Cardmarket (EUR) and TCGplayer (USD).']]),
  article('shortcuts', 'Keyboard shortcuts', 'Move around without the mouse.', [['Anywhere', 'Ctrl/Cmd+K opens the command palette, / jumps to search, Esc closes a dialog.'], ['Press G, then a letter', 'G H home, G F card sets, G P public decks, G S stores, G W swap calculator, G E help.']]),
  article('privacy', 'Privacy & security', 'What we keep and why.', [['Data we keep', 'Just enough to run your account and find your Matches.']]),
  article('contact', 'Contact support', 'Reach a person on the team.', [['Getting in touch', 'Send us a message from the contact form; expect an answer within two working days.']]),
]
