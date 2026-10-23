import { Badge } from '#/components/ui/badge'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { isAnyPrinting } from '#/domain'
import { conditionLabels, conditions, finishLabels, finishes, isCondition, isFinish, isLanguage, languageLabels, languages } from '#/lib/cardOptions'
import type { Printing, WantFilters } from '#/services/types'

/** Select value for an unset filter. */
const ANY = 'any'

/**
 * The optional filters of a Want (ADR 0002). Each starts at "Any"; a filter
 * the Trader sets is binding when a Trade completes.
 */
export function WantFilterFields({ filters, onChange, printings }: {
  filters: WantFilters;
  onChange: (filters: WantFilters) => void;
  /** Every Printing of the Card, for the Set and finish options. */
  printings: Printing[]
}) {
  const sets = [...new Map(printings.map(printing => [printing.setCode, printing.setName])).entries()]
  const inSet = printings.filter(printing => filters.setCode === null || printing.setCode === filters.setCode)
  const finishOptions = finishes.filter(option => inSet.some(printing => printing.finishes.includes(option)))
  const set = (patch: Partial<WantFilters>) => onChange({
    ...filters,
    ...patch,
  })

  return (
    <div className="grid grid-cols-2 gap-3">
      <FilterSelect
        label="Set"
        onChange={(value) => {
          const setCode = value === ANY ? null : value
          const keepsFinish = filters.finish === null
            || printings.some(printing => (setCode === null || printing.setCode === setCode) && filters.finish !== null && printing.finishes.includes(filters.finish))
          set({
            finish: keepsFinish ? filters.finish : null,
            setCode,
          })
        }}
        options={sets.map(([code, name]) => [code, `${name} (${code.toUpperCase()})`])}
        value={filters.setCode}
      />

      <FilterSelect
        label="Finish"
        onChange={value => set({ finish: isFinish(value) ? value : null })}
        options={finishOptions.map(option => [option, finishLabels[option]])}
        value={filters.finish}
      />

      <FilterSelect
        label="Language"
        onChange={value => set({ language: isLanguage(value) ? value : null })}
        options={languages.map(option => [option, languageLabels[option]])}
        value={filters.language}
      />

      <FilterSelect
        label="Minimum condition"
        onChange={value => set({ minCondition: isCondition(value) ? value : null })}
        options={conditions.map(option => [option, `${option} · ${conditionLabels[option]}`])}
        value={filters.minCondition}
      />
    </div>
  )
}

function FilterSelect({ label, onChange, options, value }: {
  label: string;
  value: string | null;
  options: [string, string][];
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>

      <Select
        onValueChange={onChange}
        value={value ?? ANY}
      >
        <SelectTrigger
          aria-label={label}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>

          {options.map(([option, optionLabel]) => (
            <SelectItem
              key={option}
              value={option}
            >
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** A Want's filters as short labels; "Any printing" when none is set. */
export function wantFilterLabels(filters: WantFilters) {
  if (isAnyPrinting(filters)) return ['Any printing']
  return [
    filters.setCode && filters.setCode.toUpperCase(),
    filters.finish && finishLabels[filters.finish],
    filters.language && languageLabels[filters.language],
    filters.minCondition && `${filters.minCondition}+`,
  ].filter((label): label is string => Boolean(label))
}

/** Shows a Want's filters as badges. */
export function WantFilterBadges({ filters }: { filters: WantFilters }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {wantFilterLabels(filters).map(label => (
        <Badge
          className="text-[10px]"
          key={label}
          variant="outline"
        >
          {label}
        </Badge>
      ))}
    </span>
  )
}
