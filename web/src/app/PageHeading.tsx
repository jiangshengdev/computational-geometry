export function PageHeading({ title, description }: { title: string; description: string }) {
  return <>
    <h1 className="mb-3 text-2xl font-semibold">{title}</h1>
    <p className="mb-6 text-muted">{description}</p>
  </>
}
