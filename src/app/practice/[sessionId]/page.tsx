import PracticeSessionWorkspace from "./PracticeSessionWorkspace";

export default async function PracticeSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <PracticeSessionWorkspace sessionId={sessionId} />;
}
