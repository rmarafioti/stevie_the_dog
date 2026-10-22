// Stevie's blog: the site's active posts from the Headless CMS, newest first, rendered below the
// hero on the home page. Server Component: posts are fetched at build/regeneration time.
import Image from "next/image";

import { getPosts } from "../_lib/getPosts";
import FormattedText from "./FormattedText";
import styles from "../_styling/Blog.module.css";

// Formats a YYYY-MM-DD postDate as e.g. "Oct 11, 2026". The date is built and formatted in UTC so
// the visitor's time zone can never shift it to the day before.
function formatPostDate(postDate) {
  const [year, month, day] = postDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PostTitle({ header, subHeader }) {
  // An hgroup must contain a heading, so a subHeader without a header is a plain paragraph.
  if (!header) {
    return subHeader ? <p>{subHeader}</p> : null;
  }

  return (
    <hgroup>
      <h3>{header}</h3>
      {subHeader && <p>{subHeader}</p>}
    </hgroup>
  );
}

function PostBody({ body }) {
  // Body items have no id; their order is fixed by the site owner, so the index is a stable key.
  // Only the two item types the CMS documents are rendered.
  return body.map((item, index) => {
    if (item.type === "image") {
      return (
        <Image
          key={index}
          className={styles.image}
          src={item.image.src}
          width={item.image.width}
          height={item.image.height}
          alt={item.image.altText}
        />
      );
    }

    if (item.type === "paragraph") {
      return (
        <p key={index} className={styles.paragraph}>
          <FormattedText text={item.text} />
        </p>
      );
    }

    return null;
  });
}

export default async function Blog() {
  const posts = await getPosts();
  const hasPosts = posts.length > 0;

  if (!hasPosts) return null;

  return (
    <section className={styles.blog}>
      <h2>{"Stevie's Blog"}</h2>
      {posts.map((post) => (
        <article key={post.id} className={styles.post}>
          {post.postDate && (
            <time dateTime={post.postDate}>
              {formatPostDate(post.postDate)}
            </time>
          )}
          <PostTitle header={post.header} subHeader={post.subHeader} />
          <PostBody body={post.body} />
        </article>
      ))}
    </section>
  );
}
