import { heroPhoto } from "./_data/photos";

import Image from "next/image";

import styles from "./page.module.css";

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
      </main>
    </div>
  );
}
