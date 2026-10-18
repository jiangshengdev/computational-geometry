export function PageHeading({ title, subtitle, description }: { title: string; subtitle?: string; description?: string }) {
  return <>
    <h1 className={`${subtitle || description ? 'mb-3' : 'mb-6'} text-2xl font-semibold`}>{title}</h1>
    {subtitle && <p className={`${description ? 'mb-3' : 'mb-6'} text-muted`}>{subtitle}</p>}
    {description && <p className="mb-6 text-muted">{description}</p>}
  </>
}
