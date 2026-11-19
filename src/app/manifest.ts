import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agent Atlas",
    short_name: "Agent Atlas",
    description: "Interactive simulations of how AI agents work, message by message.",
    start_url: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#04070e",
    theme_color: "#05080f",
  };
}
