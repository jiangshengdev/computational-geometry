import { createContext } from 'react'

export type HelpTopic = 'introduction' | 'references'
export const HelpContext = createContext<(topic: HelpTopic, trigger: HTMLButtonElement) => void>(() => {})
