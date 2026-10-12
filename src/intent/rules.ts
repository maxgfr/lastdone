// Rule-based FR/EN parser: the fallback when WebGPU or the model is unavailable.
import { addDays } from '../domain/schedule'
import { formatDay, type Intent } from './schema'

// Letter-aware word boundaries (\b ignores accented letters).
const L = '(?<![\\p{L}\\p{N}])'
const R = '(?![\\p{L}\\p{N}])'
const re = (source: string) => new RegExp(source, 'iu')

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, one: 1, a: 1, an: 1, deux: 2, two: 2, other: 2, trois: 3, three: 3, quatre: 4, four: 4,
  cinq: 5, five: 5, six: 6, sept: 7, seven: 7, huit: 8, eight: 8, neuf: 9, nine: 9, dix: 10, ten: 10,
  onze: 11, eleven: 11, douze: 12, twelve: 12, quinze: 15, fifteen: 15, vingt: 20, twenty: 20,
  trente: 30, thirty: 30,
}
const NUM = `(\\d{1,4}|${Object.keys(NUMBER_WORDS).join('|')})`
const toNumber = (word: string) => (/^\d+$/.test(word) ? Number(word) : (NUMBER_WORDS[word.toLowerCase()] ?? 1))

const UNIT_DAYS: [RegExp, number][] = [
  [/^(jours?|days?)$/i, 1],
  [/^(semaines?|weeks?)$/i, 7],
  [/^(mois|months?)$/i, 30],
  [/^(ans?|ann[ée]es?|years?)$/i, 365],
]
const UNIT = '(jours?|days?|semaines?|weeks?|mois|months?|ans|an|ann[ée]es?|years?)'
const unitDays = (unit: string) => UNIT_DAYS.find(([pattern]) => pattern.test(unit))?.[1] ?? 1

const WEEKDAYS = [
  ['dimanche', 'sunday'], ['lundi', 'monday'], ['mardi', 'tuesday'], ['mercredi', 'wednesday'],
  ['jeudi', 'thursday'], ['vendredi', 'friday'], ['samedi', 'saturday'],
]
const MONTHS = [
  ['janvier', 'january', 'jan'], ['f[ée]vrier', 'february', 'feb'], ['mars', 'march', 'mar'],
  ['avril', 'april', 'apr'], ['mai', 'may'], ['juin', 'june', 'jun'], ['juillet', 'july', 'jul'],
  ['ao[uû]t', 'august', 'aug'], ['septembre', 'september', 'sept?'], ['octobre', 'october', 'oct'],
  ['novembre', 'november', 'nov'], ['d[ée]cembre', 'december', 'dec'],
]
const MONTH = `(${MONTHS.flat().join('|')})`
const monthIndex = (word: string) => MONTHS.findIndex((names) => names.some((n) => re(`^${n}$`).test(word)))

