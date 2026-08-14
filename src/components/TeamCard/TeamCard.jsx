"use client";

import React, { useContext, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import { Blurhash } from "react-blurhash";
import styles from "./styles/TeamCard.module.scss";
import TeamCardSkeleton from "../../layouts/Skeleton/TeamCard/TeamCard";
import { Button } from "../Core";
import AuthContext from "../../context/AuthContext";

const TeamCard = ({
  member,
  blurhash,
  customStyles = {},
  onUpdate,
  onRemove,
  size = "default",
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const extraData = member?.extra || {
    linkedin: "",
    github: "",
    know: "",
    designation: "",
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 500); // Show skeleton for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  const authCtx = useContext(AuthContext);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleLink = (url) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    } else {
      return "https://" + url;
    }
  };

  //for name overflow

  const nameRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (nameRef.current) {
      setIsOverflowing(nameRef.current.scrollWidth > nameRef.current.clientWidth);
    }
  }, [member.name]);

  return (
    <div
      className={`${styles.teamMember} ${
        size === "featured" ? styles.featured : ""
      } ${customStyles.teamMember || ""}`}
    >
      {showSkeleton && <TeamCardSkeleton customStyles={customStyles} />}
      <div
        className={styles.teamMemberInner}
        style={{ display: showSkeleton ? "none" : "block" }}
      >
        <div className={styles.ImgDiv}>
          {!isImageLoaded && (
            <Blurhash
              hash="LEG8_%els7NgM{M{RiNI*0IVog%L"
              width={"100%"}
              height={"100%"}
              resolutionX={32}
              resolutionY={32}
              punch={1}
              className={styles.teamMember_blurhash}
            />
          )}
          {member?.img && (
            <img
              src={member.img}
              alt={`Profile of ${member?.name}`}
              className={styles.teamMemberImg}
              onLoad={handleImageLoad}
              style={{ display: isImageLoaded ? "block" : "none" }}
            />
          )}

          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.overlayInfo}>
            {extraData.designation && (
              <p className={styles.role}>{extraData.designation}</p>
            )}
            <h4
              ref={nameRef}
              className={`${styles.memName} ${
                isOverflowing ? styles.responsive : ""
              }`}
            >
              {member?.name}
            </h4>
          </div>

          {(extraData?.linkedin || extraData?.github) && (
            <div className={styles.socialChips}>
              {extraData?.linkedin && (
                <a
                  href={handleLink(extraData?.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.chip}
                  aria-label={`${member?.name} on LinkedIn`}
                >
                  <FaLinkedin />
                </a>
              )}
              {extraData?.github && (
                <a
                  href={handleLink(extraData?.github)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.chip}
                  aria-label={`${member?.name} on GitHub`}
                >
                  <FaGithub />
                </a>
              )}
            </div>
          )}
        </div>

        {onUpdate && authCtx.user.access === "ADMIN" && (
          <div className={styles.updatebtn}>
            <Button
              onClick={(e) => {
                e.preventDefault();
                if (onUpdate) {
                  authCtx.memberData = member;
                  onUpdate();
                }
              }}
            >
              Update
            </Button>

            <Button
              onClick={(e) => {
                e.preventDefault();
                const isConfirmed = window.confirm(
                  `Do you really want to remove this member "${member?.name}"?`
                );
                if (isConfirmed && onRemove) {
                  authCtx.memberData = member;
                  onRemove();
                }
              }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

TeamCard.propTypes = {
  name: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  social: PropTypes.shape({
    linkedin: PropTypes.string,
    github: PropTypes.string,
  }).isRequired,
  title: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired,
  know: PropTypes.string.isRequired,
  blurhash: PropTypes.string, // Add this line
  customStyles: PropTypes.object,
  size: PropTypes.oneOf(["default", "featured"]),
  onUpdate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default TeamCard;