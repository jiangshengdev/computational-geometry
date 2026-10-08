import { createContext } from 'react'

export type HelpTopic = 'introduction' | 'references' | 'case' | 'results' | 'inputs'
export const HelpContext = createContext<(topic: HelpTopic, trigger: HTMLButtonElement) => void>(() => {})
