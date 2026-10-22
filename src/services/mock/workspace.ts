import type { WorkspaceServices } from '../services'
import type {
  AppNotification,
  BinderImport,
  BinderItem,
  BinderItemInput,
  BinderSection,
  Card,
  ChatMessage,
  ChatParticipant,
  ChatSummary,
  Condition,
  DeckInput,
  Finish,
  GameId,
  Language,
  MeetupLocation,
  NotificationKind,
  OwnedDeck,
  Ownership,
  ParsedImportRow,
  Trade,
  TradeDraft,
  TradeDraftLine,
  TradeItem,
  TradeLine,
  TradeList,
  TradeListInput,
  TradeListType,
  Visibility,
  WorkspaceProfile,
} from '../types'

import { cards, cities, games, stores, tradeItems, users } from './data'
import { baseType, buildFacets, capitalise, compare, labelFrom, matchesFacets, matchesText } from './queryHelpers'
import type { FacetDefinition } from './queryHelpers'
import { createRandom, daysAgo, MOCK_NOW } from './random'
import type { Random } from './random'

import { viewerLimits } from '#/auth/limits'
import { conditionLabels, isCondition, isFinish, isLanguage, languageLabels } from '#/lib/cardOptions'

/**
 * In-memory mock of the signed-in workspace. Runs on the server only (see
 * `workspaceRpc.ts`); state is seeded per user on first access and lives
 * until the server restarts. Mock trading partners are the seeded public
 * users, and they accept proposals on their own after a short delay so every
 * trade state can be exercised from one account.
 */

export interface WorkspaceOwner {
  id: string
  username: string
  onboarded: boolean
}

interface ItemRecord {
  id: string
  section: BinderSection
  listId: string | null
  cardId: string
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
  updatedAt: string
}

interface ListRecord {
  id: string
  name: string
  type: TradeListType
  gameId: GameId | null
  visibility: Visibility
  createdAt: string
  updatedAt: string
}

/** `Omit` that keeps union members apart (plain `Omit` collapses a union to its shared keys). */
type DistributiveOmit<T, TKey extends PropertyKey> = T extends unknown ? Omit<T, TKey> : never

type NewMessage = DistributiveOmit<ChatMessage, 'chatId' | 'id' | 'sentAt'>

const deckSections = new Set(['commander', 'mainboard', 'sideboard', 'considering'])

interface ChatRecord {
  id: string
  partner: string
  messages: ChatMessage[]
  lastReadAt: string
}

interface WorkspaceState {
  owner: WorkspaceOwner
  profile: WorkspaceProfile
  lists: ListRecord[]
  items: ItemRecord[]
  imports: BinderImport[]
  decks: OwnedDeck[]
  chats: ChatRecord[]
  trades: Trade[]
  notifications: AppNotification[]
  nextId: number
}

/** Mock partners accept the viewer's proposals after this long. */
const PARTNER_REPLY_MS = 20_000
const MAX_QUANTITY = 999

const cardsById = new Map(cards.map(card => [card.id, card]))
const storesBySlug = new Map(stores.map(store => [store.slug, store]))
const usersByName = new Map<string, (typeof users)[number]>()
for (const user of users) {
  if (!usersByName.has(user.username)) usersByName.set(user.username, user)
}

const states = new Map<string, WorkspaceState>()

export function workspaceFor(owner: WorkspaceOwner): WorkspaceServices {
  let state = states.get(owner.id)
  if (!state) {
    state = seedWorkspace(owner)
    states.set(owner.id, state)
  }
  return createWorkspaceServices(state)
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function now() {
  return new Date().toISOString()
}

function hoursAgo(hours: number) {
  return new Date(MOCK_NOW - hours * 3_600_000).toISOString()
}

function daysFromNow(days: number, hour: number) {
  const date = new Date(MOCK_NOW + days * 86_400_000)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString()
}

function priceOf(card: Card, finish: Finish) {
  return card.prices[finish] ?? card.prices.nonfoil ?? 0
}

function requireCard(cardId: string) {
  const card = cardsById.get(cardId)
  if (!card) throw new Error('Card not found')
  return card
}

function cardKey(card: Pick<Card, 'gameId' | 'name'>) {
  return `${card.gameId}:${card.name.toLowerCase()}`
}

function clampQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be at least 1')
  return Math.min(quantity, MAX_QUANTITY)
}

function participant(username: string): ChatParticipant {
  const user = usersByName.get(username)
  if (!user) throw new Error(`Trader ${username} not found`)
  const hash = hashString(username)
  return {
    avatarHue: user.avatarHue,
    lastSeenAt: hoursAgo(hash % 30),
    online: hash % 3 === 0,
    storeSlugs: user.storeSlugs,
    username,
  }
}

