import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lessonHref, lessonIndex, loadContent } from "@/content";
import { absUrl } from "@/lib/site";
import { Workspace } from "@/components/Workspace";

type Params = { path: string; lesson: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return loadContent().lessons.map((l) => ({ path: l.path, lesson: l.id }));
}

function find({ path, lesson }: Params) {
  return loadContent().lessons.find((l) => l.id === lesson && l.path === path);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const l = find(await params);
  if (!l) return {};
  return { title: l.seoTitle ?? l.title, description: l.seoDescription ?? l.summary, alternates: { canonical: absUrl(lessonHref(l)) } };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const l = find(await params);
  if (!l) notFound();
  return <Workspace lesson={l} index={lessonIndex()} />;
}
