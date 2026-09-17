import ConceptsReview from "./ConceptsReview";

export default async function ConceptsPage({
  params,
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = await params;

  return <ConceptsReview materialId={materialId} />;
}