function clean(text: string): string {
  return text
    .replace(/[’`]/g, "'")
    .replace(re(`${L}(s'il te pla[iî]t|s'il vous pla[iî]t|stp|svp|please|pls)${R}`), '')
    .replace(/[?!.,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pulls a day out of the sentence ("hier", "lundi", "il y a 3 jours", "3 octobre", "yesterday"…). */
export function extractDate(text: string, now = new Date()): { rest: string; date?: Date } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const rules: [RegExp, (m: RegExpExecArray) => Date | undefined][] = [
    [re(`${L}(avant[- ]hier|the day before yesterday)${R}`), () => addDays(today, -2)],
    [re(`${L}(hier|yesterday)( (matin|midi|soir|apr[eè]s-midi|morning|afternoon|evening|night))?${R}|${L}last night${R}`), () => addDays(today, -1)],
    [re(`${L}(aujourd'hui|ce matin|ce midi|cet apr[eè]s-midi|ce soir|today|this (morning|afternoon|evening)|tonight)${R}`), () => today],
    [re(`${L}il y a ${NUM} ${UNIT}${R}|${L}${NUM} ${UNIT} ago${R}`), (m) => {
      const [n, unit] = m[1] ? [m[1], m[2]!] : [m[3]!, m[4]!]
      return addDays(today, -toNumber(n) * unitDays(unit))
    }],
    [re(`${L}(?:le |on )?(\\d{1,2})(?:er)? ${MONTH}(?: (\\d{4}))?${R}|${L}(?:on )?${MONTH} (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?${R}`), (m) => {
      const [day, month, year] = m[1] ? [m[1], m[2]!, m[3]] : [m[5]!, m[4]!, m[6]]
      return pastDay(today, Number(day), monthIndex(month), year ? Number(year) : undefined)
    }],
    [re(`${L}(?:le |on )?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?${R}`), (m) => {
      const year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : undefined
      return pastDay(today, Number(m[1]), Number(m[2]) - 1, year)
    }],
    [re(`${L}(?:(?:last|on) )?(${WEEKDAYS.flat().join('|')})(?: dernier)?${R}`), (m) => {
      const target = WEEKDAYS.findIndex((names) => names.includes(m[1]!.toLowerCase()))
      const back = (today.getDay() - target + 7) % 7 || 7
      return addDays(today, -back)
    }],
  ]
  for (const [pattern, toDate] of rules) {
    const match = pattern.exec(text)
    if (!match) continue
    const date = toDate(match)
    if (!date) continue
    const rest = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim()
    return { rest, date }
  }
  return { rest: text }
}

/** A day/month without a year means the latest one that is not in the future. */
function pastDay(today: Date, day: number, month: number, year?: number): Date | undefined {
  if (month < 0 || month > 11 || day < 1 || day > 31) return undefined
  let date = new Date(year ?? today.getFullYear(), month, day, 12)
  if (date.getMonth() !== month) return undefined
  if (year === undefined && date > today) date = new Date(today.getFullYear() - 1, month, day, 12)
  return date
}

/** Pulls a recurrence out of the sentence ("tous les 5 jours", "every week", "une fois par mois"…). */
export function extractInterval(text: string): { rest: string; intervalDays?: number } {
  const rules: [RegExp, (m: RegExpExecArray) => number][] = [
    [re(`${L}(?:tous les|toutes les|chaque|every|each)(?: ${NUM})? ${UNIT}${R}`), (m) => toNumber(m[1] ?? '1') * unitDays(m[2]!)],
    [re(`${L}(?:(?:une fois|once) )?(?:par|per|a) (jour|day|semaine|week|mois|month|an|year)${R}(?! ago)`), (m) => unitDays(m[1]!)],
    [re(`${L}(?:(deux|twice|2) fois|twice) par (semaine|mois)${R}|${L}twice a (week|month)${R}`), (m) => Math.round(unitDays(m[2] ?? m[3]!) / 2)],
    [re(`${L}(daily|quotidien(?:ne)?(?:ment)?)${R}`), () => 1],
    [re(`${L}(weekly|hebdomadaire(?:ment)?)${R}`), () => 7],
    [re(`${L}(monthly|mensuel(?:le)?(?:ment)?)${R}`), () => 30],
    [re(`${L}(yearly|annually|annuel(?:le)?(?:ment)?)${R}`), () => 365],
  ]
  // Most specific first: "deux fois par semaine" before "par semaine".
  const ordered = [rules[2]!, ...rules.filter((_, i) => i !== 2)]
  for (const [pattern, toDays] of ordered) {
    const match = pattern.exec(text)
    if (!match) continue
    const rest = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim()
    return { rest, intervalDays: Math.max(1, toDays(match)) }
  }
  return { rest: text }
}

function trimTask(task: string): string {
  return task
    .replace(re(`^(?:de |d'|to |que |qu')`), '')
    .replace(re(`${L}(?:pour la derni[eè]re fois|la derni[eè]re fois|for the last time|last time|last)$`), '')
    .replace(/\s+/g, ' ')
    .trim()
}

const DELETE = re(`^(?:supprime[rz]?|efface[rz]?|oublie[rz]?|retire[rz]?|delete|remove|forget)(?: la t[aâ]che| the task| task)? (.+)$`)
const RENAME = re(`^(?:renomme[rz]?|rename) (.+?) (?:en|to|as) (.+)$`)
const LIST = re(`^(?:liste[rz]?|list|t[aâ]ches|mes t[aâ]ches|tasks|my tasks|tout|all|r[ée]sum[ée]|summary|status|statut|[àa] faire|todo|to do|en retard|overdue|qu'est-ce qui est en retard|qu'est-ce qui est [àa] faire|qu'est-ce que (?:je dois|j'ai [àa]) faire|que dois-je faire|quoi faire|what'?s due|what do i (?:need|have) to do)$`)
const QUERY = [
  re(`^(?:c'est )?quand (?:est-ce que |est ce que )?(?:j'ai|ai-je|je l'ai|j'avais|avais-je|on a|a-t-on) (?:fait )?(?:pour la derni[eè]re fois )?(.+)$`),
  re(`^(?:c'est quand |quand (?:[ée]tait|est) )?la derni[eè]re fois (?:que |qu')(?:j'ai|je|on a) (?:fait )?(.+)$`),
  re(`^(?:depuis quand|[çc]a fait combien de temps que|combien de temps depuis que) (?:je n'ai pas|j'ai pas|j'ai|je n'ai|on a) (.+)$`),
  re(`^when (?:did|have|was the last time) (?:i|we) (?:last )?(.+)$`),
  re(`^(?:when was )?the last time (?:i|we) (.+)$`),
  re(`^how long (?:since|has it been since) (?:i|we) (?:last )?(.+)$`),
  re(`^(?:derni[eè]re fois|last time|last) ?:? (.+)$`),
  re(`^quand (.+)$`),
]
const CREATE = re(
  `^(?:rappelle[- ]moi|rappelle[rz]?|remind me|ajoute[rz]?|cr[ée]e[rz]?|create|add|track|suivre|suis|nouvelle t[aâ]che|new task|change[rz]?|modifie[rz]?|passe[rz]?|mets?|set|il faut|je dois|i need|i have|i must)(?: (?:la |une )?t[aâ]che| (?:a )?task| ?:)?(?: (?:de |d'|to |que |qu'))? ?(.+)$`,
)
const NOT_A_LOG = re(`^(?:need|want|have to|must|should|will|gonna|going to)${R}`)
const LOG = [
  re(`^(?:j'ai |j'viens d(?:e |')|je viens d(?:e |')|on a |nous avons |i've |i have |i just |just |i )(?:(?:fini|termin[ée]) (?:de |d')|finished |done )?(.+)$`),
  re(`^(?:fait|faite|done|termin[ée]|fini|ok) ?:? (.+)$`),
  re(`^(.+?) (?:fait|faite|faits|faites|done|termin[ée]e?s?|fini)$`),
]

/** Best-effort parse of a FR/EN sentence. Returns undefined when nothing matches. */
export function parseRules(input: string, now = new Date()): Intent | undefined {
  const text = clean(input)
  if (!text) return undefined
  let match: RegExpExecArray | null

  if ((match = DELETE.exec(text))) return { action: 'delete', task: trimTask(match[1]!) }
  if ((match = RENAME.exec(text))) return { action: 'update', task: trimTask(match[1]!), newName: match[2]!.trim() }
  if (LIST.test(text)) return { action: 'list', task: '' }
  for (const pattern of QUERY) {
    if ((match = pattern.exec(text))) {
      const task = trimTask(extractDate(match[1]!, now).rest)
      if (task) return { action: 'query', task }
    }
  }

  const { rest, intervalDays } = extractInterval(text)
  if (intervalDays !== undefined) {
    const task = trimTask((CREATE.exec(rest)?.[1] ?? rest).replace(re(`${L}(?:à|a|to|en)$`), ''))
    return task ? { action: 'create', task, intervalDays } : undefined
  }

  const { rest: withoutDate, date } = extractDate(text, now)
  for (const pattern of LOG) {
    if ((match = pattern.exec(withoutDate)) && !NOT_A_LOG.test(match[1]!)) {
      const task = trimTask(match[1]!)
      if (task) return { action: 'log', task, ...(date ? { date: formatDay(date) } : {}) }
    }
  }
  if ((match = CREATE.exec(text))) {
    const task = trimTask(match[1]!)
    if (task) return { action: 'create', task }
  }
  // A bare phrase with a day ("arrosé les plantes hier") is a log.
  if (date && withoutDate) return { action: 'log', task: trimTask(withoutDate), date: formatDay(date) }
  return undefined
}
