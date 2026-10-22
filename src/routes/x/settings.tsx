import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Loader2, Plus, Save, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { viewerLimits } from '#/auth/limits'
import { PageHeader } from '#/components/layout/PageHeader'
import { TraderAvatar } from '#/components/trading/TraderAvatar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { citiesQuery, gamesQuery, profileQuery, storesQuery } from '#/services/queries'
import type { PricingSource, ProfilePatch, WorkspaceProfile } from '#/services/types'

export const Route = createFileRoute('/x/settings')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(citiesQuery()),
      queryClient.ensureQueryData(storesQuery()),
    ])
  },
  head: () => ({ meta: [{ title: 'Settings | CardNearMe' }] }),
  component: SettingsPage,
})

const pricingOptions: {
  id: PricingSource;
  title: string;
  description: string
}[] = [
  {
    description: 'Euro prices from the European marketplace.',
    id: 'cardmarket-eur',
    title: 'Cardmarket (EUR)',
  },
  {
    description: 'US dollar prices from the North American marketplace.',
    id: 'tcgplayer-usd',
    title: 'TCGplayer (USD)',
  },
]

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useSuspenseQuery(profileQuery(user.id))
  // Re-mount the form after a save so it starts from the stored profile.
  return (
    <SettingsForm
      key={JSON.stringify(profile)}
      profile={profile}
    />
  )
}

type Form = Required<ProfilePatch>

