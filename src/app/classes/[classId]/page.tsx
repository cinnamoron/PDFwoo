import ClassWorkspace from "./ClassWorkspace";

export default async function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return <ClassWorkspace classId={classId} />;
}
