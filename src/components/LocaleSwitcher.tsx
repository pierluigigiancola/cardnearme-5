// Locale switcher refs:
// - Paraglide docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
// - Router example: https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#switching-locale
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'
import { getLocale, locales, setLocale } from '#/paraglide/runtime'

export function LocaleSwitcher({ className }: { className?: string }) {
  const currentLocale = getLocale()

  return (
    <div
      aria-label={m.language_label()}
      className={cn('flex items-center gap-1', className)}
      role="group"
    >
      {locales.map(locale => (
        <button
          aria-pressed={locale === currentLocale}
          className={cn(
            'rounded-full border px-2 py-0.5 font-medium hover:text-foreground',
            locale === currentLocale && 'border-foreground bg-foreground font-bold text-background hover:text-background',
          )}
          key={locale}
          onClick={() => setLocale(locale)}
          type="button"
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
