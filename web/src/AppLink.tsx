import { Link as HeroLink, type LinkProps } from '@heroui/react/link'
import { Link as RouterLink } from 'react-router'

type AppLinkProps = Omit<LinkProps, 'href' | 'render'> & {
  to: string
  'aria-keyshortcuts'?: string
}

export function AppLink({ to, 'aria-keyshortcuts': shortcut, ...props }: AppLinkProps) {
  return <HeroLink {...props} href={to} render={linkProps => 'href' in linkProps
    ? <RouterLink {...linkProps} to={linkProps.href} aria-keyshortcuts={shortcut} />
    : <span {...linkProps} aria-keyshortcuts={shortcut} />
  } />
}
