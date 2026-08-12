/** Platform types supported by the Social Post system. */
export type Platform = 'instagram' | 'linkedin';

/** Shape of a social post document as stored in MongoDB / returned by API. */
export interface SocialPost {
  id: string;
  platform: Platform;
  url: string;
  embedUrl: string;
  caption: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a new social post via the API. */
export interface CreateSocialPostInput {
  platform: Platform;
  url: string;
  caption?: string;
  isVisible?: boolean;
}

/** Payload for updating an existing social post via the API. */
export interface UpdateSocialPostInput {
  platform?: Platform;
  url?: string;
  caption?: string;
  isVisible?: boolean;
}
