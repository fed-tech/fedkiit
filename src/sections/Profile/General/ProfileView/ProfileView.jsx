"use client";

import { useState, useContext, useEffect } from "react";
import {
  User,
  Mail,
  Hash,
  Calendar,
  Layers,
  Landmark,
  Phone,
  Briefcase,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

import AuthContext from "../../../../context/AuthContext";
import { EditProfile } from "../../../../features";
import { ComponentLoading, Alert } from "../../../../microInteraction";
import BorderGlow from "@/src/components/BorderGlow/BorderGlow";
import styles from "./styles/ProfileView.module.scss";

const formatUrl = (url) => {
  const trimmed = (url || "").trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const ProfileView = () => {
  const authCtx = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleOpen = () => {
    if (!authCtx.user) return;
    authCtx.update(
      authCtx.user.name,
      authCtx.user.email,
      authCtx.user.img,
      authCtx.user.rollNumber,
      authCtx.user.school,
      authCtx.user.college,
      authCtx.user.contactNo,
      authCtx.user.year,
      authCtx.user.extra?.github,
      authCtx.user.extra?.linkedin,
      authCtx.user.extra?.designation,
      authCtx.user.access,
      authCtx.user.editProfileCount,
      authCtx.user.regForm
    );

    if (authCtx.user.access !== "USER" || authCtx.user.editProfileCount > 0) {
      setIsOpen(true);
    } else {
      Alert({
        type: "error",
        message: "You have exceeded the limit of editing your profile.",
        position: "bottom-right",
        duration: 3000,
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const user = authCtx.user || {};

  // Check if extra info exists or user has extended privileges
  const hasExtra =
    user.extra?.github ||
    user.extra?.linkedin ||
    user.extra?.designation ||
    (user.access && user.access !== "USER");

  return (
    <div className={styles.profileContainer}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.pageTitle}>
            <span className={styles.gradientHighlight}>Profile</span> Details
          </h1>
          <p className={styles.pageSubtitle}>
            Keep your details up to date to register for events.
          </p>
        </div>
        <button
          type="button"
          className={styles.editBtn}
          onClick={handleOpen}
        >
          Edit profile
        </button>
      </div>

      {isLoading ? (
        <ComponentLoading />
      ) : (
        <>
          {/* Section 1: Personal information */}
          <BorderGlow
            className={styles.glowCard}
            borderRadius={20}
            backgroundColor="#111115"
            glowColor="24 100 55"
            colors={["#ff4d26", "#ff7a18", "#ffa133"]}
            glowRadius={30}
            edgeSensitivity={25}
            glowIntensity={1.0}
          >
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Personal information</h2>
                <p className={styles.cardSubtitle}>Your name and primary email.</p>
              </div>
              <div className={styles.fieldsGrid}>
                <div className={styles.fieldBox}>
                  <div className={styles.fieldIcon}>
                    <User size={20} />
                  </div>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>FULL NAME</span>
                    <span className={styles.fieldValue} title={user.name}>
                      {user.name || "N/A"}
                    </span>
                  </div>
                </div>

                <div className={styles.fieldBox}>
                  <div className={styles.fieldIcon}>
                    <Mail size={20} />
                  </div>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>EMAIL ID</span>
                    <span className={styles.fieldValue} title={user.email}>
                      {user.email || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </BorderGlow>

          {/* Section 2: Academic details */}
          <BorderGlow
            className={styles.glowCard}
            borderRadius={20}
            backgroundColor="#111115"
            glowColor="24 100 55"
            colors={["#ff4d26", "#ff7a18", "#ffa133"]}
            glowRadius={30}
            edgeSensitivity={25}
            glowIntensity={1.0}
          >
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Academic details</h2>
                <p className={styles.cardSubtitle}>
                  Where you study, used for event eligibility.
                </p>
              </div>
              <div className={styles.fieldsGrid}>
                {/* Roll Number */}
                <div className={styles.fieldBox}>
                  <div className={styles.fieldIcon}>
                    <Hash size={20} />
                  </div>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>ROLL NUMBER</span>
                    {user.rollNumber ? (
                      <span className={styles.fieldValue} title={user.rollNumber}>
                        {user.rollNumber}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.addValueBtn}
                        onClick={handleOpen}
                      >
                        + Add roll number
                      </button>
                    )}
                  </div>
                </div>

                {/* Year */}
                <div className={styles.fieldBox}>
                  <div className={styles.fieldIcon}>
                    <Calendar size={20} />
                  </div>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>YEAR</span>
                    {user.year ? (
                      <span className={styles.fieldValue} title={user.year}>
                        {user.year}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.addValueBtn}
                        onClick={handleOpen}
                      >
                        + Add year
                      </button>
                    )}
                  </div>
                </div>

                {/* School */}
                <div className={styles.fieldBox}>
                  <div className={styles.fieldIcon}>
                    <Layers size={20} />
                  </div>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>SCHOOL</span>
                    {user.school ? (
                      <span className={styles.fieldValue} title={user.school}>
                        {user.school}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.addValueBtn}
                        onClick={handleOpen}
                      >
                        + Add school
                      </button>
                    )}
                  </div>
                </div>

                {/* College */}
                <div className={styles.fieldBox}>
                  <div className={styles.fieldIcon}>
                    <Landmark size={20} />
                  </div>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>COLLEGE</span>
                    {user.college ? (
                      <span className={styles.fieldValue} title={user.college}>
                        {user.college}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.addValueBtn}
                        onClick={handleOpen}
                      >
                        + Add college
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </BorderGlow>

          {/* Section 3: Contact */}
          <BorderGlow
            className={styles.glowCard}
            borderRadius={20}
            backgroundColor="#111115"
            glowColor="24 100 55"
            colors={["#ff4d26", "#ff7a18", "#ffa133"]}
            glowRadius={30}
            edgeSensitivity={25}
            glowIntensity={1.0}
          >
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Contact</h2>
                <p className={styles.cardSubtitle}>
                  How organisers can reach you.
                </p>
              </div>
              <div className={styles.fieldsGridSingle}>
                <div className={styles.fieldBox}>
                  <div className={styles.fieldIcon}>
                    <Phone size={20} />
                  </div>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>MOBILE NO</span>
                    {user.contactNo ? (
                      <span className={styles.fieldValue} title={user.contactNo}>
                        {user.contactNo}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.addValueBtn}
                        onClick={handleOpen}
                      >
                        + Add mobile no
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </BorderGlow>

          {/* Section 4: Social & Links (displayed if available or for non-USER) */}
          {hasExtra && (
            <BorderGlow
              className={styles.glowCard}
              borderRadius={20}
              backgroundColor="#111115"
              glowColor="24 100 55"
              colors={["#ff4d26", "#ff7a18", "#ffa133"]}
              glowRadius={30}
              edgeSensitivity={25}
              glowIntensity={1.0}
            >
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Social & Professional</h2>
                  <p className={styles.cardSubtitle}>
                    Your public profiles and community handles.
                  </p>
                </div>
                <div className={styles.fieldsGrid}>
                  {/* GitHub */}
                  <div className={styles.fieldBox}>
                    <div className={styles.fieldIcon}>
                      <FaGithub size={20} />
                    </div>
                    <div className={styles.fieldContent}>
                      <span className={styles.fieldLabel}>GITHUB</span>
                      {user.extra?.github ? (
                        <span className={styles.fieldValue}>
                          <a
                            href={formatUrl(user.extra.github)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {user.extra.github}
                          </a>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.addValueBtn}
                          onClick={handleOpen}
                        >
                          + Add GitHub
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className={styles.fieldBox}>
                    <div className={styles.fieldIcon}>
                      <FaLinkedin size={20} />
                    </div>
                    <div className={styles.fieldContent}>
                      <span className={styles.fieldLabel}>LINKEDIN</span>
                      {user.extra?.linkedin ? (
                        <span className={styles.fieldValue}>
                          <a
                            href={formatUrl(user.extra.linkedin)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {user.extra.linkedin}
                          </a>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.addValueBtn}
                          onClick={handleOpen}
                        >
                          + Add LinkedIn
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Designation */}
                  {user.extra?.designation && (
                    <div className={styles.fieldBox}>
                      <div className={styles.fieldIcon}>
                        <Briefcase size={20} />
                      </div>
                      <div className={styles.fieldContent}>
                        <span className={styles.fieldLabel}>DESIGNATION</span>
                        <span className={styles.fieldValue} title={user.extra.designation}>
                          {user.extra.designation}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </BorderGlow>
          )}
        </>
      )}

      {isOpen && <EditProfile handleModalClose={handleClose} />}
      <Alert />
    </div>
  );
};

export default ProfileView;
