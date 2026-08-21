"use client";

import React, { useEffect, useState } from "react";
import styles from "./styles/Hero.module.scss";
import CarouselImg from "../../../data/Carousel.json";
import HeroGallery from "../../../components/HeroGallery/HeroGallery";
import { AnimatedBox } from "../../../assets/animations/AnimatedBox";
import { cdn } from "../../../utils/cloudinary";

const titles = [
  "Entrepreneurship.",
  "Innovation.",
  "Leadership.",
  "Collaboration.",
  "Community.",
  "Impact.",
  "Opportunity.",
  "Development.",
  "Transformation.",
  "Inspiration.",
  "Motivation.",
];

function Hero() {
  const mainRef = React.useRef(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [titleIndex, setTitleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const title = titles[titleIndex];
    const typingSpeed = isDeleting ? 40 : 110;

    const interval = setInterval(() => {
      if (isDeleting) {
        setCurrentTitle(title.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else {
        setCurrentTitle(title.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }

      if (!isDeleting && charIndex === title.length) {
        setIsDeleting(true);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setTitleIndex((titleIndex + 1) % titles.length);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [charIndex, isDeleting, titleIndex]);

  return (
    <section ref={mainRef} className={styles.main} aria-label="Hero">
      <div className={styles.hero}>
        <div className={styles.heroTextContainer}>
          <div className={styles.textBackdrop} aria-hidden="true">
            <img src={cdn("/assets/design-3.png", 384)} alt="" loading="lazy" decoding="async" />
          </div>
          <AnimatedBox direction="left">
            <div className={styles.textContent}>
              <p className={styles.eyebrow}>Federation Of Entrepreneurship Development</p>
              <h1 className={styles.largeText}>
                Nurturing using innovative &amp; creative strategies
                <span className={styles.dynamicText}>
                  <span className={styles.typing}>{currentTitle}</span>
                </span>
              </h1>
              <p className={styles.lede}>
                Inspiring{" "}
                <span className={styles.accent}>visionaries</span> towards cultivating
                excellence and guiding future generations toward growth.
              </p>
            </div>
          </AnimatedBox>
        </div>
        <div className={styles.heroCarousel}>
          <HeroGallery images={CarouselImg} />
        </div>
      </div>
    </section>
  );
}

export default Hero;
