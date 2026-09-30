"use client";

import React, { useContext, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Calendar,
  LogOut,
  Camera,
  FileText,
  Users,
  ClipboardList,
  Share2,
  Award,
  ChevronDown,
} from "lucide-react";

import AuthContext from "../../../context/AuthContext";
import { isAttendanceScanner } from "@/lib/auth/attendance";
import { EditImage } from "../../../features";
import BorderGlow from "@/src/components/BorderGlow/BorderGlow";
import styles from "./styles/Sidebar.module.scss";

const getInitials = (name, email) => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return "U";
};

const Sidebar = ({ activepage, handleChange }) => {
  const authCtx = useContext(AuthContext);
  const [imagePrv, setImagePrv] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const imgRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  const access = authCtx.user?.access;
  const email = authCtx.user?.email;

  const designation = useMemo(() => {
    if (isAttendanceScanner({ email })) {
      return "Attendance Only";
    }
    if (access === "ADMIN") {
      return "Admin";
    }
    if (access === "ALUMNI") {
      return "Alumni";
    }
    if (access === "USER") {
      return "User";
    }
    if (access) {
      return access.toLowerCase().replace(/_/g, " ");
    }
    return "User";
  }, [access, email]);

  // Determine current active item from route or prop
  const currentActive = useMemo(() => {
    if (activepage) return activepage;
    if (!pathname) return "Profile";
    const path = pathname.toLowerCase();
    if (path.includes("/profile/events")) return "Events";
    if (path.includes("/profile/attendance")) return "Attendance";
    if (path.includes("/profile/blogform")) return "Blogs";
    if (path.includes("/profile/form")) return "Form";
    if (path.includes("/profile/members")) return "Members";
    if (path.includes("/profile/social")) return "Social";
    if (path.includes("/profile/certificates")) return "Certificates";
    return "Profile";
  }, [activepage, pathname]);

  const handleMenuClick = (page) => {
    if (handleChange) {
      handleChange(page);
    }
    setIsMobileMenuOpen(false);

    const pathMap = {
      Blogs: "/profile/BlogForm",
      Events: "/profile/events",
      events: "/profile/events",
      Form: "/profile/Form",
      Members: "/profile/members",
      Attendance: "/profile/attendance",
      Social: "/profile/social",
      Certificates: "/profile/certificates",
      Profile: "/profile",
    };

    if (pathMap[page]) {
      router.push(pathMap[page]);
    }
  };

  const handleLogout = () => {
    router.push("/");
    authCtx.logout();
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const closeModal = () => {
    setSelectedFile(null);
  };

  const setImage = (url) => {
    setImagePrv(url);
  };

  // Completion calculation (7 essential fields)
  const user = authCtx.user || {};
  const completionFields = [
    user.name,
    user.email,
    user.rollNumber,
    user.year,
    user.school,
    user.college,
    user.contactNo,
  ];
  const completedCount = completionFields.filter(
    (field) => field && String(field).trim().length > 0
  ).length;
  const progressPercent = Math.round((completedCount / 7) * 100);

  const getCompletionMessage = () => {
    if (completedCount === 7) return "Profile details are fully updated.";
    if (!user.rollNumber || !user.year || !user.school || !user.college) {
      return "Add your academic details to finish.";
    }
    if (!user.contactNo) {
      return "Add your contact details to finish.";
    }
    return "Add your remaining details to finish.";
  };

  const isAttendanceOnly = isAttendanceScanner(authCtx.user);
  const userImg = authCtx.user?.img || imagePrv;
  const initials = getInitials(authCtx.user?.name, authCtx.user?.email);

  return (
    <div className={styles.sidebar}>
      {/* Top Profile Card */}
      <BorderGlow
        className={styles.profileGlowCard}
        borderRadius={20}
        backgroundColor="#111115"
        glowColor="24 100 55"
        colors={["#ff4d26", "#ff7a18", "#ffa133"]}
        glowRadius={35}
        edgeSensitivity={30}
        glowIntensity={1.2}
        animated={true}
      >
        <div className={styles.cardContent}>
          <div className={styles.avatarWrapper}>
            <span className={styles.statusDot} title="Online" />
            {userImg ? (
              <img
                src={userImg}
                alt={user.name || "Profile"}
                className={styles.profilePhoto}
              />
            ) : (
              <span className={styles.avatarInitials}>{initials}</span>
            )}

            {!isAttendanceOnly && (
              <>
                <button
                  type="button"
                  className={styles.cameraBadge}
                  onClick={(e) => {
                    e.stopPropagation();
                    imgRef.current?.click();
                  }}
                  title="Update profile picture"
                  aria-label="Update profile picture"
                >
                  <Camera size={16} />
                </button>
                <input
                  style={{ display: "none" }}
                  type="file"
                  ref={imgRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>

          {selectedFile && (
            <EditImage
              selectedFile={selectedFile}
              closeModal={closeModal}
              setimage={setImage}
              updatePfp={true}
              setFile={setSelectedFile}
            />
          )}

          <h2 className={styles.userName}>{user.name || "User"}</h2>
          <span className={styles.roleBadge}>{designation}</span>

          {/* Profile Completion Bar */}
          <div className={styles.completionSection}>
            <div className={styles.completionHeader}>
              <span>Profile completion</span>
              <span className={styles.completionCount}>{completedCount} of 7</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className={styles.completionHint}>{getCompletionMessage()}</p>
          </div>
        </div>
      </BorderGlow>

      {/* Mobile Toggle Button */}
      <div
        className={styles.mobileMenuToggle}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span>Profile Menu</span>
        <ChevronDown
          size={18}
          style={{
            transform: isMobileMenuOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.25s ease",
          }}
        />
      </div>

      {/* Bottom Navigation Menu Card */}
      <div
        className={`${styles.menuCard} ${
          isMobileMenuOpen ? styles.menuOpen : ""
        }`}
      >
        {isAttendanceOnly ? (
          <button
            type="button"
            className={
              currentActive === "Attendance"
                ? styles.menuItemActive
                : styles.menuItem
            }
            onClick={() => handleMenuClick("Attendance")}
          >
            <ClipboardList size={18} />
            <span>Attendance</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className={
                currentActive === "Profile"
                  ? styles.menuItemActive
                  : styles.menuItem
              }
              onClick={() => handleMenuClick("Profile")}
            >
              <User size={18} />
              <span>Profile</span>
            </button>

            <button
              type="button"
              className={
                currentActive === "Events" || currentActive === "events"
                  ? styles.menuItemActive
                  : styles.menuItem
              }
              onClick={() => handleMenuClick("Events")}
            >
              <Calendar size={18} />
              <span>Event</span>
            </button>

            {designation === "Admin" && (
              <>
                <button
                  type="button"
                  className={
                    currentActive === "Form"
                      ? styles.menuItemActive
                      : styles.menuItem
                  }
                  onClick={() => handleMenuClick("Form")}
                >
                  <FileText size={18} />
                  <span>Form</span>
                </button>

                <button
                  type="button"
                  className={
                    currentActive === "Members"
                      ? styles.menuItemActive
                      : styles.menuItem
                  }
                  onClick={() => handleMenuClick("Members")}
                >
                  <Users size={18} />
                  <span>Members</span>
                </button>

                <button
                  type="button"
                  className={
                    currentActive === "Attendance"
                      ? styles.menuItemActive
                      : styles.menuItem
                  }
                  onClick={() => handleMenuClick("Attendance")}
                >
                  <ClipboardList size={18} />
                  <span>Attendance</span>
                </button>

                <button
                  type="button"
                  className={
                    currentActive === "Social"
                      ? styles.menuItemActive
                      : styles.menuItem
                  }
                  onClick={() => handleMenuClick("Social")}
                >
                  <Share2 size={18} />
                  <span>Social</span>
                </button>
              </>
            )}

            {(designation === "Admin" ||
              authCtx.user?.access === "SENIOR_EXECUTIVE_CREATIVE") && (
              <button
                type="button"
                className={
                  currentActive === "Blogs"
                    ? styles.menuItemActive
                    : styles.menuItem
                }
                onClick={() => handleMenuClick("Blogs")}
              >
                <FileText size={18} />
                <span>Blogs</span>
              </button>
            )}

            {authCtx.user?.access !== "USER" && (
              <button
                type="button"
                className={
                  currentActive === "Certificates"
                    ? styles.menuItemActive
                    : styles.menuItem
                }
                onClick={() => handleMenuClick("Certificates")}
              >
                <Award size={18} />
                <span>Certificates</span>
              </button>
            )}
          </>
        )}

        {/* Logout */}
        <button
          type="button"
          className={`${styles.menuItem} ${styles.logoutItem}`}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;