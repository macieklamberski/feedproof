import type { DomTransform } from '../../types.js'
import { attr, jsonAttr } from '../../utils/dom.js'
import { videoFileRegex } from '../../utils/urls.js'

type SetupConfig = {
  sources?: Array<{ src?: string }>
  poster?: string
}

// The file sits either in a `<source>` child or in the
// `sources` array of the `data-setup` json Video.js reads. Only a file a `<video>` can actually
// play counts: a stream manifest needs the javascript player to fetch and stitch its segments,
// so a native element pointed at one shows an empty box everywhere except Safari.
// `videoFileRegex` draws that line already, so nothing here has to detect "live".
const buildVideo = (document: Document, element: Element): Element | undefined => {
  const setup = jsonAttr<SetupConfig>(element, 'data-setup')
  const child = Array.from(element.querySelectorAll('source'))
    .map((source) => attr(source, 'src'))
    .find((source) => source && videoFileRegex.test(source))
  const source = child ?? setup?.sources?.find(({ src }) => src && videoFileRegex.test(src))?.src

  if (!source) {
    return
  }

  const video = document.createElement('video')
  video.setAttribute('src', source)
  video.setAttribute('controls', '')

  const poster = attr(element, 'poster') ?? setup?.poster

  if (poster) {
    video.setAttribute('poster', poster)
  }

  return video
}

// `<video-js>` is a custom element, so it renders as nothing at all until the Video.js script
// upgrades it. Video.js is a renderer and nothing more: it plays whatever the markup hands it,
// so this rebuilds the element from what the library itself defines, a `<source>` child or a
// `data-setup`, and knows about no platform in particular.
//
// An element naming no file is left alone. Either its url exists only in javascript, or the
// element stands for someone's hosted player and the id means something only that platform can
// read, which is a job for that platform's resolver.
export const rebuildVideoJsEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('video-js')) {
    const video = buildVideo(document, element)

    if (video) {
      element.replaceWith(video)
    }
  }
}
