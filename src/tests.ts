import {
  defaultEmbedResolvers,
  defaultEmojiImageHosts,
  defaultInertSelectors,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from './defaults.js'
import type { TransformContext } from './types.js'

export const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  emojiImageHosts: defaultEmojiImageHosts,
  inertSelectors: defaultInertSelectors,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}
