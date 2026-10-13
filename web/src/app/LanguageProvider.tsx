import { useState, type ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider, useLingui } from '@lingui/react'
import { I18nProvider as AriaI18nProvider } from 'react-aria'
import { Select } from '@heroui/react/select'
import { ListBox } from '@heroui/react/list-box'
import { messages as en } from '../locales/en/messages'
import { messages as zhCN } from '../locales/zh-CN/messages'

type Locale = 'en' | 'zh-CN'
const preferenceKey = 'bo-language-v1'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(preferenceKey)
    if (saved === 'en' || saved === 'zh-CN') return saved
  } catch { /* Browser storage may be unavailable; language selection still works. */ }
  for (const language of navigator.languages) {
    try {
      const locale = new Intl.Locale(language).maximize()
      if (locale.language === 'en') return 'en'
      if (locale.language === 'zh') return locale.script === 'Hans' ? 'zh-CN' : 'en'
    } catch { /* Ignore malformed browser locale entries. */ }
  }
  return 'en'
}

function activate(locale: Locale) {
  i18n.loadAndActivate({ locale, messages: locale === 'en' ? en : zhCN })
  document.documentElement.lang = locale
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  useState(() => { activate(initialLocale()); return true })
  return <I18nProvider i18n={i18n}><ComponentLocale>{children}</ComponentLocale></I18nProvider>
}

function ComponentLocale({ children }: { children: ReactNode }) {
  const { i18n } = useLingui()
  return <AriaI18nProvider locale={i18n.locale}>{children}</AriaI18nProvider>
}

export function LanguageSelect() {
  const { i18n } = useLingui()
  return <Select aria-label="Language / 语言" className="w-36" value={i18n.locale} onChange={value => {
    if (value !== 'en' && value !== 'zh-CN') return
    activate(value)
    try { localStorage.setItem(preferenceKey, value) } catch { /* Keep the current session usable. */ }
  }}>
    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>
      <ListBox.Item id="zh-CN" textValue="简体中文">简体中文<ListBox.ItemIndicator /></ListBox.Item>
      <ListBox.Item id="en" textValue="English">English<ListBox.ItemIndicator /></ListBox.Item>
    </ListBox></Select.Popover>
  </Select>
}
