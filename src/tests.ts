import {
  defaultEmbedResolvers,
  defaultEmojiImageHosts,
  defaultInertSelectors,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultPreservedPreClasses,
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
  preservedPreClasses: defaultPreservedPreClasses,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}
