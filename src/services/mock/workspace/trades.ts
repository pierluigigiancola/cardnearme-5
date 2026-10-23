import type { TradesService } from '../../services'
import type { MeetupLocation, Trade, TradeDraft, TradeLine } from '../../types'
import { participant, priceOf, requireTrader, storesBySlug, usernameOf } from '../store'

import { cardKey, now, requirePrinting, validPrice } from './context'
import type { TraderContext } from './context'
import { chatWith, partnerOf, post, requireChat, requireTrade } from './conversations'
import { acceptAs, confirmAs } from './lifecycle'
import { collectionRecords, itemsIn, myHaves, myReserved, partnerItems, requireItem, toBinderItems } from './records'

import { cancelTrade, counterOffer, giveLineQuantity, proposeTrade, reservedQuantities } from '#/domain'

export function tradesService(ctx: TraderContext): TradesService {
  const { me, store, trader } = ctx

  const resolveDraft = (draft: TradeDraft) => {
    const partner = participant(store, draft.partner).id
    if (partner === me) throw new Error('You cannot trade with yourself')
    const reserved = myReserved(ctx)
    const partnerReserved = reservedQuantities(store.trades, partner)
    const give = draft.give.map((line): TradeLine => {
      // Your side: any of your own Collection entries.
      const record = requireItem(ctx, line.sourceId)
      if (record.kind !== 'collection') throw new Error('Wanted cards cannot be offered')
      const card = requirePrinting(record.cardId)
      return {
        card,
        condition: record.condition,
        finish: record.finish,
        id: ctx.id('line'),
        language: record.language,
        marketPrice: priceOf(card, record.finish),
        price: validPrice(line, priceOf(card, record.finish)),
        quantity: giveLineQuantity({
          ...record,
          reservedQuantity: reserved.get(record.id) ?? 0,
        }, 'giver', line.quantity),
        sourceId: record.id,
      }
    })
    // Their side: only the partner's Haves (Collection entries with copies for trade, on a public List).
    const theirHaves = partnerItems(ctx, partner, 'haves')
    const partnerRecords = requireTrader(store, partner).items
    const get = draft.get.map((line): TradeLine => {
      const item = theirHaves.find(candidate => candidate.id === line.sourceId)
      const source = partnerRecords.find(record => record.id === line.sourceId)
      if (!item || source?.kind !== 'collection') throw new Error(`${usernameOf(store, partner)} no longer has one of these cards for trade`)
      return {
        card: item.card,
        condition: item.condition,
        finish: item.finish,
        id: ctx.id('line'),
        language: item.language,
        marketPrice: item.price,
        price: validPrice(line, item.price),
        quantity: giveLineQuantity({
          ...source,
          reservedQuantity: partnerReserved.get(source.id) ?? 0,
        }, 'partner', line.quantity),
        sourceId: item.id,
      }
    })
    if (give.length + get.length === 0) throw new Error('Add at least one card to the trade')
    const cashAmount = draft.cash ? Math.round(draft.cash.amount * 100) / 100 : 0
    if (!Number.isFinite(cashAmount) || cashAmount < 0) throw new Error('Cash must be a positive amount')
    let meetup: MeetupLocation | null = null
    if (draft.meetup?.kind === 'store') {
      const meetupStore = storesBySlug.get(draft.meetup.storeSlug)
      if (!meetupStore) throw new Error('Store not found')
      meetup = {
        address: meetupStore.address,
        kind: 'store',
        name: meetupStore.name,
        storeSlug: meetupStore.slug,
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

  return {
    accept: async (tradeId) => {
      const trade = acceptAs(store, requireTrade(ctx, tradeId), me)
      post(ctx, requireChat(ctx, trade.chatId), {
        author: me,
        body: 'accepted the trade',
        kind: 'event',
      })
      return trade
    },
    cancel: async (tradeId) => {
      const trade = requireTrade(ctx, tradeId)
      const declined = trade.status === 'pending' && trade.awaiting === me
      Object.assign(trade, cancelTrade(trade, me), { updatedAt: now() })
      post(ctx, requireChat(ctx, trade.chatId), {
        author: me,
        body: declined ? 'declined the trade' : 'cancelled the trade',
        kind: 'event',
      })
      return trade
    },
    confirm: async (tradeId) => {
      const trade = confirmAs(store, requireTrade(ctx, tradeId), me)
      post(ctx, requireChat(ctx, trade.chatId), {
        author: me,
        body: trade.status === 'completed' ? 'confirmed the trade, which is now completed' : 'confirmed the trade took place',
        kind: 'event',
      })
      return trade
    },
    getContext: async (partnerId) => {
      const partner = participant(store, partnerId)
      if (partner.id === me) throw new Error('You cannot trade with yourself')
      const myItems = toBinderItems(ctx, collectionRecords(ctx))
      const partnerHaves = partnerItems(ctx, partner.id, 'haves')
      const partnerWants = partnerItems(ctx, partner.id, 'wants')
      const myWants = new Set(itemsIn(ctx, 'wants').map(item => cardKey(item.card)))
      const theirWants = new Set(partnerWants.map(item => cardKey(item.card)))
      const partnerProfile = requireTrader(store, partner.id).profile
      return {
        meetingPlaces: [...new Set([...trader.profile.meetingPlaces, ...partnerProfile.meetingPlaces])],
        myItems,
        partner,
        partnerHaves,
        partnerWants,
        sharedStores: partner.storeSlugs
          .filter(slug => trader.profile.storeSlugs.includes(slug))
          .flatMap(slug => storesBySlug.get(slug) ?? []),
        suggestedGet: partnerHaves.filter(item => myWants.has(cardKey(item.card))).map(item => item.id),
        suggestedGive: myItems.filter(item => item.forTradeQuantity > 0 && theirWants.has(cardKey(item.card))).map(item => item.id),
      }
    },
    listMatches: async ({ citySlug, storeSlug } = {}) => {
      const myWants = new Set(itemsIn(ctx, 'wants').map(item => cardKey(item.card)))
      const haves = myHaves(ctx)
      const myStores = trader.profile.storeSlugs
      const candidates = [...store.traders.values()].filter(({ id, profile }) => {
        if (id === me) return false
        if (storeSlug) return profile.storeSlugs.includes(storeSlug)
        if (citySlug) return profile.citySlug === citySlug
        return profile.storeSlugs.some(slug => myStores.includes(slug))
      })
      return candidates
        .map(({ id, profile }) => {
          const theirWants = new Set(partnerItems(ctx, id, 'wants').map(item => cardKey(item.card)))
          return {
            citySlug: profile.citySlug ?? '',
            partner: participant(store, id),
            sharedStoreSlugs: profile.storeSlugs.filter(slug => myStores.includes(slug)),
            theyHave: partnerItems(ctx, id, 'haves').filter(item => myWants.has(cardKey(item.card))),
            theyWant: haves.filter(item => theirWants.has(cardKey(item.card))),
          }
        })
        .filter(match => match.theyHave.length + match.theyWant.length > 0)
        .sort((a, b) => (b.theyHave.length + b.theyWant.length) - (a.theyHave.length + a.theyWant.length))
    },
    propose: async (draft) => {
      const resolved = resolveDraft(draft)
      const chat = chatWith(ctx, resolved.partner)
      const trade: Trade = {
        ...proposeTrade(me, resolved.partner),
        cashAmount: resolved.cashAmount,
        cashPayer: resolved.cashPayer,
        chatId: chat.id,
        createdAt: now(),
        id: ctx.id('trade'),
        meetAt: resolved.meetAt,
        meetup: resolved.meetup,
        note: resolved.note,
        proposerGives: resolved.give,
        recipientGives: resolved.get,
        updatedAt: now(),
      }
      store.trades.push(trade)
      post(ctx, chat, {
        author: me,
        kind: 'trade',
        tradeId: trade.id,
      })
      return trade
    },
    revise: async (tradeId, draft) => {
      const trade = requireTrade(ctx, tradeId)
      const terms = counterOffer(trade, me)
      const partner = partnerOf(ctx, trade)
      const resolved = resolveDraft({
        ...draft,
        partner,
      })
      const countering = trade.awaiting === me
      Object.assign(trade, {
        ...terms,
        cashAmount: resolved.cashAmount,
        cashPayer: resolved.cashPayer,
        meetAt: resolved.meetAt,
        meetup: resolved.meetup,
        note: resolved.note,
        proposerGives: resolved.give,
        recipientGives: resolved.get,
        updatedAt: now(),
      } satisfies Partial<Trade>)
      // Re-post the card at the bottom of the conversation so the latest terms are in view.
      const chat = requireChat(ctx, trade.chatId)
      chat.messages = chat.messages.filter(message => !(message.kind === 'trade' && message.tradeId === trade.id))
      post(ctx, chat, {
        author: me,
        body: countering ? 'sent a counter-offer' : 'updated the proposal',
        kind: 'event',
      })
      post(ctx, chat, {
        author: me,
        kind: 'trade',
        tradeId: trade.id,
      })
      return trade
    },
  }
}
