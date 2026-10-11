// The home page: Stevie's hero photo with the site's intro text over it, and the blog below.
import Image from "next/image";

import Blog from "./_components/Blog";
import { heroPhoto } from "./_data/photos";
import styles from "./_styling/page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.heroPhoto}
          src={heroPhoto.src}
          alt={heroPhoto.alt}
          width={heroPhoto.width}
          height={heroPhoto.height}
          priority
        />
        <div className={styles.intro}>
          <h1>Stevie The Dog!</h1>
          <p>Just a little dog in the big city of Chicago!</p>
        </div>
        <Blog />
      </main>
    </div>
  );
}
