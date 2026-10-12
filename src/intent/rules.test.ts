import { describe, expect, it } from 'vitest'
import { extractDate, extractInterval, parseRules } from './rules'

const now = new Date(2026, 9, 12, 9) // Monday 12 October 2026

describe('extractDate', () => {
  it.each([
    ['hier', '2026-10-11'],
    ['avant-hier', '2026-10-10'],
    ["aujourd'hui", '2026-10-12'],
    ['yesterday evening', '2026-10-11'],
    ['il y a 3 jours', '2026-10-09'],
    ['il y a deux semaines', '2026-09-28'],
    ['5 days ago', '2026-10-07'],
    ['samedi', '2026-10-10'],
    ['lundi', '2026-10-05'],
    ['on friday', '2026-10-09'],
    ['le 3 octobre', '2026-10-03'],
    ['le 1er décembre', '2025-12-01'],
    ['october 3rd', '2026-10-03'],
    ['le 3/10', '2026-10-03'],
  ])('%s → %s', (text, day) => {
    const { date, rest } = extractDate(`j'ai arrosé ${text}`, now)
    expect(date && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`).toBe(day)
    expect(rest).toBe("j'ai arrosé")
  })

  it('leaves sentences without a day alone', () => {
    expect(extractDate("j'ai arrosé les plantes", now)).toEqual({ rest: "j'ai arrosé les plantes" })
  })
})

describe('extractInterval', () => {
  it.each([
    ['tous les 5 jours', 5],
    ['tous les jours', 1],
    ['toutes les deux semaines', 14],
    ['chaque mois', 30],
    ['une fois par semaine', 7],
    ['deux fois par semaine', 4],
    ['every 3 days', 3],
    ['every other week', 14],
    ['weekly', 7],
    ['tous les ans', 365],
  ])('%s → %d days', (text, days) => {
    expect(extractInterval(`arroser ${text}`)).toEqual({ rest: 'arroser', intervalDays: days })
  })
})

describe('parseRules', () => {
  it.each([
    ["J'ai arrosé les plantes", { action: 'log', task: 'arrosé les plantes' }],
    ["j'ai arrosé les plantes hier", { action: 'log', task: 'arrosé les plantes', date: '2026-10-11' }],
    ["Je viens d'arroser les plantes", { action: 'log', task: 'arroser les plantes' }],
    ['plantes arrosées avant-hier', { action: 'log', task: 'plantes arrosées', date: '2026-10-10' }],
    ['bouilloire faite', { action: 'log', task: 'bouilloire' }],
    ['I watered the plants yesterday', { action: 'log', task: 'watered the plants', date: '2026-10-11' }],
    ['just changed the sheets', { action: 'log', task: 'changed the sheets' }],
    ["c'est quand la dernière fois que j'ai détartré la bouilloire ?", { action: 'query', task: 'détartré la bouilloire' }],
    ['Quand est-ce que j’ai arrosé les plantes ?', { action: 'query', task: 'arrosé les plantes' }],
    ['quand ai-je changé les draps pour la dernière fois', { action: 'query', task: 'changé les draps' }],
    ['depuis quand je n’ai pas passé l’aspirateur ?', { action: 'query', task: "passé l'aspirateur" }],
    ['When did I last water the plants?', { action: 'query', task: 'water the plants' }],
    ['quand les plantes ?', { action: 'query', task: 'les plantes' }],
    ["Rappelle-moi d'arroser tous les 5 jours", { action: 'create', task: 'arroser', intervalDays: 5 }],
    ['arroser les plantes toutes les semaines', { action: 'create', task: 'arroser les plantes', intervalDays: 7 }],
    ['remind me to descale the kettle every month', { action: 'create', task: 'descale the kettle', intervalDays: 30 }],
    ['passe les plantes à tous les 4 jours', { action: 'create', task: 'les plantes', intervalDays: 4 }],
    ['ajoute la tâche vidange', { action: 'create', task: 'vidange' }],
    ['supprime la tâche bouilloire', { action: 'delete', task: 'bouilloire' }],
    ['renomme plantes en plantes du salon', { action: 'update', task: 'plantes', newName: 'plantes du salon' }],
    ['mes tâches', { action: 'list', task: '' }],
    ["qu'est-ce que je dois faire ?", { action: 'list', task: '' }],
    ["what's due", { action: 'list', task: '' }],
    ["qu'est-ce qui est en retard ?", { action: 'list', task: '' }],
    ["What's due?", { action: 'list', task: '' }],
    ['delete the kettle', { action: 'delete', task: 'the kettle' }],
    ['Rename plants to balcony plants', { action: 'update', task: 'plants', newName: 'balcony plants' }],
    ['I descaled the kettle yesterday', { action: 'log', task: 'descaled the kettle', date: '2026-10-11' }],
    ['Remind me to water the plants every 5 days', { action: 'create', task: 'water the plants', intervalDays: 5 }],
    ["j'ai détartré la bouilloire le 3 octobre", { action: 'log', task: 'détartré la bouilloire', date: '2026-10-03' }],
  ])('%s', (text, intent) => {
    expect(parseRules(text, now)).toEqual(intent)
  })

  it.each(['', 'bonjour', 'il pleut'])('does not guess on %j', (text) => {
    expect(parseRules(text, now)).toBeUndefined()
  })

  it('reads a need as a new task, not as a log', () => {
    expect(parseRules('I need to water the plants', now)).toEqual({ action: 'create', task: 'water the plants' })
  })
})

describe('dates that look like recurrences', () => {
  it.each([
    ['I watered the plants a week ago', '2026-10-05'],
    ['I descaled the kettle a month ago', '2026-09-12'],
    ['I changed the sheets a day ago', '2026-10-11'],
  ])('%s is a log, not a schedule', (text, date) => {
    expect(parseRules(text, now)).toMatchObject({ action: 'log', date })
  })

  it('still reads "once a week" as a schedule', () => {
    expect(parseRules('water the plants once a week', now)).toEqual({ action: 'create', task: 'water the plants', intervalDays: 7 })
  })
})
