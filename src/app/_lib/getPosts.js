// This website's active posts from the Headless CMS, newest first. Server Components only.
import { cmsFetch } from "./cmsFetch";

export function getPosts() {
  return cmsFetch("/api/public/posts", { tag: "posts", empty: [] });
}