function partnerItems(username: string, listType: TradeListType) {
  return tradeItems.filter(item => item.ownerUsername === username && item.listType === listType)
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

function seedWorkspace(owner: WorkspaceOwner): WorkspaceState {
  const random = createRandom(hashString(owner.id))
  let counter = 1
  const id = (prefix: string) => `${prefix}-${counter++}`

  const milan = cities.find(city => city.slug === 'milan--italy')
  const milanStores = stores
    .filter(store => store.citySlug === milan?.slug)
    .sort((a, b) => b.traderCount - a.traderCount)
  const profileGames: GameId[] = ['mtg', random.pick(['onepiece', 'lorcana', 'riftbound'] as const)]

  const profile: WorkspaceProfile = {
    avatarHue: random.int(0, 360),
    bio: '',
    // Already-onboarded accounts (e.g. after a server restart) get a sensible trading setup.
    citySlug: owner.onboarded ? (milan?.slug ?? null) : null,
    displayName: owner.username,
    games: profileGames,
    meetingPlaces: ['Café next door'],
    onboardedAt: owner.onboarded ? daysAgo(30) : null,
    pricingSource: 'cardmarket-eur',
    showStoresOnProfile: true,
    storeSettings: {},
    storeSlugs: owner.onboarded ? milanStores.slice(0, 2).map(store => store.slug) : [],
    username: owner.username,
  }

  const lists: ListRecord[] = [
    {
      createdAt: daysAgo(120),
      gameId: null,
      id: id('list'),
      name: 'Trade binder',
      type: 'haves',
      updatedAt: daysAgo(2),
      visibility: 'public',
    },
    {
      createdAt: daysAgo(80),
      gameId: 'mtg',
      id: id('list'),
      name: 'Bulk rares',
      type: 'haves',
      updatedAt: daysAgo(9),
      visibility: 'private',
    },
    {
      createdAt: daysAgo(110),
      gameId: null,
      id: id('list'),
      name: 'Wishlist',
      type: 'wants',
      updatedAt: daysAgo(1),
      visibility: 'public',
    },
    {
      createdAt: daysAgo(40),
      gameId: 'mtg',
      id: id('list'),
      name: 'Commander upgrades',
      type: 'wants',
      updatedAt: daysAgo(5),
      visibility: 'private',
    },
  ]
  const [tradeBinder, bulkRares, wishlist, commanderUpgrades] = lists as [ListRecord, ListRecord, ListRecord, ListRecord]

  const items: ItemRecord[] = []
  const addItem = (section: BinderSection, listId: string | null, card: Card, options: Partial<ItemRecord> = {}) => {
    const record: ItemRecord = {
      cardId: card.id,
      condition: random.pick(['NM', 'NM', 'NM', 'EX', 'M', 'GD'] as const),
      finish: card.finishes.includes('foil') && random.chance(0.15) ? 'foil' : 'nonfoil',
      id: id('item'),
      language: random.chance(0.8) ? 'en' : random.pick(['it', 'de', 'ja', 'fr'] as const),
      listId,
      quantity: random.chance(0.75) ? 1 : random.int(2, 4),
      section,
      updatedAt: daysAgo(random.next() * 45),
      ...options,
    }
    items.push(record)
    return record
  }

  // Collection: cards from the viewer's games.
  const pool = cards.filter(card => profileGames.includes(card.gameId))
  const collection = random.sample(pool, 36).map(card => addItem('collection', null, card))

  // Haves: part of the collection, plus cards other traders are looking for (so matches exist).
  for (const record of random.sample(collection, 10)) {
    const card = requireCard(record.cardId)
    const list = card.gameId === 'mtg' && (card.rarity === 'rare' || card.rarity === 'mythic') ? bulkRares : tradeBinder
    addItem('haves', list.id, card, {
      condition: record.condition,
      finish: record.finish,
      language: record.language,
      quantity: 1,
    })
  }
  const tradeCityUsers = users.filter(user => user.citySlugs.some(slug => slug !== 'vigevano--italy'))
  const othersWant = random.sample(tradeItems.filter(item => item.listType === 'wants'), 10)
  for (const wanted of othersWant) {
    addItem('haves', tradeBinder.id, wanted.card, {
      finish: wanted.finish,
      quantity: 1,
    })
  }

  // Wants: cards on other traders' haves, Milan first so a Milan setup matches straight away.
  const partnersByPriority = [
    ...tradeCityUsers.filter(user => user.citySlugs.includes('milan--italy')),
    ...tradeCityUsers.filter(user => !user.citySlugs.includes('milan--italy')),
  ]
  const wantSources: TradeItem[] = []
  for (const user of partnersByPriority.slice(0, 10)) {
    wantSources.push(...random.sample(partnerItems(user.username, 'haves'), 2))
  }
  for (const source of wantSources) {
    const list = source.card.gameId === 'mtg' && random.chance(0.4) ? commanderUpgrades : wishlist
    addItem('wants', list.id, source.card, {
      condition: random.pick(['NM', 'EX', 'GD'] as const),
      finish: source.finish,
      language: 'en',
      quantity: 1,
    })
  }

  const state: WorkspaceState = {
    chats: [],
    decks: [],
    imports: [],
    items,
    lists,
    nextId: counter,
    notifications: [],
    owner,
    profile,
    trades: [],
  }

  seedConversations(state, wantSources, random)
  return state
}

function seedConversations(state: WorkspaceState, wantSources: TradeItem[], random: Random) {
  const me = state.owner.username
  const partners = [...new Set(wantSources.map(source => source.ownerUsername))]
    .filter(username => username !== me && usersByName.has(username))
  const [alice, bob, carol, dave] = partners
  const myHaves = state.items.filter(item => item.section === 'haves')

  const lineFromItem = (record: ItemRecord): TradeLine => {
    const card = requireCard(record.cardId)
    return {
      card,
      condition: record.condition,
      finish: record.finish,
      id: nextId(state, 'line'),
      language: record.language,
      marketPrice: priceOf(card, record.finish),
      price: priceOf(card, record.finish),
      quantity: 1,
      sourceId: record.id,
    }
  }
  const lineFromTradeItem = (item: TradeItem): TradeLine => ({
    card: item.card,
    condition: item.condition,
    finish: item.finish,
    id: nextId(state, 'line'),
    language: item.language,
    marketPrice: item.price,
    price: item.price,
    quantity: 1,
    sourceId: item.id,
  })
  const storeMeetup = (username: string): MeetupLocation | null => {
    const store = storesBySlug.get(usersByName.get(username)?.storeSlugs[0] ?? '')
    return store
      ? {
        address: store.address,
        kind: 'store',
        name: store.name,
        storeSlug: store.slug,
      }
      : null
  }
  const addChat = (partner: string, messages: (NewMessage & { sentAt: string })[], lastReadAt: string) => {
    const chatId = nextId(state, 'chat')
    state.chats.push({
      id: chatId,
      lastReadAt,
      messages: messages.map(message => ({
        ...message,
        chatId,
        id: nextId(state, 'msg'),
      })),
      partner,
    })
    return chatId
  }
  const addTrade = (trade: Omit<Trade, 'id' | 'chatId'>) => {
    const record = {
      ...trade,
      chatId: '',
      id: nextId(state, 'trade'),
    }
    state.trades.push(record)
    return record
  }
  const notify = (notification: Omit<AppNotification, 'id'>) => {
    state.notifications.push({
      ...notification,
      id: nextId(state, 'note'),
    })
  }

  // 1. Incoming proposal waiting for the viewer.
  if (alice) {
    const theirs = wantSources.filter(source => source.ownerUsername === alice).map(lineFromTradeItem)
    const mine = random.sample(myHaves, 1).map(lineFromItem)
    const difference = sum(theirs) - sum(mine)
    const trade = addTrade({
      awaiting: me,
      cancelledBy: null,
      cashAmount: Math.abs(Math.round(difference)) >= 2 ? Math.abs(Math.round(difference)) : 0,
      cashPayer: Math.abs(Math.round(difference)) >= 2 ? (difference > 0 ? me : alice) : null,
      createdAt: hoursAgo(1.9),
      meetAt: daysFromNow(3, 17),
      meetup: storeMeetup(alice),
      note: 'Can bring sleeves if you need them.',
      proposer: alice,
      proposerGives: theirs,
      recipient: me,
      recipientGives: mine,
      status: 'pending',
      updatedAt: hoursAgo(1.9),
    })
    trade.chatId = addChat(alice, [
      {
        author: alice,
        body: `Hey! Saw ${theirs.at(0)?.card.name ?? 'a card'} is on your wants — I have one for trade.`,
        kind: 'text',
        sentAt: hoursAgo(2),
      },
      {
        author: alice,
        kind: 'trade',
        sentAt: hoursAgo(1.9),
        tradeId: trade.id,
      },
    ], hoursAgo(3))
    notify({
      actor: alice,
      body: `Hey! Saw ${theirs.at(0)?.card.name ?? 'a card'} is on your wants…`,
      createdAt: hoursAgo(2),
      href: `/x/inbox/${trade.chatId}`,
      kind: 'message',
      readAt: null,
      title: `New message from ${alice}`,
    })
    notify({
      actor: alice,
      body: `${theirs.length + mine.length} cards · meet at ${trade.meetup?.name ?? 'a place to agree'}`,
      createdAt: hoursAgo(1.9),
      href: `/x/inbox/${trade.chatId}`,
      kind: 'trade',
      readAt: null,
      title: `${alice} sent you a trade proposal`,
    })
  }

  // 2. The viewer's proposal, already accepted.
  if (bob) {
    const theirs = wantSources.filter(source => source.ownerUsername === bob).slice(0, 1)
      .map(lineFromTradeItem)
    const mine = random.sample(myHaves, 2).map(lineFromItem)
    const trade = addTrade({
      awaiting: null,
      cancelledBy: null,
      cashAmount: 0,
      cashPayer: null,
      createdAt: daysAgo(2),
      meetAt: daysFromNow(1, 18),
      meetup: {
        address: 'Piazza del Duomo, Milan',
        kind: 'custom',
        name: 'Café next door',
      },
      note: '',
      proposer: me,
      proposerGives: mine,
      recipient: bob,
      recipientGives: theirs,
      status: 'accepted',
      updatedAt: daysAgo(1),
    })
    trade.chatId = addChat(bob, [
      {
        author: me,
        body: `Hi ${bob}, would you trade your ${theirs.at(0)?.card.name ?? 'card'}?`,
        kind: 'text',
        sentAt: daysAgo(2.01),
      },
      {
        author: me,
        kind: 'trade',
        sentAt: daysAgo(2),
        tradeId: trade.id,
      },
      {
        author: bob,
        body: 'accepted the trade',
        kind: 'event',
        sentAt: daysAgo(1),
      },
      {
        author: bob,
        body: 'Deal! See you there 🙌',
        kind: 'text',
        sentAt: daysAgo(0.99),
      },
    ], daysAgo(0.9))
    notify({
      actor: bob,
      body: 'Meet up and mark it completed once you have swapped cards.',
      createdAt: daysAgo(1),
      href: `/x/inbox/${trade.chatId}`,
      kind: 'trade',
      readAt: daysAgo(0.9),
      title: `${bob} accepted your trade`,
    })
  }

  // 3. A completed trade.
  if (carol) {
    const theirs = wantSources.filter(source => source.ownerUsername === carol).slice(0, 1)
      .map(lineFromTradeItem)
    const mine = random.sample(myHaves, 1).map(lineFromItem)
    const trade = addTrade({
      awaiting: null,
      cancelledBy: null,
      cashAmount: 2,
      cashPayer: me,
      createdAt: daysAgo(9),
      meetAt: daysAgo(6),
      meetup: storeMeetup(carol),
      note: '',
      proposer: carol,
      proposerGives: theirs,
      recipient: me,
      recipientGives: mine,
      status: 'completed',
      updatedAt: daysAgo(6),
    })
    trade.chatId = addChat(carol, [
      {
        author: carol,
        kind: 'trade',
        sentAt: daysAgo(9),
        tradeId: trade.id,
      },
      {
        author: me,
        body: 'accepted the trade',
        kind: 'event',
        sentAt: daysAgo(8),
      },
      {
        author: me,
        body: 'marked the trade as completed',
        kind: 'event',
        sentAt: daysAgo(6),
      },
      {
        author: carol,
        body: 'Thanks, pleasure trading with you!',
        kind: 'text',
        sentAt: daysAgo(5.9),
      },
    ], daysAgo(5))
    notify({
      actor: carol,
      body: 'Thanks, pleasure trading with you!',
      createdAt: daysAgo(5.9),
      href: `/x/inbox/${trade.chatId}`,
      kind: 'message',
      readAt: daysAgo(5),
      title: `New message from ${carol}`,
    })
  }

  // 4. A declined proposal.
  if (dave) {
    const theirs = wantSources.filter(source => source.ownerUsername === dave).slice(0, 1)
      .map(lineFromTradeItem)
    const mine = random.sample(myHaves, 1).map(lineFromItem)
    const trade = addTrade({
      awaiting: null,
      cancelledBy: dave,
      cashAmount: 0,
      cashPayer: null,
      createdAt: daysAgo(14),
      meetAt: null,
      meetup: storeMeetup(dave),
      note: '',
      proposer: me,
      proposerGives: mine,
      recipient: dave,
      recipientGives: theirs,
      status: 'cancelled',
      updatedAt: daysAgo(13),
    })
    trade.chatId = addChat(dave, [
      {
        author: me,
        body: `Is your ${theirs.at(0)?.card.name ?? 'card'} still available?`,
        kind: 'text',
        sentAt: daysAgo(14.01),
      },
      {
        author: me,
        kind: 'trade',
        sentAt: daysAgo(14),
        tradeId: trade.id,
      },
      {
        author: dave,
        body: 'declined the trade',
        kind: 'event',
        sentAt: daysAgo(13),
      },
      {
        author: dave,
        body: 'Sorry, I just promised it to someone at FNM.',
        kind: 'text',
        sentAt: daysAgo(13),
      },
    ], daysAgo(12))
  }

  // Match alerts.
  for (const [index, source] of wantSources.slice(0, 4).entries()) {
    notify({
      actor: source.ownerUsername,
      body: `${conditionLabels[source.condition]} · ${source.card.setName}`,
      createdAt: hoursAgo(5 + index * 20),
      href: `/users/${source.ownerUsername}`,
      kind: 'item-available',
      readAt: index < 2 ? null : hoursAgo(4),
      title: `${source.ownerUsername} has ${source.card.name} for trade`,
    })
  }
  const othersWanting = tradeItems
    .filter(item => item.listType === 'wants' && myHaves.some(record => cardsById.get(record.cardId)?.name === item.card.name))
    .slice(0, 3)
  for (const [index, wanted] of othersWanting.entries()) {
    notify({
      actor: wanted.ownerUsername,
      body: 'It is on your haves — start a trade.',
      createdAt: hoursAgo(9 + index * 30),
      href: `/users/${wanted.ownerUsername}`,
      kind: 'item-wanted',
      readAt: index === 0 ? null : hoursAgo(8),
      title: `${wanted.ownerUsername} is looking for ${wanted.card.name}`,
    })
  }
}

function nextId(state: WorkspaceState, prefix: string) {
  return `${prefix}-${state.nextId++}`
}

function sum(lines: Pick<TradeLine, 'price' | 'quantity'>[]) {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0)
}

