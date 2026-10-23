import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { Copy, ExternalLink, LogOut, Plus, Settings, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader, Section } from '#/components/layout/PageHeader'
import { MatchCityNotice, MatchList } from '#/components/trading/MatchList'
import { HeadStartSteps, UnlockProgress } from '#/components/trading/Promos'
import { TradeItems } from '#/components/trading/TradeItems'
import { matchCityNotice } from '#/components/trading/matchCityNotice'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { STORE_JOIN_CAP } from '#/domain'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { cityQuery, matchesQuery, profileQuery, storeQuery, storesQuery, tradeItemsQuery } from '#/services/queries'
import type { Store, StoreSettings } from '#/services/types'

const PREVIEW = 8

export const Route = createFileRoute('/x/stores/$store')({
  loader: async ({ context: { queryClient, user }, params }) => {
    const store = await queryClient.ensureQueryData(storeQuery(params.store))
    if (!store) throw notFound()
    const city = await queryClient.ensureQueryData(cityQuery(store.citySlug))
    if (!city) throw notFound()
    await Promise.all([
      queryClient.ensureQueryData(storesQuery()),
      queryClient.ensureQueryData(matchesQuery(user.id, {
        citySlug: store.citySlug,
        storeSlug: store.slug,
      })),
      queryClient.ensureQueryData(tradeItemsQuery({
        limit: PREVIEW,
        listType: 'haves',
        storeSlug: store.slug,
      })),
      queryClient.ensureQueryData(tradeItemsQuery({
        limit: PREVIEW,
        listType: 'wants',
        storeSlug: store.slug,
      })),
    ])
    return {
      city,
      store,
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.store.name} — your store | CardNearMe` : 'Your stores | CardNearMe' }] }),
  component: MyStorePage,
})

function MyStorePage() {
  const { city, store } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const { data: profile } = useSuspenseQuery(profileQuery(user.id))
  const { data: allStores } = useSuspenseQuery(storesQuery())
  const { data: matches } = useSuspenseQuery(matchesQuery(user.id, {
    citySlug: store.citySlug,
    storeSlug: store.slug,
  }))
  const { data: haves } = useSuspenseQuery(tradeItemsQuery({
    limit: PREVIEW,
    listType: 'haves',
    storeSlug: store.slug,
  }))
  const { data: wants } = useSuspenseQuery(tradeItemsQuery({
    limit: PREVIEW,
    listType: 'wants',
    storeSlug: store.slug,
  }))
  const [inviting, setInviting] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const joined = profile.storeSlugs.includes(store.slug)
  const joinedStores = profile.storeSlugs.flatMap(slug => allStores.find(candidate => candidate.slug === slug) ?? [])
  const storeNames = Object.fromEntries(allStores.map(candidate => [candidate.slug, candidate.name]))
  const unlocked = city.traderCount >= city.unlockThreshold
  const cityNotice = matchCityNotice(profile.citySlug, city)
  const join = useWorkspaceMutation((services, slug: string) => services.profile.joinStore(slug))

  return (
    <div className="page-wrap pb-12">
      {joinedStores.length > 0 && (
        <nav
          aria-label="Your stores"
          className="flex gap-1 overflow-x-auto pt-4"
        >
          {joinedStores.map(candidate => (
            <Link
              className={cn('shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition', candidate.slug === store.slug ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
              key={candidate.slug}
              params={{ store: candidate.slug }}
              to="/x/stores/$store"
            >
              {candidate.name}
            </Link>
          ))}

          {joinedStores.length < STORE_JOIN_CAP && (
            <Link
              className="flex shrink-0 items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              search={{ city: city.slug }}
              to="/stores"
            >
              <Plus className="size-3" />
              Add store
            </Link>
          )}
        </nav>
      )}

      <PageHeader
        actions={joined
          ? (
            <>
              <Button
                asChild
                variant="ghost"
              >
                <Link
                  params={{ store: store.slug }}
                  to="/stores/$store"
                >
                  <ExternalLink />
                  Public page
                </Link>
              </Button>

              <Button
                onClick={() => setConfiguring(true)}
                variant="outline"
              >
                <Settings />
                Store settings
              </Button>

              <Button onClick={() => setInviting(true)}>
                <UserPlus />
                Invite traders
              </Button>
            </>
          )
          : (
            <Button
              disabled={join.isPending}
              onClick={() => join.mutate(store.slug, { onSuccess: () => toast.success(`Joined ${store.name}`) })}
            >
              <Users />
              Join store
            </Button>
          )}
        description={`${store.address} · ${store.traderCount} traders`}
        title={store.name}
      />

      {!joined && <p className="mb-4 rounded-xl border border-have/40 bg-have/10 p-3 text-sm">You have not joined this store yet. Join it to trade here and see it in your matches.</p>}

      {unlocked
        ? (
          <>
            <Section
              description="Traders at this store whose lists match yours"
              title={`Matches (${matches.length})`}
            >
              <MatchList
                empty={cityNotice ? <MatchCityNotice notice={cityNotice} /> : undefined}
                matches={matches}
                storeNames={storeNames}
              />
            </Section>

            <Section
              action={(
                <Link
                  className="text-sm font-semibold text-primary"
                  params={{ city: city.slug }}
                  to="/city/$city/haves"
                >
                  {`View all ${haves.total} →`}
                </Link>
              )}
              description="Cards available for trade at this store"
              title="Haves"
            >
              <TradeItems
                items={haves.items}
                view="visual"
              />
            </Section>

            <Section
              action={(
                <Link
                  className="text-sm font-semibold text-primary"
                  params={{ city: city.slug }}
                  to="/city/$city/wants"
                >
                  {`View all ${wants.total} →`}
                </Link>
              )}
              description="Cards players here are looking for, with the minimum condition they accept"
              title="Wants"
            >
              <TradeItems
                items={wants.items}
                view="visual"
              />
            </Section>
          </>
        )
        : (
          <div className="grid gap-6 lg:grid-cols-2">
            <UnlockProgress city={city} />

            <HeadStartSteps />
          </div>
        )}

      <InviteDialog
        onOpenChange={setInviting}
        open={inviting}
        store={store}
        username={user.username}
      />

      <StoreSettingsDialog
        onOpenChange={setConfiguring}
        open={configuring}
        settings={profile.storeSettings[store.slug] ?? { notifyMatches: true }}
        showStoresOnProfile={profile.showStoresOnProfile}
        store={store}
      />
    </div>
  )
}

function InviteDialog({ onOpenChange, open, store, username }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
  username: string
}) {
  const link = typeof window === 'undefined' ? `/stores/${store.slug}` : `${window.location.origin}/stores/${store.slug}?ref=${encodeURIComponent(username)}`
  const message = `I trade cards at ${store.name} on CardNearMe — join so we can swap: ${link}`
  const copy = (value: string, label: string) => {
    void navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  }

  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{`Invite traders to ${store.name}`}</DialogTitle>

          <DialogDescription>Every trader who joins brings the store closer to unlocking local trading.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="invite-link">Invite link</Label>

          <div className="flex gap-2">
            <Input
              id="invite-link"
              readOnly
              value={link}
            />

            <Button
              aria-label="Copy link"
              onClick={() => copy(link, 'Link')}
              size="icon"
              variant="outline"
            >
              <Copy />
            </Button>
          </div>
        </div>

        <p className="rounded-lg bg-muted p-3 text-sm">{message}</p>

        <DialogFooter>
          <Button onClick={() => copy(message, 'Message')}>
            <Copy />
            Copy message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StoreSettingsDialog({ onOpenChange, open, settings, showStoresOnProfile, store }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
  settings: StoreSettings;
  showStoresOnProfile: boolean
}) {
  const router = useRouter()
  const saveSettings = useWorkspaceMutation((services, next: StoreSettings) => services.profile.updateStoreSettings(store.slug, next))
  const saveVisibility = useWorkspaceMutation((services, show: boolean) => services.profile.update({ showStoresOnProfile: show }))
  const leave = useWorkspaceMutation(services => services.profile.leaveStore(store.slug))

  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Store settings</DialogTitle>

          <DialogDescription>{store.name}</DialogDescription>
        </DialogHeader>

        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span>
            <span className="block font-medium">Match alerts</span>

            <span className="block text-sm text-muted-foreground">Notify me when someone here lists a card I want.</span>
          </span>

          <Switch
            aria-label="Match alerts"
            checked={settings.notifyMatches}
            onCheckedChange={notifyMatches => saveSettings.mutate({ notifyMatches })}
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span>
            <span className="block font-medium">Show my stores on my profile</span>

            <span className="block text-sm text-muted-foreground">Applies to all your stores.</span>
          </span>

          <Switch
            aria-label="Show my stores on my profile"
            checked={showStoresOnProfile}
            onCheckedChange={show => saveVisibility.mutate(show)}
          />
        </label>

        <DialogFooter className="sm:justify-between">
          <Button
            disabled={leave.isPending}
            onClick={() => {
              void leave.mutateAsync(undefined)
                .then(() => {
                  toast.success(`Left ${store.name}`)
                  onOpenChange(false)
                  return router.navigate({ to: '/x/stores' })
                })
                .catch(() => undefined)
            }}
            variant="destructive"
          >
            <LogOut />
            Leave store
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
