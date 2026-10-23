import type {
  AppNotification,
  Printing,
  GameId,
  MeetupLocation,
  Trade,
  TradeItem,
  TradeLine,
  UserId,
  WorkspaceProfile,
} from '../../types'
import { printings, cities, stores } from '../data'
import { createRandom, daysAgo, MOCK_NOW } from '../random'
import type { Random } from '../random'
import { hashString, listedItems, priceOf, storesBySlug, usernameOf } from '../store'
import type { CollectionRecord, ItemRecord, ListRecord, MockStore, TraderRecord, WantRecord } from '../store'

import { requirePrinting, traderContext } from './context'
import type { NewMessage, TraderContext } from './context'

import { isHave, tradeValue } from '#/domain'
import { conditionLabels } from '#/lib/cardOptions'

/**
 * Seeds a signed-in Trader into the store on first access: a Binder that
 * matches the seeded Traders, and a few conversations covering every Trade
 * state.
 */

export interface WorkspaceOwner {
  id: string
  username: string
  /**
   * Fixtures only: seed the Trader as already onboarded, with a City and
   * Stores. The app never passes it; a signed-in Trader is onboarded only by
   * `profile.completeOnboarding`.
   */
  onboarded?: boolean
}

function hoursAgo(hours: number) {
  return new Date(MOCK_NOW - hours * 3_600_000).toISOString()
}

function daysFromNow(days: number, hour: number) {
  const date = new Date(MOCK_NOW + days * 86_400_000)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString()
}

