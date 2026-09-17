import AssessmentWorkspace from "./AssessmentWorkspace";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ materialId: string; assessmentId: string }>;
}) {
  const { materialId, assessmentId } = await params;

  return <AssessmentWorkspace materialId={materialId} assessmentId={assessmentId} />;
}
