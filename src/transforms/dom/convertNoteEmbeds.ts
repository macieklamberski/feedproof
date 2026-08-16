import { startsWithAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, hasText } from '../../utils/dom.js'

// note.com ships every embed as an empty <figure> that only its web client hydrates, naming the
// target in `data-src`. Nothing renders it in a reader, so the embed is lost: the figure survives
// `stripEmptyTags` because note.com writes a uuid into `name` and `id`, which means the loss is
// silent in the output rather than visible in it. Giving the url an <iframe> carrier is what puts
// it back on the pipeline, where `convertWidgets` treats it like any other frame.
//
// The carrier is emitted on the strength of what note.com says the figure is, not on a guess
// about whether a given host will frame. Any guess available here is the wrong one: a registry
// lookup answers "does a resolver rewrite this url", which is not the same question as "does
// this page frame", and the two disagree in both directions. `adventar.org` sends neither
// `x-frame-options` nor a CSP and no resolver claims it, so a registry check would have degraded
// a url that frames fine. Answering the real question needs a network round trip, which
// `extract` may not do.
//
// `embedded-service` names the platform but is not read, only matched on. It is an unpublished
// vocabulary note.com controls, spelled inconsistently (`githubRepository`, `tiktok-web`,
// `note-qa`), and the same platform lands in different values depending on the url shape: an
// Instagram post arrives as `oembed` and an Instagram reel as `external-article`. So the url is
// the only honest signal, and it is passed on untouched.
//
// `data-src` is always a canonical page url, never a player: across 1,213 figures sampled from
// live articles, none carried one.
// Those pages overwhelmingly refuse framing (YouTube, X, TikTok, Instagram and stand.fm answer
// SAMEORIGIN or DENY, Spotify sends a restrictive frame-ancestors), so a figure only reaches a
// reader as something watchable when a resolver reads the page url off the carrier and mints the
// player url from it. That is what `notecomIframeEmbedResolver` and the page-url branches of the
// twitter, tiktok and stand.fm resolvers exist for, and this transform is what feeds them.
export const convertNoteEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('figure[embedded-service][data-src]')) {
    const source = attr(element, 'data-src')

    if (!source || !startsWithAnyOf(source, ['http://', 'https://'])) {
      continue
    }

    // A figure already holding markup is showing the reader something, which is how an
    // `external-article` card arrives, so only an empty one is worth replacing.
    if (element.firstElementChild || hasText(element)) {
      continue
    }

    const iframe = document.createElement('iframe')

    iframe.setAttribute('src', source)
    element.replaceWith(iframe)
  }
}