export function seedTrader(store: MockStore, owner: WorkspaceOwner): TraderRecord {
  const random = createRandom(hashString(owner.id))
  const id = (prefix: string) => `${prefix}-${store.nextId++}`

  const milan = cities.find(city => city.slug === 'milan--italy')
  const milanStores = stores
    .filter(candidate => candidate.citySlug === milan?.slug)
    .sort((a, b) => b.traderCount - a.traderCount)
  const profileGames: GameId[] = ['mtg', random.pick(['onepiece', 'lorcana', 'riftbound'] as const)]

  const profile: WorkspaceProfile = {
    avatarHue: random.int(0, 360),
    bio: '',
    citySlug: owner.onboarded ? (milan?.slug ?? null) : null,
    displayName: owner.username,
    games: profileGames,
    meetingPlaces: ['Café next door'],
    onboardedAt: owner.onboarded ? daysAgo(30) : null,
    pricingSource: 'cardmarket-eur',
    showStoresOnProfile: true,
    storeSettings: {},
    storeSlugs: owner.onboarded ? milanStores.slice(0, 2).map(candidate => candidate.slug) : [],
    username: owner.username,
  }

  const lists: ListRecord[] = [
    {
      createdAt: daysAgo(120),
      gameId: null,
      id: id('list'),
      isDefault: true,
      name: 'Trade binder',
      type: 'haves',
      updatedAt: daysAgo(2),
      visibility: 'public',
    },
    {
      createdAt: daysAgo(80),
      gameId: 'mtg',
      id: id('list'),
      isDefault: false,
      name: 'Bulk rares',
      type: 'haves',
      updatedAt: daysAgo(9),
      visibility: 'private',
    },
    {
      createdAt: daysAgo(110),
      gameId: null,
      id: id('list'),
      isDefault: true,
      name: 'Wishlist',
      type: 'wants',
      updatedAt: daysAgo(1),
      visibility: 'public',
    },
    {
      createdAt: daysAgo(40),
      gameId: 'mtg',
      id: id('list'),
      isDefault: false,
      name: 'Commander upgrades',
      type: 'wants',
      updatedAt: daysAgo(5),
      visibility: 'private',
    },
  ]
  const [tradeBinder, bulkRares, wishlist, commanderUpgrades] = lists as [ListRecord, ListRecord, ListRecord, ListRecord]

  const items: ItemRecord[] = []
  const randomDetails = (card: Printing) => ({
    cardId: card.id,
    condition: random.pick(['NM', 'NM', 'NM', 'EX', 'M', 'GD'] as const),
    finish: card.finishes.includes('foil') && random.chance(0.15) ? 'foil' as const : 'nonfoil' as const,
    id: id('item'),
    language: random.chance(0.8) ? 'en' as const : random.pick(['it', 'de', 'ja', 'fr'] as const),
    quantity: random.chance(0.75) ? 1 : random.int(2, 4),
    updatedAt: daysAgo(random.next() * 45),
  })
  const addEntry = (card: Printing, options: Partial<CollectionRecord> = {}) => {
    const record: CollectionRecord = {
      ...randomDetails(card),
      forTradeQuantity: 0,
      kind: 'collection',
      listId: tradeBinder.id,
      ...options,
    }
    items.push(record)
    return record
  }
  const addWant = (card: Printing, listId: string, options: Partial<WantRecord> = {}) => {
    items.push({
      ...randomDetails(card),
      kind: 'want',
      listId,
      ...options,
    })
  }

  // Collection: cards from the Trader's games.
  const pool = printings.filter(card => profileGames.includes(card.gameId))
  const collection = random.sample(pool, 36).map(card => addEntry(card))

  // Haves: one copy of part of the Collection marked for trade, plus cards other Traders are looking for (so matches exist).
  for (const record of random.sample(collection, 10)) {
    const card = requirePrinting(record.cardId)
    const list = card.gameId === 'mtg' && (card.rarity === 'rare' || card.rarity === 'mythic') ? bulkRares : tradeBinder
    record.forTradeQuantity = 1
    record.listId = list.id
  }
  const others = [...store.traders.values()]
  const tradeCityTraders = others.filter(trader => trader.profile.citySlug && trader.profile.citySlug !== 'vigevano--italy')
  const othersWant = random.sample(listedItems(store, 'wants'), 10)
  for (const wanted of othersWant) {
    addEntry(wanted.card, {
      finish: wanted.finish,
      forTradeQuantity: 1,
      listId: tradeBinder.id,
      quantity: 1,
    })
  }

  // Wants: cards on other Traders' Haves, Milan first so a Milan setup matches straight away.
  const partnersByPriority = [
    ...tradeCityTraders.filter(trader => trader.profile.citySlug === 'milan--italy'),
    ...tradeCityTraders.filter(trader => trader.profile.citySlug !== 'milan--italy'),
  ]
  const wantSources: TradeItem[] = []
  for (const partner of partnersByPriority.slice(0, 10)) {
    wantSources.push(...random.sample(listedItems(store, 'haves', partner), 2))
  }
  for (const source of wantSources) {
    const list = source.card.gameId === 'mtg' && random.chance(0.4) ? commanderUpgrades : wishlist
    addWant(source.card, list.id, {
      condition: random.pick(['NM', 'EX', 'GD'] as const),
      finish: source.finish,
      language: 'en',
      quantity: 1,
    })
  }

  const trader: TraderRecord = {
    badges: [],
    decks: [],
    id: owner.id,
    imports: [],
    items,
    lists,
    memberSince: profile.onboardedAt ?? new Date().toISOString(),
    notifications: [],
    pastCompletedTrades: 0,
    profile,
  }
  store.traders.set(owner.id, trader)
  seedConversations(traderContext(store, trader), wantSources, random)
  return trader
}

