"use client";

import React, { useEffect, useRef } from "react";
import { Hero, About, EventsSection, Sponser, Feedback, Contact } from "../../sections";
import { LiveEventPopup } from "../../features";
import ScrollRevealWrapper from "@/app/components/ScrollRevealWrapper";
import styles from "./styles/Home.module.scss";

const Home = () => {
  const homeRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div ref={homeRef} className={styles.homeContainer}>
      <LiveEventPopup />
      <Hero />
      <About />
      <ScrollRevealWrapper>
        <EventsSection />
      </ScrollRevealWrapper>
      <ScrollRevealWrapper>
        <section id="Sponser">
          <Sponser />
        </section>
      </ScrollRevealWrapper>
      <ScrollRevealWrapper>
        <section id="Contact">
          <Contact />
        </section>
      </ScrollRevealWrapper>
      <ScrollRevealWrapper>
        <Feedback />
      </ScrollRevealWrapper>
    </div>
  );
};

export default Home;
