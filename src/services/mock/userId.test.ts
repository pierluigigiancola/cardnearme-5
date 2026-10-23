import { describe, expect, it } from 'vitest'

import { publicServices } from './public'
import { createStore } from './store'
import { workspaceFor } from './workspace'

function signedIn(username = 'idtester', id = `auth-${username}`) {
  const store = createStore()
  const owner = {
    id,
    onboarded: true,
    username,
  }
  return {
    owner,
    store,
    workspace: workspaceFor(owner, store),
  }
}

async function firstMatch(workspace: ReturnType<typeof workspaceFor>) {
  const match = (await workspace.trades.listMatches()).at(0)
  if (!match) throw new Error('Seeded workspace has no Matches')
  return match
}

describe('traders identified by UserId', () => {
  it('opens a chat with a Trader by their UserId', async () => {
    const { workspace } = signedIn()
    const match = await firstMatch(workspace)
    const chat = await workspace.chat.openChat(match.partner.id)
    expect(chat.partner.id).toBe(match.partner.id)
    expect(chat.partner.username).toBe(match.partner.username)
  })

  it('records a proposed Trade and its chat message against both Traders\' UserIds', async () => {
    const { owner, workspace } = signedIn()
    const match = await firstMatch(workspace)
    const context = await workspace.trades.getContext(match.partner.id)
    const wanted = context.partnerHaves.at(0)
    if (!wanted) throw new Error('Partner has no Haves')
    expect(wanted.ownerId).toBe(match.partner.id)
    const trade = await workspace.trades.propose({
      cash: {
        amount: 3,
        payer: 'me',
      },
      get: [{
        price: wanted.price,
        quantity: 1,
        sourceId: wanted.id,
      }],
      give: [],
      meetAt: null,
      meetup: null,
      note: '',
      partner: match.partner.id,
    })
    expect(trade).toMatchObject({
      awaiting: match.partner.id,
      cashPayer: owner.id,
      proposer: owner.id,
      recipient: match.partner.id,
    })
    const thread = await workspace.chat.getThread(trade.chatId)
    expect(thread?.messages.at(-1)?.author).toBe(owner.id)
  })

  it('keeps Trades and chats working after a Trader changes username', async () => {
    const { store, workspace } = signedIn()
    const match = await firstMatch(workspace)
    const chat = await workspace.chat.openChat(match.partner.id)
    const partner = store.traders.get(match.partner.id)
    if (!partner) throw new Error('Partner is not in the store')
    // No service renames a Trader yet, so rename in the store as the backend would.
    partner.profile.username = 'renamed-partner'

    const chats = await workspace.chat.listChats()
    expect(chats.find(candidate => candidate.id === chat.id)?.partner.username).toBe('renamed-partner')
    const context = await workspace.trades.getContext(match.partner.id)
    expect(context.partner.username).toBe('renamed-partner')
    expect(context.partnerHaves.every(item => item.ownerUsername === 'renamed-partner')).toBe(true)
  })

  it('tells apart two Traders who share a username', async () => {
    const { workspace } = signedIn()
    const match = await firstMatch(workspace)
    const twin = signedIn(match.partner.username, 'auth-twin')
    const chat = await twin.workspace.chat.openChat(match.partner.id)
    expect(chat.partner.id).toBe(match.partner.id)
    await expect(twin.workspace.chat.openChat('auth-twin')).rejects.toThrow('You cannot trade with yourself')
  })

  it('finds a public profile\'s Haves and decks by the UserId its username resolves to', async () => {
    const { store, workspace } = signedIn()
    const match = await firstMatch(workspace)
    const publicView = publicServices(store)
    const user = await publicView.community.getUser(match.partner.username)
    if (!user) throw new Error('Profile not found')
    expect(user.id).toBe(match.partner.id)
    const haves = await publicView.trading.listTradeItems({
      listType: 'haves',
      ownerId: user.id,
    })
    expect(haves.items.length).toBeGreaterThan(0)
    expect(haves.items.every(item => item.ownerId === user.id)).toBe(true)

    const deck = await workspace.deckBuilder.create({
      cards: [],
      description: '',
      format: 'Commander',
      gameId: 'mtg',
      name: 'Mine',
      visibility: 'public',
    })
    const mine = await publicView.community.listDecks({ ownerId: 'auth-idtester' })
    expect(mine.map(candidate => candidate.id)).toEqual([deck.id])
  })
})
