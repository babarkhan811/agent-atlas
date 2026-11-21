// The landing hero scene: the 8-layer agent stack as floating extruded slabs,
// with a message orb travelling up through them. Pure CSS 3D, no WebGL.
import { CATS } from "@/lib/cats";

const GLOWS = ["model", "knowledge", "protocols", "agents", "automation", "security", "safety", "ops"];

export function StackHero() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <div className="hero-stack">
        {CATS.map(([cat, , layer], k) => (
          <div key={cat} className="hero-slab" style={{ ["--k" as string]: k, ["--glow" as string]: `var(--glow-${GLOWS[k]})` }}>
            <span className="hero-slab-top">
              <b>{k + 1}</b>
              <span>{layer}</span>
            </span>
          </div>
        ))}
        <span className="hero-orb" />
        <span className="hero-orb late" />
      </div>
    </div>
  );
}