function SettingsForm({ profile }: { profile: WorkspaceProfile }) {
  const { user } = Route.useRouteContext()
  const { data: games } = useSuspenseQuery(gamesQuery())
  const { data: cities } = useSuspenseQuery(citiesQuery())
  const { data: stores } = useSuspenseQuery(storesQuery())
  const initial: Form = {
    avatarHue: profile.avatarHue,
    bio: profile.bio,
    citySlug: profile.citySlug,
    displayName: profile.displayName,
    games: profile.games,
    meetingPlaces: profile.meetingPlaces,
    pricingSource: profile.pricingSource,
    showStoresOnProfile: profile.showStoresOnProfile,
  }
  const [form, setForm] = useState<Form>(initial)
  const [place, setPlace] = useState('')
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const save = useWorkspaceMutation((services, patch: ProfilePatch) => services.profile.update(patch))
  const joinedStores = profile.storeSlugs.flatMap(slug => stores.find(store => store.slug === slug) ?? [])

  const set = <TKey extends keyof Form>(key: TKey, value: Form[TKey]) => setForm(previous => ({
    ...previous,
    [key]: value,
  }))
  const addPlace = () => {
    const value = place.trim()
    if (!value || form.meetingPlaces.includes(value)) return
    set('meetingPlaces', [...form.meetingPlaces, value].slice(0, 5))
    setPlace('')
  }

  return (
    <form
      className="page-wrap max-w-3xl space-y-6 pb-16"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(form, { onSuccess: () => toast.success('Settings saved') })
      }}
    >
      <PageHeader
        actions={(
          <Button
            disabled={!dirty || save.isPending}
            type="submit"
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            Save changes
          </Button>
        )}
        description="Profile, games, pricing and trading preferences."
        title="Settings"
      />

      <Panel
        description={user.demo ? `Signed in with the local demo account (${user.email}).` : `Signed in as ${user.email}.`}
        title="Profile"
      >
        <div className="flex items-center gap-4">
          <TraderAvatar
            className="size-16"
            hue={form.avatarHue}
            username={user.username}
          />

          <div className="flex-1 space-y-1.5">
            <Label>Avatar colour</Label>

            <Slider
              aria-label="Avatar colour"
              max={360}
              onValueChange={values => set('avatarHue', values.at(0) ?? form.avatarHue)}
              step={5}
              value={[form.avatarHue]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-username">Username</Label>

            <Input
              disabled
              id="settings-username"
              value={user.username}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-display-name">Display name</Label>

            <Input
              id="settings-display-name"
              maxLength={40}
              onChange={event => set('displayName', event.target.value)}
              required
              value={form.displayName}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-bio">Bio</Label>

          <Textarea
            id="settings-bio"
            maxLength={280}
            onChange={event => set('bio', event.target.value)}
            placeholder="What do you play and collect?"
            value={form.bio}
          />
        </div>
      </Panel>

      <Panel
        description="Used to tailor search, matches and the deck builder."
        title="Games"
      >
        <div className="flex flex-wrap gap-2">
          {games.map((game) => {
            const active = form.games.includes(game.id)
            return (
              <button
                aria-pressed={active}
                className={cn('rounded-full border px-3 py-1.5 text-sm font-medium transition', active ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
                key={game.id}
                onClick={() => set('games', active ? form.games.filter(other => other !== game.id) : [...form.games, game.id])}
                type="button"
              >
                {game.name}
              </button>
            )
          })}
        </div>

        {form.games.length === 0 && <p className="text-sm text-have">Pick at least one game.</p>}
      </Panel>

      <Panel
        description="Which marketplace prices are shown across the app."
        title="Pricing source"
      >
        <div
          aria-label="Pricing source"
          className="grid gap-3 sm:grid-cols-2"
          role="radiogroup"
        >
          {pricingOptions.map(option => (
            <button
              aria-checked={form.pricingSource === option.id}
              className={cn('rounded-xl border p-4 text-left transition', form.pricingSource === option.id ? 'border-primary bg-primary/10' : 'hover:border-primary/60')}
              key={option.id}
              onClick={() => set('pricingSource', option.id)}
              role="radio"
              type="button"
            >
              <span className="block font-semibold">{option.title}</span>

              <span className="block text-sm text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        description="Where you trade and how other traders find you."
        title="Trading"
      >
        <div className="space-y-1.5">
          <Label>City</Label>

          <Select
            onValueChange={value => set('citySlug', value)}
            value={form.citySlug ?? undefined}
          >
            <SelectTrigger
              aria-label="City"
              className="w-full sm:w-72"
            >
              <SelectValue placeholder="Pick your city" />
            </SelectTrigger>

            <SelectContent>
              {cities.map(city => (
                <SelectItem
                  key={city.slug}
                  value={city.slug}
                >
                  {`${city.name}, ${city.country}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{`Stores (${joinedStores.length} / ${viewerLimits.tradingStores})`}</Label>

          <p className="text-sm text-muted-foreground">
            {joinedStores.length > 0 ? joinedStores.map(store => store.name).join(' · ') : 'No stores yet.'}

            {' '}

            <Link
              className="font-semibold text-primary"
              to="/x/stores"
            >
              Manage stores
            </Link>
          </p>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
          <span>
            <span className="block font-medium">Show my stores on my profile</span>

            <span className="block text-sm text-muted-foreground">Other traders see where you are happy to meet.</span>
          </span>

          <Switch
            aria-label="Show my stores on my profile"
            checked={form.showStoresOnProfile}
            onCheckedChange={value => set('showStoresOnProfile', value)}
          />
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="settings-place">Other meeting places</Label>

          <div className="flex flex-wrap gap-2">
            {form.meetingPlaces.map(item => (
              <span
                className="flex items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-3 text-sm"
                key={item}
              >
                {item}

                <Button
                  aria-label={`Remove ${item}`}
                  onClick={() => set('meetingPlaces', form.meetingPlaces.filter(other => other !== item))}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <X />
                </Button>
              </span>
            ))}
          </div>

          {form.meetingPlaces.length < 5 && (
            <div className="flex gap-2">
              <Input
                className="sm:w-72"
                id="settings-place"
                maxLength={60}
                onChange={event => setPlace(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addPlace()
                  }
                }}
                placeholder="e.g. Café next to the station"
                value={place}
              />

              <Button
                onClick={addPlace}
                type="button"
                variant="outline"
              >
                <Plus />
                Add
              </Button>
            </div>
          )}
        </div>
      </Panel>
    </form>
  )
}

function Panel({ children, description, title }: {
  title: string;
  description: string;
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>

        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {children}
    </section>
  )
}
