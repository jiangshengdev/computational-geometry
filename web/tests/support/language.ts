import { setupI18n } from '@lingui/core'
import { messages } from '../../src/locales/zh-CN/messages'

export const chinese = setupI18n({ locale: 'zh-CN', messages: { 'zh-CN': messages } })
