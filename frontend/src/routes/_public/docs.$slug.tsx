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
    <div className="nk-container max-w-3xl py-12">
      <h1 className="nk-h2 mb-6">{doc.title}</h1>
      <p className="nk-muted whitespace-pre-line">{doc.text}</p>
    </div>
  )
}