function seedConversations(ctx: TraderContext, wantSources: TradeItem[], random: Random) {
  const { me, store, trader } = ctx
  const partners = [...new Set(wantSources.map(source => source.ownerId))]
    .filter(id => id !== me && store.traders.has(id))
  const [alice, bob, carol, dave] = partners
  const myHaves = trader.items.filter(item => item.kind === 'collection' && isHave(item))

  const lineFromItem = (record: ItemRecord): TradeLine => {
    const card = requirePrinting(record.cardId)
    return {
      card,
      condition: record.condition,
      finish: record.finish,
      id: ctx.id('line'),
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
    id: ctx.id('line'),
    language: item.language,
    marketPrice: item.price,
    price: item.price,
    quantity: 1,
    sourceId: item.id,
  })
  const storeMeetup = (partner: UserId): MeetupLocation | null => {
    const meetupStore = storesBySlug.get(store.traders.get(partner)?.profile.storeSlugs[0] ?? '')
    return meetupStore
      ? {
        address: meetupStore.address,
        kind: 'store',
        name: meetupStore.name,
        storeSlug: meetupStore.slug,
      }
      : null
  }
  const addChat = (partner: UserId, messages: (NewMessage & { sentAt: string })[], lastReadAt: string) => {
    const chatId = ctx.id('chat')
    store.chats.push({
      id: chatId,
      lastReadAt: {
        [me]: lastReadAt,
        [partner]: messages.at(-1)?.sentAt ?? lastReadAt,
      },
      messages: messages.map(message => ({
        ...message,
        chatId,
        id: ctx.id('msg'),
      })),
      traders: [me, partner],
    })
    return chatId
  }
  const addTrade = (trade: Omit<Trade, 'id' | 'chatId'>) => {
    const record = {
      ...trade,
      chatId: '',
      id: ctx.id('trade'),
    }
    store.trades.push(record)
    return record
  }
  const notify = (notification: Omit<AppNotification, 'id'>) => {
    trader.notifications.push({
      ...notification,
      id: ctx.id('note'),
    })
  }

  // 1. Incoming proposal waiting for the Trader.
  if (alice) {
    const theirs = wantSources.filter(source => source.ownerId === alice).map(lineFromTradeItem)
    const mine = random.sample(myHaves, 1).map(lineFromItem)
    const difference = tradeValue(theirs) - tradeValue(mine)
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
      title: `New message from ${usernameOf(store, alice)}`,
    })
    notify({
      actor: alice,
      body: `${theirs.length + mine.length} cards · meet at ${trade.meetup?.name ?? 'a place to agree'}`,
      createdAt: hoursAgo(1.9),
      href: `/x/inbox/${trade.chatId}`,
      kind: 'trade',
      readAt: null,
      title: `${usernameOf(store, alice)} sent you a trade proposal`,
    })
  }

  // 2. The Trader's proposal, already accepted.
  if (bob) {
    const theirs = wantSources.filter(source => source.ownerId === bob).slice(0, 1)
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
        body: `Hi ${usernameOf(store, bob)}, would you trade your ${theirs.at(0)?.card.name ?? 'card'}?`,
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
      title: `${usernameOf(store, bob)} accepted your trade`,
    })
  }

  // 3. A completed trade.
  if (carol) {
    const theirs = wantSources.filter(source => source.ownerId === carol).slice(0, 1)
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
      title: `New message from ${usernameOf(store, carol)}`,
    })
  }

  // 4. A declined proposal.
  if (dave) {
    const theirs = wantSources.filter(source => source.ownerId === dave).slice(0, 1)
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
      actor: source.ownerId,
      body: `${conditionLabels[source.condition]} · ${source.card.setName}`,
      createdAt: hoursAgo(5 + index * 20),
      href: `/users/${source.ownerUsername}`,
      kind: 'item-available',
      readAt: index < 2 ? null : hoursAgo(4),
      title: `${source.ownerUsername} has ${source.card.name} for trade`,
    })
  }
  const myHaveNames = new Set(myHaves.map(record => requirePrinting(record.cardId).name))
  const othersWanting = listedItems(store, 'wants')
    .filter(item => item.ownerId !== me && myHaveNames.has(item.card.name))
    .slice(0, 3)
  for (const [index, wanted] of othersWanting.entries()) {
    notify({
      actor: wanted.ownerId,
      body: 'It is on your haves — start a trade.',
      createdAt: hoursAgo(9 + index * 30),
      href: `/users/${wanted.ownerUsername}`,
      kind: 'item-wanted',
      readAt: index === 0 ? null : hoursAgo(8),
      title: `${wanted.ownerUsername} is looking for ${wanted.card.name}`,
    })
  }
}
