import { createFileRoute, notFound } from "@tanstack/react-router"

import { docs } from "@/content/club"

export const Route = createFileRoute("/_public/docs/$slug")({
  component: DocPage,
  beforeLoad: ({ params }) => {
    if (!docs[params.slug]) throw notFound()
  },
})

function DocPage() {
  const { slug } = Route.useParams()
  const doc = docs[slug]
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-black uppercase">{doc.title}</h1>
      <p className="whitespace-pre-line text-muted-foreground">{doc.text}</p>
    </div>
  )
}
