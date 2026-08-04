"use client";

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import skeletonStyles from './styles/TeamCard.module.scss';

/**
 * TeamCardSkeleton
 *
 * Loading placeholder that mirrors the exact shape and dimensions of the
 * full-bleed TeamCard so there is zero layout shift when the real card
 * mounts.
 *
 * Props
 * ─────
 * customStyles  object   Pass-through from TeamCard; can override .skeletonCard
 * size          string   "default" (default) | "featured" — mirrors the size
 *                        prop on the real TeamCard so the skeleton can be used
 *                        in the upcoming President/VP hero row without a
 *                        separate component.
 */
const TeamCardSkeleton = ({ customStyles = {}, size = "default" }) => (
  <SkeletonTheme baseColor="#313131" highlightColor="#525252">
    {/*
      Outer wrapper ─ same width/height/border-radius as .teamMember in the
      real TeamCard.  We give it position:relative so the name/role bars can
      be positioned absolutely inside it, exactly like .overlayInfo.
    */}
    <div
      className={[
        skeletonStyles.skeletonCard,
        size === "featured" ? skeletonStyles.featured : "",
        customStyles.skeletonCard || "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Full-bleed shimmer — fills the entire card */}
      <Skeleton
        className={skeletonStyles.skeletonFill}
        // height is driven by CSS; tell react-loading-skeleton not to
        // inject its own inline height so our CSS stays in control.
        height="100%"
        borderRadius="14px"
      />

      {/*
        Bottom name/role bars.

        WHY: Two short bars near the bottom communicate "photo card with a
        name and role" so the loaded card never surprises the user visually.

        TRADEOFF: Adds ~8 lines of SCSS and needs position:relative on the
        wrapper.  Risk is near-zero because it is fully self-contained.

        The bars mirror .overlayInfo { bottom: 20px } from the real card.
        react-loading-skeleton renders a <span>, which is fine inside a div.
      */}
      <div className={skeletonStyles.skeletonOverlayBars} aria-hidden="true">
        {/* Role bar — narrower, sits above the name */}
        <Skeleton
          className={skeletonStyles.skeletonRoleBar}
          height={10}
          width="38%"
          borderRadius={4}
        />
        {/* Name bar — wider */}
        <Skeleton
          className={skeletonStyles.skeletonNameBar}
          height={14}
          width="60%"
          borderRadius={4}
        />
      </div>
    </div>
  </SkeletonTheme>
);

export default TeamCardSkeleton;