// ---------------------------------------------------------------------------
// Binder facets
// ---------------------------------------------------------------------------

const binderFacets: FacetDefinition<BinderItem>[] = [
  {
    key: 'game',
    label: 'Games',
    labelFor: value => games.find(game => game.id === value)?.name ?? value,
    values: item => [item.card.gameId],
  },
  {
    key: 'set',
    label: 'Sets',
    labelFor: value => cards.find(card => card.setCode === value)?.setName ?? value,
    values: item => [item.card.setCode],
  },
  {
    key: 'condition',
    label: 'Condition',
    labelFor: value => labelFrom(conditionLabels, value),
    values: item => [item.condition],
  },
  {
    key: 'language',
    label: 'Language',
    labelFor: value => labelFrom(languageLabels, value),
    values: item => [item.language],
  },
  {
    key: 'finish',
    label: 'Finishes',
    labelFor: capitalise,
    values: item => [item.finish],
  },
  {
    key: 'rarity',
    label: 'Rarity',
    labelFor: capitalise,
    values: item => [item.card.rarity],
  },
]

/** Extra facets of the Collection section. */
const collectionFacets: FacetDefinition<BinderItem>[] = [
  {
    key: 'trade',
    label: 'Trade status',
    labelFor: value => (value === 'in-trade' ? 'In a trade' : 'Not in a trade'),
    values: item => [item.inTrade ? 'in-trade' : 'free'],
  },
  {
    key: 'listed',
    label: 'List status',
    labelFor: value => (value === 'listed' ? 'Listed in haves' : 'Unlisted'),
    values: item => [item.listed ? 'listed' : 'unlisted'],
  },
  ...binderFacets,
  {
    key: 'type',
    label: 'Types',
    values: item => [baseType(item.card)],
  },
  {
    key: 'artist',
    label: 'Artist',
    values: item => [item.card.artist],
  },
]

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

