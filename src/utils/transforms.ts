import type { MaybePromise } from '../types.js'

export const applyDomTransforms = async (
  document: Document,
  transforms: Array<(document: Document) => MaybePromise<void>>,
): Promise<string> => {
  for (const transform of transforms) {
    await transform(document)
  }

  return document.body.innerHTML
}

export const applyStringTransforms = async (
  html: string,
  transforms: Array<(html: string) => MaybePromise<string>>,
): Promise<string> => {
  let output = html

  for (const transform of transforms) {
    output = await transform(output)
  }

  return output
}
