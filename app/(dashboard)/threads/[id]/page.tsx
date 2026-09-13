import { redirect } from 'next/navigation'

/** /threads/:id without /edit used to 404; send users to the editor. */
export default function ThreadIdIndexPage({ params }: { params: { id: string } }) {
  redirect(`/threads/${params.id}/edit?tab=rewrite`)
}
