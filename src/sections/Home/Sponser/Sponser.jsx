"use client";

import React, { useState, useRef, useEffect } from "react";
import SponserImg from "../../../data/Sponser.json";
import styles from "./styles/Sponser.module.scss";

const SponserCard = ({ image }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={styles.sponser_card}>
      <img
        src={image.image}
        className={`${styles.SponserCard_image} ${"" /* .loaded is not defined by this module, as in the original */}`}
        alt={image.title || "Sponsor logo"}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
};

const Sponser = () => {
  const trackRef = useRef(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;

    const pause = () => {
      el.style.animationPlayState = "paused";
    };
    const play = () => {
      el.style.animationPlayState = "running";
    };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", play);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", play);

    return () => {
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", play);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", play);
    };
  }, []);

  const logos = [...SponserImg, ...SponserImg];

  return (
    <section className={styles.section} aria-labelledby="sponsors-heading">
      <header className={styles.heading}>
        <h2 id="sponsors-heading" className={styles.sponser_title}>
          our <span className={styles.sponser_title2}>Sponsors</span>
        </h2>
        <div className={styles.bottom_line} aria-hidden="true" />
        <p className={styles.subhead}>Partners who back our community and events.</p>
      </header>

      <div className={styles.marqueeShell}>
        <div className={styles.marqueeFade} aria-hidden="true" />
        <div className={styles.sponser_container}>
          <div className={styles.track} ref={trackRef}>
            {logos.map((image, idx) => (
              <SponserCard key={`${image.image}-${idx}`} image={image} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Sponser;
