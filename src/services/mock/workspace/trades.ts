import type { TradesService } from '../../services'
import type { MeetupLocation, Trade, TradeDraft, TradeLine, TradeMatch } from '../../types'
import { listedItems, participant, priceOf, requireTrader, storesBySlug, usernameOf } from '../store'

import { now, requirePrinting, validPrice } from './context'
import type { TraderContext } from './context'
import { chatWith, partnerOf, post, requireChat, requireTrade } from './conversations'
import { acceptAs, confirmAs } from './lifecycle'
import { cityOf, collectionRecords, matchTraderOf, myHaves, myReserved, partnerItems, requireItem, toBinderItems } from './records'

import {
  cancelTrade,
  checkCanPropose,
  checkTradeParties,
  checkTradePartner,
  counterOffer,
  findMatches,
  giveLineQuantity,
  matchBetween,
  proposeTrade,
  reservedQuantities,
  tradeCash,
  tradeEligibility,
} from '#/domain'

export function tradesService(ctx: TraderContext): TradesService {
  const { me, store, trader } = ctx

  const resolveDraft = (draft: TradeDraft) => {
    const partner = participant(store, draft.partner).id
    checkTradeParties(me, partner, {
      get: draft.get.length,
      give: draft.give.length,
    })
    const reserved = myReserved(ctx)
    const partnerReserved = reservedQuantities(store.trades, partner)
    const give = draft.give.map((line): TradeLine => {
      // Your side: any of your own Collection entries.
      const record = requireItem(ctx, line.sourceId)
      if (record.kind !== 'collection') throw new Error('Wanted cards cannot be offered')
      const card = requirePrinting(record.printingId)
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
      ...tradeCash(draft.cash, me, partner),
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
      checkTradePartner(me, partner.id)
      const myItems = toBinderItems(ctx, collectionRecords(ctx))
      const partnerHaves = partnerItems(ctx, partner.id, 'haves')
      const partnerWants = partnerItems(ctx, partner.id, 'wants')
      const partnerRecord = requireTrader(store, partner.id)
      const partnerProfile = partnerRecord.profile
      // Pre-selection follows the Matching rule (Want filters included), whatever the partner's City.
      const matched = matchBetween(matchTraderOf(trader), matchTraderOf(partnerRecord))
      const suggestedGet = new Set(matched.theyHave.map(entry => entry.id))
      const suggestedGive = new Set(matched.theyWant.map(entry => entry.id))
      return {
        meetingPlaces: [...new Set([...trader.profile.meetingPlaces, ...partnerProfile.meetingPlaces])],
        myItems,
        partner,
        partnerHaves,
        partnerWants,
        sharedStores: partner.storeSlugs
          .filter(slug => trader.profile.storeSlugs.includes(slug))
          .flatMap(slug => storesBySlug.get(slug) ?? []),
        suggestedGet: partnerHaves.filter(item => suggestedGet.has(item.id)).map(item => item.id),
        suggestedGive: myItems.filter(item => suggestedGive.has(item.id)).map(item => item.id),
      }
    },
    listMatches: async (scope = {}) => {
      // The City is the viewer's own, from the session; a scope naming another City gives no Matches.
      const myHaveEntries = new Map(myHaves(ctx).map(entry => [entry.id, entry]))
      const myCity = cityOf(trader)
      const traders = [...store.traders.values()]
      return findMatches(matchTraderOf(trader), traders.map(matchTraderOf), scope).map((match): TradeMatch => {
        const partner = requireTrader(store, match.partnerId)
        const listed = new Map(listedItems(store, 'haves', partner).map(item => [item.id, item]))
        return {
          citySlug: match.citySlug,
          eligibility: tradeEligibility(myCity, cityOf(partner)),
          partner: participant(store, partner.id),
          sharedStoreSlugs: match.sharedStoreSlugs,
          theyHave: match.theyHave.flatMap(entry => listed.get(entry.id) ?? []),
          theyWant: match.theyWant.flatMap(entry => myHaveEntries.get(entry.id) ?? []),
        }
      })
    },
    propose: async (draft) => {
      const resolved = resolveDraft(draft)
      checkCanPropose(cityOf(trader), cityOf(requireTrader(store, resolved.partner)))
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
      // A counter-offer proposes new terms, so it passes the same eligibility check as `propose`.
      checkCanPropose(cityOf(trader), cityOf(requireTrader(store, partner)))
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
        body: countering ? 'sent a counter-offer' : 'updated the trade',
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
