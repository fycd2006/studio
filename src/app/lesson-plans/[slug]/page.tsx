import { redirect } from "next/navigation";

export default async function LessonPlansByGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/plans?group=${encodeURIComponent(slug)}`);
}
