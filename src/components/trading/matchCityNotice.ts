import { matchingCity } from '#/domain'

/**
 * Why a page for `city` shows the viewer no Matches because of their City
 * (spec decision 4: Matching runs only in the viewer's own City), or `null`
 * when Matching runs there.
 */
export function matchCityNotice(viewerCitySlug: string | null, city: {
  slug: string;
  name: string 
}) {
  if (matchingCity(viewerCitySlug, { citySlug: city.slug })) return null
  return viewerCitySlug
    ? `Matches are found only in your own city, so ${city.name} shows you none. Traders here can still trade with you.`
    : 'Pick your city in settings to see your matches.'
}