function createWorkspaceServices(state: WorkspaceState): WorkspaceServices {
  const me = state.owner.username
  const id = (prefix: string) => nextId(state, prefix)

  // -- binder ---------------------------------------------------------------

  const itemsInTrade = () => {
    const ids = new Set<string>()
    for (const trade of state.trades) {
      if (trade.status !== 'pending' && trade.status !== 'accepted') continue
      const mine = trade.proposer === me ? trade.proposerGives : trade.recipientGives
      for (const line of mine) ids.add(line.sourceId)
    }
    return ids
  }

  const toBinderItems = (records: ItemRecord[]): BinderItem[] => {
    const inTrade = itemsInTrade()
    const listedCards = new Set(state.items.filter(record => record.section === 'haves').map(record => record.cardId))
    return records.flatMap((record) => {
      const card = cardsById.get(record.cardId)
      if (!card) return []
      return [{
        card,
        condition: record.condition,
        finish: record.finish,
        id: record.id,
        inTrade: inTrade.has(record.id),
        language: record.language,
        listId: record.listId,
        listed: record.section === 'collection' && listedCards.has(record.cardId),
        price: priceOf(card, record.finish),
        quantity: record.quantity,
        section: record.section,
        updatedAt: record.updatedAt,
      }]
    })
  }

  const requireList = (listId: string) => {
    const list = state.lists.find(candidate => candidate.id === listId)
    if (!list) throw new Error('List not found')
    return list
  }

  /** Resolves the list an item goes to, creating a default list when the viewer has none. */
  const resolveList = (section: BinderSection, listId: string | null | undefined, card: Card) => {
    if (section === 'collection') return null
    if (listId) {
      const list = requireList(listId)
      if (list.type !== section) throw new Error(`${list.name} is a ${list.type} list`)
      if (list.gameId && list.gameId !== card.gameId) {
        throw new Error(`${list.name} only accepts ${games.find(game => game.id === list.gameId)?.name ?? list.gameId} cards`)
      }
      return list
    }
    const fallback = state.lists.find(list => list.type === section && (!list.gameId || list.gameId === card.gameId))
    if (fallback) return fallback
    const created: ListRecord = {
      createdAt: now(),
      gameId: null,
      id: id('list'),
      name: section === 'haves' ? 'My haves' : 'My wants',
      type: section,
      updatedAt: now(),
      visibility: 'public',
    }
    state.lists.push(created)
    return created
  }

  const touchList = (listId: string | null) => {
    const list = state.lists.find(candidate => candidate.id === listId)
    if (list) list.updatedAt = now()
  }

  const addRecords = (inputs: BinderItemInput[]) => {
    const touched: ItemRecord[] = []
    for (const input of inputs) {
      const card = requireCard(input.cardId)
      if (!isCondition(input.condition) || !isFinish(input.finish) || !isLanguage(input.language)) throw new Error('Invalid card details')
      const quantity = clampQuantity(input.quantity)
      const list = resolveList(input.section, input.listId, card)
      const existing = state.items.find(record =>
        record.section === input.section
        && record.listId === (list?.id ?? null)
        && record.cardId === card.id
        && record.finish === input.finish
        && record.condition === input.condition
        && record.language === input.language)
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY)
        existing.updatedAt = now()
        touched.push(existing)
      }
      else {
        const record: ItemRecord = {
          cardId: card.id,
          condition: input.condition,
          finish: input.finish,
          id: id('item'),
          language: input.language,
          listId: list?.id ?? null,
          quantity,
          section: input.section,
          updatedAt: now(),
        }
        state.items.push(record)
        touched.push(record)
      }
      touchList(list?.id ?? null)
    }
    return touched
  }

  const requireItem = (itemId: string) => {
    const record = state.items.find(candidate => candidate.id === itemId)
    if (!record) throw new Error('Card not found in your binder')
    return record
  }

  const requireImport = (importId: string) => {
    const draft = state.imports.find(candidate => candidate.id === importId)
    if (!draft) throw new Error('Import not found')
    return draft
  }

  const matchImportRow = (row: ParsedImportRow) => {
    const name = row.name.trim().toLowerCase()
    const setCode = row.setCode?.toLowerCase()
    const byPrinting = setCode && row.number
      ? cards.find(card => card.setCode.toLowerCase() === setCode && card.number === row.number)
      : undefined
    if (byPrinting) return byPrinting
    const named = cards.filter(card => card.name.toLowerCase() === name)
    const inSet = setCode ? named.find(card => card.setCode.toLowerCase() === setCode) : undefined
    return inSet ?? named.find(card => state.profile.games.includes(card.gameId)) ?? named.at(0) ?? null
  }

  // -- trades ---------------------------------------------------------------

  const requireTrade = (tradeId: string) => {
    const trade = state.trades.find(candidate => candidate.id === tradeId)
    if (!trade || (trade.proposer !== me && trade.recipient !== me)) throw new Error('Trade not found')
    return trade
  }

  const partnerOf = (trade: Trade) => (trade.proposer === me ? trade.recipient : trade.proposer)

  const requireChat = (chatId: string) => {
    const chat = state.chats.find(candidate => candidate.id === chatId)
    if (!chat) throw new Error('Conversation not found')
    return chat
  }

  const chatWith = (partner: string) => {
    if (partner === me) throw new Error('You cannot trade with yourself')
    participant(partner)
    let chat = state.chats.find(candidate => candidate.partner === partner)
    if (!chat) {
      chat = {
        id: id('chat'),
        lastReadAt: now(),
        messages: [],
        partner,
      }
      state.chats.push(chat)
    }
    return chat
  }

  const post = (chat: ChatRecord, message: NewMessage) => {
    chat.messages.push({
      ...message,
      chatId: chat.id,
      id: id('msg'),
      sentAt: now(),
    })
    if (message.author === me) chat.lastReadAt = now()
  }

  const notify = (notification: Omit<AppNotification, 'createdAt' | 'id' | 'readAt'>) => {
    state.notifications.push({
      ...notification,
      createdAt: now(),
      id: id('note'),
      readAt: null,
    })
  }

  /** Mock partners accept the viewer's proposals after PARTNER_REPLY_MS. */
  const runPartners = () => {
    const cutoff = Date.now() - PARTNER_REPLY_MS
    for (const trade of state.trades) {
      if (trade.status !== 'pending' || trade.proposer !== me || Date.parse(trade.updatedAt) > cutoff) continue
      const chat = state.chats.find(candidate => candidate.id === trade.chatId)
      if (!chat) continue
      trade.status = 'accepted'
      trade.awaiting = null
      trade.updatedAt = now()
      post(chat, {
        author: trade.recipient,
        body: 'accepted the trade',
        kind: 'event',
      })
      post(chat, {
        author: trade.recipient,
        body: 'Sounds good, see you there!',
        kind: 'text',
      })
      notify({
        actor: trade.recipient,
        body: 'Meet up and mark it completed once you have swapped cards.',
        href: `/x/inbox/${chat.id}`,
        kind: 'trade',
        title: `${trade.recipient} accepted your trade`,
      })
    }
  }

  const resolveDraft = (draft: TradeDraft) => {
    const partner = participant(draft.partner).username
    if (partner === me) throw new Error('You cannot trade with yourself')
    const give = draft.give.map((line): TradeLine => {
      const record = requireItem(line.sourceId)
      if (record.section === 'wants') throw new Error('Wanted cards cannot be offered')
      const card = requireCard(record.cardId)
      return {
        card,
        condition: record.condition,
        finish: record.finish,
        id: id('line'),
        language: record.language,
        marketPrice: priceOf(card, record.finish),
        price: validPrice(line, priceOf(card, record.finish)),
        quantity: Math.min(clampQuantity(line.quantity), record.quantity),
        sourceId: record.id,
      }
    })
    const theirHaves = partnerItems(partner, 'haves')
    const get = draft.get.map((line): TradeLine => {
      const item = theirHaves.find(candidate => candidate.id === line.sourceId)
      if (!item) throw new Error(`${partner} no longer has one of these cards`)
      return {
        card: item.card,
        condition: item.condition,
        finish: item.finish,
        id: id('line'),
        language: item.language,
        marketPrice: item.price,
        price: validPrice(line, item.price),
        quantity: Math.min(clampQuantity(line.quantity), item.quantity),
        sourceId: item.id,
      }
    })
    if (give.length + get.length === 0) throw new Error('Add at least one card to the trade')
    const cashAmount = draft.cash ? Math.round(draft.cash.amount * 100) / 100 : 0
    if (!Number.isFinite(cashAmount) || cashAmount < 0) throw new Error('Cash must be a positive amount')
    let meetup: MeetupLocation | null = null
    if (draft.meetup?.kind === 'store') {
      const store = storesBySlug.get(draft.meetup.storeSlug)
      if (!store) throw new Error('Store not found')
      meetup = {
        address: store.address,
        kind: 'store',
        name: store.name,
        storeSlug: store.slug,
      }
    }
    else if (draft.meetup?.kind === 'custom') {
      const name = draft.meetup.name.trim().slice(0, 80)
      if (!name) throw new Error('Name the meetup place')
      meetup = {
        address: draft.meetup.address.trim().slice(0, 160),
        kind: 'custom',
        name,
      }
    }
    if (draft.meetAt !== null && Number.isNaN(Date.parse(draft.meetAt))) throw new Error('Invalid meeting time')
    return {
      cashAmount,
      cashPayer: cashAmount > 0 && draft.cash ? (draft.cash.payer === 'me' ? me : partner) : null,
      get,
      give,
      meetAt: draft.meetAt,
      meetup,
      note: draft.note.trim().slice(0, 500),
      partner,
    }
  }

  /** Swaps the cards of a completed trade between the viewer's binder sections. */
  const applyCompletion = (trade: Trade) => {
    const given = trade.proposer === me ? trade.proposerGives : trade.recipientGives
    const received = trade.proposer === me ? trade.recipientGives : trade.proposerGives
    const decrement = (record: ItemRecord | undefined, quantity: number) => {
      if (!record) return
      record.quantity -= quantity
      record.updatedAt = now()
      if (record.quantity <= 0) state.items = state.items.filter(candidate => candidate !== record)
    }
    for (const line of given) {
      const source = state.items.find(record => record.id === line.sourceId)
      decrement(source, line.quantity)
      if (source?.section === 'haves') {
        decrement(state.items.find(record => record.section === 'collection' && record.cardId === line.card.id && record.finish === line.finish), line.quantity)
      }
    }
    for (const line of received) {
      addRecords([{
        cardId: line.card.id,
        condition: line.condition,
        finish: line.finish,
        language: line.language,
        quantity: line.quantity,
        section: 'collection',
      }])
      decrement(state.items.find(record => record.section === 'wants' && cardsById.get(record.cardId)?.name === line.card.name), line.quantity)
    }
  }

  // -- chat ---------------------------------------------------------------

  const summarise = (chat: ChatRecord): ChatSummary => {
    const lastMessage = chat.messages.at(-1) ?? null
    const latestTrade = state.trades
      .filter(trade => trade.chatId === chat.id)
      .sort((a, b) => compare(a.createdAt, b.createdAt, 'desc'))
      .at(0)
    return {
      id: chat.id,
      lastMessage,
      partner: participant(chat.partner),
      tradeStatus: latestTrade?.status ?? null,
      unread: chat.messages.filter(message => message.author !== me && message.sentAt > chat.lastReadAt).length,
      updatedAt: lastMessage?.sentAt ?? chat.lastReadAt,
    }
  }

  // -- profile ------------------------------------------------------------

  const requireStore = (storeSlug: string) => {
    const store = storesBySlug.get(storeSlug)
    if (!store) throw new Error('Store not found')
    return store
  }

  const deckFromInput = (input: DeckInput, existing?: OwnedDeck): OwnedDeck => {
    const name = input.name.trim().slice(0, 80)
    if (!name) throw new Error('Give the deck a name')
    const game = games.find(candidate => candidate.id === input.gameId)
    if (!game) throw new Error('Unknown game')
    return {
      cards: input.cards.slice(0, 500).map((entry) => {
        if (!deckSections.has(entry.section)) throw new Error('Unknown deck section')
        return {
          card: requireCard(entry.cardId),
          quantity: clampQuantity(entry.quantity),
          section: entry.section,
        }
      }),
      commentCount: existing?.commentCount ?? 0,
      description: input.description.trim().slice(0, 2000),
      format: input.format,
      gameId: game.id,
      id: existing?.id ?? id('deck'),
      likes: existing?.likes ?? 0,
      name,
      ownerUsername: me,
      updatedAt: now(),
      visibility: input.visibility === 'private' ? 'private' : 'public',
    }
  }

  const listRecordToList = (list: ListRecord): TradeList => ({
    ...list,
    cardCount: state.items
      .filter(record => record.listId === list.id)
      .reduce((total, record) => total + record.quantity, 0),
  })

  const validateListInput = (input: Partial<TradeListInput>) => {
    if (input.name !== undefined && !input.name.trim()) throw new Error('Give the list a name')
    if (input.gameId && !games.some(game => game.id === input.gameId)) throw new Error('Unknown game')
  }

  return {
    binder: {
      addItems: async (inputs) => {
        const ids = new Set(addRecords(inputs).map(record => record.id))
        return toBinderItems(state.items.filter(record => ids.has(record.id)))
      },
      commitImport: async (importId) => {
        const draft = requireImport(importId)
        if (draft.committedAt) throw new Error('This import was already confirmed')
        const rows = draft.rows.filter(row => row.include && row.card)
        addRecords(rows.flatMap(row => (row.card
          ? [{
            cardId: row.card.id,
            condition: row.condition ?? 'NM',
            finish: row.card.finishes.includes(row.finish) ? row.finish : 'nonfoil',
            language: row.language ?? 'en',
            listId: draft.listId,
            quantity: row.quantity,
            section: draft.section,
          }]
          : [])))
        draft.committedAt = now()
        draft.importedCount = rows.reduce((total, row) => total + row.quantity, 0)
        return draft
      },
      createImport: async (input) => {
        if (input.rows.length === 0) throw new Error('Nothing to import')
        if (input.section !== 'collection' && input.listId) requireList(input.listId)
        const draft: BinderImport = {
          committedAt: null,
          createdAt: now(),
          id: id('import'),
          importedCount: 0,
          listId: input.section === 'collection' ? null : input.listId,
          rows: input.rows.slice(0, 1000).map((row) => {
            const card = matchImportRow(row)
            return {
              ...row,
              card,
              include: card !== null,
              quantity: clampQuantity(row.quantity),
            }
          }),
          section: input.section,
          source: input.source,
        }
        state.imports.push(draft)
        return draft
      },
      getCounts: async () => {
        const counts = {
          collection: 0,
          haves: 0,
          wants: 0,
        }
        for (const record of state.items) counts[record.section] += record.quantity
        return counts
      },
      getImport: async importId => state.imports.find(draft => draft.id === importId) ?? null,
      getOwnership: async (cardIds) => {
        const result: Partial<Record<string, Ownership>> = {}
        for (const cardId of cardIds) {
          const card = cardsById.get(cardId)
          if (!card) continue
          const ownership: Ownership = {
            collection: 0,
            haves: 0,
            wants: 0,
          }
          for (const record of state.items) {
            const other = cardsById.get(record.cardId)
            if (other && cardKey(other) === cardKey(card)) ownership[record.section] += record.quantity
          }
          result[cardId] = ownership
        }
        return result
      },
      listItems: async ({ facets, listId, order = 'desc', q, section, sort = 'updated' }) => {
        const scoped = toBinderItems(state.items.filter(record => record.section === section && (!listId || record.listId === listId)))
        const definitions = section === 'collection' ? collectionFacets : binderFacets
        const filtered = scoped
          .filter(item => matchesText(`${item.card.name} ${item.card.setName}`, q) && matchesFacets(item, definitions, facets))
          .sort((a, b) => {
            switch (sort) {
              case 'name': return compare(a.card.name, b.card.name, order)
              case 'price': return compare(a.price, b.price, order)
              case 'quantity': return compare(a.quantity, b.quantity, order)
              case 'updated': return compare(a.updatedAt, b.updatedAt, order)
            }
          })
        return {
          facets: buildFacets(scoped, definitions),
          items: filtered,
          stats: {
            cards: scoped.reduce((total, item) => total + item.quantity, 0),
            distinct: scoped.length,
            marketValue: Math.round(scoped.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100,
          },
          total: filtered.length,
        }
      },
      moveItems: async (itemIds, target) => {
        // Resolve every destination first so a rejected card leaves the whole selection untouched.
        const moves = itemIds.map((itemId) => {
          const record = requireItem(itemId)
          return {
            list: resolveList(target.section, target.listId, requireCard(record.cardId)),
            record,
          }
        })
        for (const { list, record } of moves) {
          touchList(record.listId)
          record.section = target.section
          record.listId = list?.id ?? null
          record.updatedAt = now()
          touchList(record.listId)
        }
      },
      removeItems: async (itemIds) => {
        const ids = new Set(itemIds)
        for (const record of state.items) {
          if (ids.has(record.id)) touchList(record.listId)
        }
        state.items = state.items.filter(record => !ids.has(record.id))
      },
      updateImportRow: async (importId, line, patch) => {
        const draft = requireImport(importId)
        if (draft.committedAt) throw new Error('This import was already confirmed')
        const row = draft.rows.find(candidate => candidate.line === line)
        if (!row) throw new Error('Row not found')
        if (patch.cardId) {
          row.card = requireCard(patch.cardId)
          row.include = true
        }
        if (patch.include !== undefined) row.include = patch.include && row.card !== null
        return draft
      },
      updateItem: async (itemId, patch) => {
        const record = requireItem(itemId)
        const card = requireCard(record.cardId)
        if (patch.condition !== undefined) {
          if (!isCondition(patch.condition)) throw new Error('Invalid condition')
          record.condition = patch.condition
        }
        if (patch.finish !== undefined) {
          if (!card.finishes.includes(patch.finish)) throw new Error(`${card.name} has no ${patch.finish} printing`)
          record.finish = patch.finish
        }
        if (patch.language !== undefined) {
          if (!isLanguage(patch.language)) throw new Error('Invalid language')
          record.language = patch.language
        }
        if (patch.quantity !== undefined) record.quantity = clampQuantity(patch.quantity)
        if (patch.listId !== undefined && record.section !== 'collection') {
          record.listId = resolveList(record.section, patch.listId, card)?.id ?? null
        }
        record.updatedAt = now()
        touchList(record.listId)
        const item = toBinderItems([record]).at(0)
        if (!item) throw new Error('Card not found')
        return item
      },
    },

    chat: {
      getThread: async (chatId) => {
        runPartners()
        const chat = state.chats.find(candidate => candidate.id === chatId)
        if (!chat) return null
        const tradeIds = new Set(chat.messages.flatMap(message => (message.kind === 'trade' ? [message.tradeId] : [])))
        return {
          chat: summarise(chat),
          messages: chat.messages,
          trades: Object.fromEntries(state.trades.filter(trade => tradeIds.has(trade.id)).map(trade => [trade.id, trade])),
        }
      },
      listChats: async () => {
        runPartners()
        return state.chats
          .map(summarise)
          .sort((a, b) => compare(a.updatedAt, b.updatedAt, 'desc'))
      },
      markRead: async (chatId) => {
        const chat = requireChat(chatId)
        chat.lastReadAt = now()
        for (const notification of state.notifications) {
          if (!notification.readAt && notification.href === `/x/inbox/${chatId}`) notification.readAt = now()
        }
      },
      openChat: async partner => summarise(chatWith(partner)),
      sendMessage: async (chatId, body) => {
        const text = body.trim().slice(0, 2000)
        if (!text) throw new Error('Write a message first')
        post(requireChat(chatId), {
          author: me,
          body: text,
          kind: 'text',
        })
      },
    },

    deckBuilder: {
      create: async (input) => {
        const deck = deckFromInput(input)
        state.decks.push(deck)
        return deck
      },
      getMine: async deckId => state.decks.find(deck => deck.id === deckId) ?? null,
      listMine: async () => [...state.decks].sort((a, b) => compare(a.updatedAt, b.updatedAt, 'desc')),
      remove: async (deckId) => {
        state.decks = state.decks.filter(deck => deck.id !== deckId)
      },
      update: async (deckId, input) => {
        const existing = state.decks.find(deck => deck.id === deckId)
        if (!existing) throw new Error('Deck not found')
        const deck = deckFromInput(input, existing)
        state.decks = state.decks.map(candidate => (candidate === existing ? deck : candidate))
        return deck
      },
    },

    lists: {
      create: async (input) => {
        validateListInput(input)
        const list: ListRecord = {
          createdAt: now(),
          gameId: input.gameId,
          id: id('list'),
          name: input.name.trim().slice(0, 60),
          type: input.type === 'wants' ? 'wants' : 'haves',
          updatedAt: now(),
          visibility: input.visibility === 'private' ? 'private' : 'public',
        }
        state.lists.push(list)
        return listRecordToList(list)
      },
      list: async ({ order = 'desc', q, sort = 'updated', type } = {}) => state.lists
        .filter(list => (!type || list.type === type) && matchesText(list.name, q))
        .map(listRecordToList)
        .sort((a, b) => {
          switch (sort) {
            case 'name': return compare(a.name, b.name, order)
            case 'created': return compare(a.createdAt, b.createdAt, order)
            case 'updated': return compare(a.updatedAt, b.updatedAt, order)
          }
        }),
      remove: async (listId) => {
        requireList(listId)
        state.lists = state.lists.filter(list => list.id !== listId)
        state.items = state.items.filter(record => record.listId !== listId)
      },
      update: async (listId, patch) => {
        validateListInput(patch)
        const list = requireList(listId)
        if (patch.type && patch.type !== list.type) throw new Error('A list cannot change between haves and wants')
        if (patch.gameId) {
          const otherGame = state.items.some(record => record.listId === listId && cardsById.get(record.cardId)?.gameId !== patch.gameId)
          if (otherGame) throw new Error('The list has cards from other games')
        }
        if (patch.name !== undefined) list.name = patch.name.trim().slice(0, 60)
        if (patch.gameId !== undefined) list.gameId = patch.gameId
        if (patch.visibility !== undefined) list.visibility = patch.visibility === 'private' ? 'private' : 'public'
        list.updatedAt = now()
        return listRecordToList(list)
      },
    },

    notifications: {
      getUnreadCounts: async () => {
        runPartners()
        return {
          messages: state.chats.reduce((total, chat) => total + summarise(chat).unread, 0),
          notifications: state.notifications.filter(notification => !notification.readAt).length,
        }
      },
      list: async ({ kind, status } = {}) => {
        runPartners()
        const byKind: Record<NotificationKind, number> = {
          'item-available': 0,
          'item-wanted': 0,
          'message': 0,
          'trade': 0,
        }
        for (const notification of state.notifications) byKind[notification.kind]++
        return {
          counts: {
            byKind,
            total: state.notifications.length,
            unread: state.notifications.filter(notification => !notification.readAt).length,
          },
          items: state.notifications
            .filter(notification =>
              (!kind || notification.kind === kind)
              && (!status || (status === 'unread' ? !notification.readAt : Boolean(notification.readAt))))
            .sort((a, b) => compare(a.createdAt, b.createdAt, 'desc')),
        }
      },
      markAllRead: async () => {
        for (const notification of state.notifications) notification.readAt ??= now()
      },
      markRead: async (notificationIds) => {
        const ids = new Set(notificationIds)
        for (const notification of state.notifications) {
          if (ids.has(notification.id)) notification.readAt ??= now()
        }
      },
    },

    profile: {
      completeOnboarding: async ({ citySlug, showStoresOnProfile, storeSlugs }) => {
        if (!cities.some(city => city.slug === citySlug)) throw new Error('Pick your city')
        const unique = [...new Set(storeSlugs)]
        if (unique.length > viewerLimits.tradingStores) throw new Error(`Pick up to ${viewerLimits.tradingStores} stores`)
        unique.forEach(requireStore)
        Object.assign(state.profile, {
          citySlug,
          onboardedAt: state.profile.onboardedAt ?? now(),
          showStoresOnProfile,
          storeSlugs: unique,
        })
        return state.profile
      },
      get: async () => state.profile,
      joinStore: async (storeSlug) => {
        const store = requireStore(storeSlug)
        if (state.profile.storeSlugs.includes(store.slug)) return state.profile
        if (state.profile.storeSlugs.length >= viewerLimits.tradingStores) {
          throw new Error(`You can trade at up to ${viewerLimits.tradingStores} stores. Leave one first.`)
        }
        state.profile.storeSlugs = [...state.profile.storeSlugs, store.slug]
        state.profile.citySlug ??= store.citySlug
        return state.profile
      },
      leaveStore: async (storeSlug) => {
        state.profile.storeSlugs = state.profile.storeSlugs.filter(slug => slug !== storeSlug)
        return state.profile
      },
      update: async (patch) => {
        if (patch.displayName !== undefined) {
          const displayName = patch.displayName.trim().slice(0, 40)
          if (!displayName) throw new Error('Display name cannot be empty')
          state.profile.displayName = displayName
        }
        if (patch.bio !== undefined) state.profile.bio = patch.bio.trim().slice(0, 280)
        if (patch.avatarHue !== undefined) state.profile.avatarHue = Math.min(360, Math.max(0, Math.round(patch.avatarHue)))
        if (patch.citySlug !== undefined) {
          if (patch.citySlug !== null && !cities.some(city => city.slug === patch.citySlug)) throw new Error('City not found')
          state.profile.citySlug = patch.citySlug
        }
        if (patch.showStoresOnProfile !== undefined) state.profile.showStoresOnProfile = patch.showStoresOnProfile
        if (patch.games !== undefined) {
          const valid = patch.games.filter(gameId => games.some(game => game.id === gameId))
          if (valid.length === 0) throw new Error('Pick at least one game')
          state.profile.games = [...new Set(valid)]
        }
        if (patch.pricingSource !== undefined) {
          state.profile.pricingSource = patch.pricingSource === 'tcgplayer-usd' ? 'tcgplayer-usd' : 'cardmarket-eur'
        }
        if (patch.meetingPlaces !== undefined) {
          state.profile.meetingPlaces = patch.meetingPlaces.map(place => place.trim().slice(0, 60)).filter(Boolean)
            .slice(0, 5)
        }
        return state.profile
      },
      updateStoreSettings: async (storeSlug, settings) => {
        if (!state.profile.storeSlugs.includes(storeSlug)) throw new Error('Join the store first')
        state.profile.storeSettings = {
          ...state.profile.storeSettings,
          [storeSlug]: { notifyMatches: settings.notifyMatches },
        }
        return state.profile
      },
    },

    trades: {
      accept: async (tradeId) => {
        const trade = requireTrade(tradeId)
        if (trade.status !== 'pending' || trade.awaiting !== me) throw new Error('This trade is not waiting for you')
        trade.status = 'accepted'
        trade.awaiting = null
        trade.updatedAt = now()
        post(requireChat(trade.chatId), {
          author: me,
          body: 'accepted the trade',
          kind: 'event',
        })
        return trade
      },
      cancel: async (tradeId) => {
        const trade = requireTrade(tradeId)
        if (trade.status !== 'pending' && trade.status !== 'accepted') throw new Error('This trade is already closed')
        const declined = trade.status === 'pending' && trade.awaiting === me
        trade.status = 'cancelled'
        trade.cancelledBy = me
        trade.awaiting = null
        trade.updatedAt = now()
        post(requireChat(trade.chatId), {
          author: me,
          body: declined ? 'declined the trade' : 'cancelled the trade',
          kind: 'event',
        })
        return trade
      },
      complete: async (tradeId) => {
        const trade = requireTrade(tradeId)
        if (trade.status !== 'accepted') throw new Error('Only accepted trades can be completed')
        trade.status = 'completed'
        trade.updatedAt = now()
        applyCompletion(trade)
        post(requireChat(trade.chatId), {
          author: me,
          body: 'marked the trade as completed',
          kind: 'event',
        })
        return trade
      },
      getContext: async (partnerName) => {
        const partner = participant(partnerName)
        if (partner.username === me) throw new Error('You cannot trade with yourself')
        const myItems = toBinderItems(state.items.filter(record => record.section !== 'wants'))
        const partnerHaves = partnerItems(partner.username, 'haves')
        const partnerWants = partnerItems(partner.username, 'wants')
        const myWants = new Set(toBinderItems(state.items.filter(record => record.section === 'wants')).map(item => cardKey(item.card)))
        const theirWants = new Set(partnerWants.map(item => cardKey(item.card)))
        const user = usersByName.get(partner.username)
        return {
          meetingPlaces: [...new Set([...state.profile.meetingPlaces, ...(user?.meetingPlaces ?? [])])],
          myItems,
          partner,
          partnerHaves,
          partnerWants,
          sharedStores: partner.storeSlugs
            .filter(slug => state.profile.storeSlugs.includes(slug))
            .flatMap(slug => storesBySlug.get(slug) ?? []),
          suggestedGet: partnerHaves.filter(item => myWants.has(cardKey(item.card))).map(item => item.id),
          suggestedGive: myItems.filter(item => item.section === 'haves' && theirWants.has(cardKey(item.card))).map(item => item.id),
        }
      },
      listMatches: async ({ citySlug, storeSlug } = {}) => {
        const myWants = new Set(toBinderItems(state.items.filter(record => record.section === 'wants')).map(item => cardKey(item.card)))
        const myHaves = toBinderItems(state.items.filter(record => record.section === 'haves'))
        const candidates = [...usersByName.values()].filter((user) => {
          if (user.username === me) return false
          if (storeSlug) return user.storeSlugs.includes(storeSlug)
          if (citySlug) return user.citySlugs.includes(citySlug)
          return user.storeSlugs.some(slug => state.profile.storeSlugs.includes(slug))
        })
        return candidates
          .map((user) => {
            const theirWants = new Set(partnerItems(user.username, 'wants').map(item => cardKey(item.card)))
            return {
              citySlug: user.citySlugs[0] ?? '',
              partner: participant(user.username),
              sharedStoreSlugs: user.storeSlugs.filter(slug => state.profile.storeSlugs.includes(slug)),
              theyHave: partnerItems(user.username, 'haves').filter(item => myWants.has(cardKey(item.card))),
              theyWant: myHaves.filter(item => theirWants.has(cardKey(item.card))),
            }
          })
          .filter(match => match.theyHave.length + match.theyWant.length > 0)
          .sort((a, b) => (b.theyHave.length + b.theyWant.length) - (a.theyHave.length + a.theyWant.length))
      },
      propose: async (draft) => {
        const resolved = resolveDraft(draft)
        const chat = chatWith(resolved.partner)
        const trade: Trade = {
          awaiting: resolved.partner,
          cancelledBy: null,
          cashAmount: resolved.cashAmount,
          cashPayer: resolved.cashPayer,
          chatId: chat.id,
          createdAt: now(),
          id: id('trade'),
          meetAt: resolved.meetAt,
          meetup: resolved.meetup,
          note: resolved.note,
          proposer: me,
          proposerGives: resolved.give,
          recipient: resolved.partner,
          recipientGives: resolved.get,
          status: 'pending',
          updatedAt: now(),
        }
        state.trades.push(trade)
        post(chat, {
          author: me,
          kind: 'trade',
          tradeId: trade.id,
        })
        return trade
      },
      revise: async (tradeId, draft) => {
        const trade = requireTrade(tradeId)
        if (trade.status !== 'pending') throw new Error('Only pending trades can be changed')
        const partner = partnerOf(trade)
        const resolved = resolveDraft({
          ...draft,
          partner,
        })
        const countering = trade.awaiting === me
        Object.assign(trade, {
          awaiting: partner,
          cashAmount: resolved.cashAmount,
          cashPayer: resolved.cashPayer,
          meetAt: resolved.meetAt,
          meetup: resolved.meetup,
          note: resolved.note,
          proposer: me,
          proposerGives: resolved.give,
          recipient: partner,
          recipientGives: resolved.get,
          updatedAt: now(),
        } satisfies Partial<Trade>)
        // Re-post the card at the bottom of the conversation so the latest terms are in view.
        const chat = requireChat(trade.chatId)
        chat.messages = chat.messages.filter(message => !(message.kind === 'trade' && message.tradeId === trade.id))
        post(chat, {
          author: me,
          body: countering ? 'sent a counter-offer' : 'updated the proposal',
          kind: 'event',
        })
        post(chat, {
          author: me,
          kind: 'trade',
          tradeId: trade.id,
        })
        return trade
      },
    },
  }
}

function validPrice(line: TradeDraftLine, fallback: number) {
  return Number.isFinite(line.price) && line.price >= 0 ? Math.round(line.price * 100) / 100 : fallback
}
