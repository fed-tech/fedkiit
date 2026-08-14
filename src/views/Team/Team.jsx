"use client";

import { useState, useEffect } from "react";

import { api } from "../../services";
import styles from "./styles/Team.module.scss";
import { TeamCard } from "../../components";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import useWindowWidth from "../../utils/hooks/useWindowWidth";
import { ComponentLoading } from "../../microInteraction";
import Link from "next/link";

const Team = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [teamMembers, setTeamMembers] = useState([]);
  const [access, setAccess] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const windowWidth = useWindowWidth();

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await api.get("/api/user/fetchTeam");

        if (response.status === 200) {
          const validMembers = response.data.data.filter(
            (member) => member.name !== null
          );

          const sortedMembers = validMembers.sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return a.name.localeCompare(b.name);
          });

          setTeamMembers(sortedMembers);
        } else {
          setError({
            message:
              "Sorry for the inconvenience, we are having issues fetching our Team Members",
          });
        }
      } catch (error) {
        setError({
          message:
            "Sorry for the inconvenience, we are having issues fetching our Team Members",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAccessTypes = async () => {
      try {
        const response = await api.get("/api/user/fetchAccessTypes");

        if (response.status === 200) {
          const filteredAccess = response.data.data.filter(
            (accessType) =>
              !["ADMIN", "USER", "ALUMNI", "EX_MEMBER"].includes(accessType)
          );
          setAccess(filteredAccess);
        } else {
          setError({
            message:
              "Sorry for the inconvenience, we are having issues fetching our Team Members",
          });
        }
      } catch (error) {
        setError({
          message:
            "Sorry for the inconvenience, we are having issues fetching our Team Members",
        });
      }
    };

    fetchAccessTypes();
    fetchTeamMembers();
  }, []);


  const boardAccessCodes = [
    "PRESIDENT",
    "VICEPRESIDENT",
    "DIRECTOR_TECHNICAL",
    "DIRECTOR_CREATIVE",
    "DIRECTOR_MARKETING",
    "DIRECTOR_OPERATIONS",
    "DIRECTOR_PR_AND_FINANCE",
    "DIRECTOR_HUMAN_RESOURCE",
    "DEPUTY_DIRECTOR_TECHNICAL",
    "DEPUTY_DIRECTOR_CREATIVE",
    "DEPUTY_DIRECTOR_MARKETING",
    "DEPUTY_DIRECTOR_OPERATIONS",
    "DEPUTY_DIRECTOR_PR_AND_FINANCE",
    "DEPUTY_DIRECTOR_HUMAN_RESOURCE",
  ];

  const extractTeamFromAccess = (access) => {
    if (access.startsWith("SENIOR_EXECUTIVE_")) {
      return access.replace("SENIOR_EXECUTIVE_", "");
    }
    return access;
  };

  const getDisplayRole = (access) => {
    const teamCode = extractTeamFromAccess(access);
    let role = teamCode
      .split("_")
      .map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(" ");

    // Ensure consistent capitalization for role names
    switch (role.toLowerCase()) {
      case "pr and finance":
        role = "PR And Finance";
        break;
      case "human resource":
        role = "Human Resource";
        break;
    }
    return role;
  };

  const directorsAndAbove = teamMembers
    .filter((member) => boardAccessCodes.includes(member.access))
    .sort(
      (a, b) =>
        boardAccessCodes.indexOf(a.access) - boardAccessCodes.indexOf(b.access)
    );

  const otherMembers = teamMembers.filter(
    (member) => !boardAccessCodes.includes(member.access)
  );

  const roleMap = access.reduce((map, code) => {
    if (!boardAccessCodes.includes(code)) {
      const displayRole = getDisplayRole(code);
      const teamCode = extractTeamFromAccess(code);

      if (!map[displayRole]) {
        map[displayRole] = [];
      }
      map[displayRole].push(code);
    }
    return map;
  }, {});

  const teamByRole = Object.keys(roleMap)
    .map((role) => {
      const members = otherMembers.filter((member) =>
        roleMap[role].includes(member.access)
      );

      const seniorExecutives = members.filter((member) =>
        member.access.startsWith("SENIOR_EXECUTIVE_")
      );
      const others = members.filter(
        (member) => !member.access.startsWith("SENIOR_EXECUTIVE_")
      );

      return { role, members: [...seniorExecutives, ...others] };
    })
    .filter((group) => group.members.length > 0)
    .sort((a, b) => {
      const order = [
        "Technical",
        "Creative",
        "Marketing",
        "Operations",
        "PR And Finance",
        "Human Resource",
      ];
      return order.indexOf(a.role) - order.indexOf(b.role);
    });

  const TeamSection = ({ title, members, kicker }) => {
    const membersPerRow = windowWidth < 500 ? 2 : 4;
    const remainder = members.length % membersPerRow;

    const lastRow = remainder ? members.slice(-remainder) : [];
    const mainRows = remainder ? members.slice(0, -remainder) : members;

    return (
      <div className={styles.teamSection}>
        {kicker && <p className={styles.sectionKicker}>{kicker}</p>}
        {title && <h3>{title}</h3>}

        <div className={styles.teamGrid}>
          {mainRows.map((m, idx) => (
            <TeamCard key={idx} member={m} />
          ))}
        </div>

        {lastRow.length > 0 && (
          <div className={styles.lastRowCentered}>
            {lastRow.map((m, idx) => (
              <TeamCard key={idx} member={m} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.Team}>

      <p className={styles.sectionKicker}>OUR PEOPLE</p>
      <h2>
        Meet Our{" "}
        <span className={styles.headingAccent}>Team</span>
      </h2>

      <div className={styles.para}>
        <p>
          We are a tight-knit community of passionate people devoted to bringing
          vibrant and awe-inspiring changes in the field of Entrepreneurship.
        </p>
      </div>

      <div className={styles.circle}></div>

      {isLoading ? (
        <ComponentLoading
          customStyles={{
            width: "100%",
            height: "100%",
            marginTop: "5rem",
            marginBottom: "10rem",
          }}
        />
      ) : (
        <>

          <div className={styles.FICwrapper}>
            <div className={styles.FICsection}>
              <div className={styles.image}>
                <img
                  src="https://cdn.prod.website-files.com/663d1907e337de23e83c30b2/692c37f9ff87b3d30a302905_IMG-20251129-WA0016.jpg"
                  alt="FIC"
                />
              </div>

              <div className={styles.textBlock}>
                <p className={styles.name}>DR. VISHAL PRADHAN</p>
                <p className={styles.role}>FACULTY IN CHARGE</p>

                <div className={styles.vision}>
                  <p>
                    “As FIC of FED, my vision is to ignite curiosity, nurture
                    confidence, and inspire students to rise beyond limits—so
                    they walk into KIIT as learners and grow into innovators who
                    shape the world.”
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error.message}</div>}

          <TeamSection
            kicker="LEADERSHIP"
            title={
              <span>
                <span style={{ color: "#fff" }}>Board Of </span>
                <strong className={styles.headingAccent}>Directors</strong>
              </span>
            }
            members={directorsAndAbove}
          />

          <div className={styles.alumniBut}>
            <div className={styles.ulhover}>
              <Link href="/Alumni">
                <span style={{ color: "#fff" }}>Our</span> Alumni
              </Link>
              <FaRegArrowAltCircleRight />
            </div>
          </div>

          {teamByRole.map((group, i) => (
            <TeamSection
              key={i}
              title={
                <span>
                  <span style={{ color: "#fff" }}>Team </span>
                  <strong className={styles.headingAccent}>{group.role}</strong>
                </span>
              }
              members={group.members}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default Team;
