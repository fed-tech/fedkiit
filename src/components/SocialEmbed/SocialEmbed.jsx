"use client";

import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import useDimensions from '../../utils/hooks/useDimensions';
import AnimatedBox from '../../assets/animations/socialPageAnimation';
import socialLinks from '../../data/SocialLink.json';

/**
 * Client-only, because these cannot survive hydration.
 *
 * `react-social-media-embed` mints a fresh UUID per render and writes it into
 * both `id` and `className`, so the server's markup never matches the client's.
 * The sizes are the second half of the problem: they come from `useDimensions()`,
 * which reads `window` and so measures 0 on the server.
 *
 * Nothing is lost by skipping SSR — the visible post is drawn by Instagram's and
 * LinkedIn's own scripts after mount, so the server-rendered markup was only ever
 * an invisible placeholder.
 */
// `{ ssr: false }` is written out at both call sites on purpose: next/dynamic is
// a compile-time transform and rejects a shared options variable.
const InstagramEmbed = dynamic(
  () =>
    import('react-social-media-embed/dist/components/embeds/InstagramEmbed').then(
      (m) => m.InstagramEmbed,
    ),
  { ssr: false },
);
const LinkedInEmbed = dynamic(
  () =>
    import('react-social-media-embed/dist/components/embeds/LinkedInEmbed').then(
      (m) => m.LinkedInEmbed,
    ),
  { ssr: false },
);

const SocialEmbed = ({ type }) => {
  const {
    calculateInstagramWidth,
    calculateInstagramHeight,
    calculateInstagramReelWidth,
    calculateInstagramReelHeight,
    calculateLinkedInWidth,
    calculateLinkedInHeight
  } = useDimensions();

  let url, postUrl, width, height;

  switch (type) {
    case 'instagramTopPost':
      url = socialLinks.instagramTopPost;
      width = calculateInstagramWidth();
      height = calculateInstagramHeight();
      break;
    case 'instagramBottomPost':
      url = socialLinks.instagramBottomPost;
      width = calculateInstagramWidth();
      height = calculateInstagramHeight();
      break;
    case 'instagramReel':
      url = socialLinks.instagramReel;
      width = calculateInstagramReelWidth();
      height = calculateInstagramReelHeight();
      break;
    case 'linkedInPost':
      url = socialLinks.linkedInPost.url;
      postUrl = socialLinks.linkedInPost.postUrl;
      width = calculateLinkedInWidth();
      height = calculateLinkedInHeight();
      break;
    default:
      return null;
  }

  return (
    <AnimatedBox>
      {type === 'linkedInPost' ? (
        <LinkedInEmbed url={url} postUrl={postUrl} width={width} height={height} />
      ) : (
        <InstagramEmbed url={url} width={width} height={height} />
      )}
    </AnimatedBox>
  );
};

SocialEmbed.propTypes = {
  type: PropTypes.oneOf([
    'instagramTopPost',
    'instagramBottomPost',
    'instagramReel',
    'linkedInPost',
  ]).isRequired,
};

export default SocialEmbed;
