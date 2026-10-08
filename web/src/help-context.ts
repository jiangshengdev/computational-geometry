import { createContext } from 'react'

export type HelpTopic = 'introduction' | 'references' | 'case' | 'results' | 'inputs' | 'events' | 'active' | 'ties' | 'vertical' | 'overlap' | 'neighbors'
export const HelpContext = createContext<(topic: HelpTopic, trigger: HTMLButtonElement) => void>(() => {})
