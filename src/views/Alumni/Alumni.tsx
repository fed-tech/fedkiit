"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "../../services";
import styles from "./styles/Alumni.module.scss";
import { TeamCard } from "../../components";
import useWindowWidth from "../../utils/hooks/useWindowWidth";
import { ComponentLoading } from "../../microInteraction";
import type { Member, MemberExtra } from "../../types/member";

const UNKNOWN_SESSION = "Unknown";

type EnrichedAlumni = {
  member: Member;
  session: string;
  domain: string;
  rank: number;
};

const getSessionFromRollNumber = (
  rollNumber: string | number | null | undefined
): string | null => {
  const roll = String(rollNumber ?? "").trim();

  if (!/^\d{2}/.test(roll)) return null;

  const batchYear = parseInt(roll.substring(0, 2), 10);
  const startYear = 2000 + batchYear + 2;

  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

const sortByName = (list: Member[]): Member[] =>
  [...list].sort((a, b) => a.name.localeCompare(b.name));

const getMemberKey = (member: Member, index: number): string | number =>
  member.id ?? member.rollNumber ?? `${member.name}-${index}`;

const AlumniSection = ({ alumni }: { alumni: Member[] }) => {
  const windowWidth = useWindowWidth();
  const membersPerRow = windowWidth < 500 ? 2 : 4;
  const remainderMembersCount = alumni.length % membersPerRow;

  const lastRowMembers =
    remainderMembersCount > 0 ? alumni.slice(-remainderMembersCount) : [];

  const otherMembers =
    remainderMembersCount > 0
      ? alumni.slice(0, -remainderMembersCount)
      : alumni;

  return (
    <div className={styles.alumniSection}>
      <div className={styles.alumniGrid}>
        {otherMembers.map((member, i) => (
          <TeamCard key={getMemberKey(member, i)} member={member} />
        ))}
      </div>

      {lastRowMembers.length > 0 && (
        <div className={styles.lastRowCentered}>
          {lastRowMembers.map((member, i) => (
            <TeamCard
              key={getMemberKey(member, otherMembers.length + i)}
              member={member}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const domainOrder = [
  "Board Of Directors",
  "Technical",
  "Creative",
  "Marketing",
  "Operations",
  "PR And Finance",
  "Human Resource",
  "Other / Unclassified",
];

const domainRank = (domain: string): number => {
  const i = domainOrder.indexOf(domain);
  return i === -1 ? domainOrder.length : i;
};

const getDesignation = (member: Member): string => {
  let extra: MemberExtra | null = null;

  if (typeof member.extra === "string") {
    try {
      extra = JSON.parse(member.extra) as MemberExtra;
    } catch {
      extra = null;
    }
  } else {
    extra = member.extra ?? null;
  }

  return (extra?.designation ?? member.designation ?? "")
    .toString()
    .trim()
    .toUpperCase();
};

const getDomainFromDesignation = (designation: string): string => {
  if (!designation) return "Other / Unclassified";

  if (
    designation.includes("BOARD OF DIRECTORS") ||
    designation.includes("DIRECTOR") ||
    designation.includes("PRESIDENT") ||
    /\bBOD\b/.test(designation)
  ) {
    return "Board Of Directors";
  }

  if (designation.includes("TECH")) return "Technical";
  if (designation.includes("CREATIVE")) return "Creative";
  if (designation.includes("MARKETING")) return "Marketing";
  if (designation.includes("OPERATION")) return "Operations";

  if (
    /\bPR\b/.test(designation) ||
    designation.includes("FINANCE") ||
    designation.includes("PUBLIC RELATIONS")
  ) {
    return "PR And Finance";
  }

  if (/\bHR\b/.test(designation) || designation.includes("HUMAN RESOURCE")) {
    return "Human Resource";
  }

  return "Other / Unclassified";
};

const getMemberRank = (domain: string, designation: string): number => {
  if (domain === "Board Of Directors") {
    if (designation.includes("PRESIDENT")) return 0;
    if (designation.includes("VICE")) return 1;
    if (designation.includes("DEPUTY")) return 3;
    return 2;
  }

  return designation.includes("SENIOR") ? 0 : 1;
};

const sortSessions = (list: string[]): string[] =>
  [...list].sort((a, b) => {
    if (a === UNKNOWN_SESSION) return 1;
    if (b === UNKNOWN_SESSION) return -1;
    return b.localeCompare(a);
  });

const Alumni = () => {
  const [alumni, setAlumni] = useState<Member[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchAlumni = async () => {
      try {
        const response = await api.get("/api/user/fetchAlumni");

        if (response.status === 200) {
          const data: Member[] = response.data.data ?? [];
          setAlumni(sortByName(data));
          setError(null);
        } else {
          console.error("Error fetching alumni:", response.data.message);

          setError({
            message:
              "Sorry for the inconvenience, we are having issues fetching our Alumni",
          });
          setAlumni([]);
        }
      } catch (err) {
        console.error("Error fetching alumni:", err);

        setError({
          message:
            "Sorry for the inconvenience, we are having issues fetching our Alumni",
        });
        setAlumni([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlumni();
  }, []);

  const enriched = useMemo<EnrichedAlumni[]>(
    () =>
      alumni.map((member) => {
        const designation = getDesignation(member);
        const domain = getDomainFromDesignation(designation);

        return {
          member,
          session:
            getSessionFromRollNumber(member.rollNumber) ?? UNKNOWN_SESSION,
          domain,
          rank: getMemberRank(domain, designation),
        };
      }),
    [alumni]
  );

  const sessions = useMemo(
    () => sortSessions([...new Set(enriched.map((entry) => entry.session))]),
    [enriched]
  );

  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0]);
    }
  }, [sessions, selectedSession]);

  const groupedAlumni = useMemo(() => {
    const groups: Record<string, EnrichedAlumni[]> = {};

    enriched
      .filter((entry) => entry.session === selectedSession)
      .forEach((entry) => {
        if (!groups[entry.domain]) {
          groups[entry.domain] = [];
        }

        groups[entry.domain].push(entry);
      });

    return Object.entries(groups)
      .sort(([a], [b]) => domainRank(a) - domainRank(b))
      .map(([domain, items]) => ({
        domain,
        members: [...items]
          .sort(
            (a, b) =>
              a.rank - b.rank || a.member.name.localeCompare(b.member.name)
          )
          .map((entry) => entry.member),
      }));
  }, [enriched, selectedSession]);

  return (
    <div className={styles.Alumni}>
      <h2>
        Meet Our{" "}
        <span
          style={{
            background: "var(--primary)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Alumni
        </span>
      </h2>

      {isLoading ? (
        <ComponentLoading
          customStyles={{
            width: "100%",
            height: "100%",
            display: "flex",
            marginTop: "5rem",
            marginBottom: "10rem",
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      ) : (
        <>
          {error && <div className={styles.error}>{error.message}</div>}

          <div className={styles.sessionButtons}>
            {sessions.map((session) => (
              <button
                key={session}
                onClick={() => setSelectedSession(session)}
                className={
                  selectedSession === session ? styles.activeSession : ""
                }
              >
                {session}
              </button>
            ))}
          </div>

          {groupedAlumni.map(({ domain, members }) => (
            <div key={domain}>
              <h3 className={styles.domainHeading}>{domain}</h3>
              <AlumniSection alumni={members} />
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Alumni;