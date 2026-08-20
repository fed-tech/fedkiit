"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./styles/Feedback.module.scss";
import feedbackData from "../../../data/Feedback.json";
import quoteImg from "../../../assets/images/quote.png";

const Feedback = () => {
  const feedbacksRef = useRef(null);
  const containerRef = useRef(null);

  const FeedbackCard = ({ quote }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const long = quote.quote.length > 160;
    const truncatedQuote = long
      ? `${quote.quote.substring(0, 150)}…`
      : quote.quote;

    return (
      <article className={styles.feedbackCard}>
        <button
          type="button"
          className={styles.FeedbackMsg}
          onClick={() => long && setIsExpanded(!isExpanded)}
          aria-expanded={long ? isExpanded : undefined}
        >
          <p className={styles.feedbackText}>
            {isExpanded || !long ? quote.quote : truncatedQuote}
            {long && !isExpanded && (
              <span className={styles.readMore}> read more</span>
            )}
          </p>
        </button>

        <div className={styles.meta}>
          <p className={styles.feedbackAuthor}>{quote.title}</p>
          <p className={styles.feedbackEv}>{quote.post}</p>
        </div>
      </article>
    );
  };

  useEffect(() => {
    const el = feedbacksRef.current;
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

  return (
    <section
      ref={containerRef}
      className={styles.feedbackContainer}
      aria-labelledby="testimonials-heading"
    >
      <img className={styles.upQuote} src={quoteImg.src} alt="" aria-hidden="true" />
      <header className={styles.heading}>
        <h2 id="testimonials-heading">
          TESTIMO<span>NIALS</span>
        </h2>
        <div className={styles.bottomLine} aria-hidden="true" />
      </header>
      <div className={styles.feedbacksContainer}>
        <div className={styles.feedbacks} ref={feedbacksRef}>
          {feedbackData.concat(feedbackData).map((quote, index) => (
            <FeedbackCard key={`${quote.title}-${index}`} quote={quote} />
          ))}
        </div>
      </div>
      <img className={styles.downQuote} src={quoteImg.src} alt="" aria-hidden="true" />
    </section>
  );
};

export default Feedback;
