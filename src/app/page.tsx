import { lessonIndex, loadContent } from "@/content";
import { HashRedirect } from "@/components/HashRedirect";
import { Workspace } from "@/components/Workspace";

// Until the landing page (M3), the home page opens the first lesson, as the prototype did.
export default function Home() {
  const index = lessonIndex();
  const legacy = Object.fromEntries(index.map((l) => [l.id, l.href]));
  return (
    <>
      <HashRedirect routes={legacy} />
      <Workspace lesson={loadContent().lessons[0]!} index={index} />
    </>
  );
}
