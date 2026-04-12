import { applyDomTransforms, applyStringTransforms } from './common.js'
import {
  defaultDomTransforms,
  defaultEmbedDomains,
  defaultResolveEmbed,
  defaultStringTransforms,
} from './defaults.js'
import type {
  DomTransform,
  StringTransform,
  TransformContentOptions,
  TransformContext,
} from './types.js'

const filterStringTransforms = (
  transforms: Array<StringTransform>,
  toggles?: TransformContentOptions['transforms'],
): Array<StringTransform> => {
  if (!toggles) {
    return transforms
  }

  return transforms.filter((transform) => {
    const name = transform.name as keyof NonNullable<TransformContentOptions['transforms']>
    return toggles[name] !== false
  })
}

const filterDomTransforms = (
  transforms: Array<DomTransform>,
  toggles?: TransformContentOptions['transforms'],
): Array<DomTransform> => {
  if (!toggles) {
    return transforms
  }

  return transforms.filter((transform) => {
    const name = transform.name as keyof NonNullable<TransformContentOptions['transforms']>
    return toggles[name] !== false
  })
}

export const transformContent = (html: string, options: TransformContentOptions = {}): string => {
  const context: TransformContext = {
    baseUrl: options.baseUrl,
    enclosures: options.enclosures,
    resolveEmbed: options.resolveEmbed ?? defaultResolveEmbed,
    embedDomains: options.embedDomains ?? defaultEmbedDomains,
  }

  // Phase 1: String transforms.
  const stringFns = filterStringTransforms(defaultStringTransforms, options.transforms)
  const afterString = applyStringTransforms(
    html,
    stringFns.map((transform) => transform(context)),
  )

  // Phase 2: DOM transforms.
  const domFns = filterDomTransforms(defaultDomTransforms, options.transforms)
  const afterDom = applyDomTransforms(
    afterString,
    domFns.map((transform) => transform(context)),
  )

  return afterDom
}
