import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { discourseCiteResolver } from './discourse.js'

describeForEachParser('discourseCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, discourseCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://example.com/page#comment-1">
          <header class="source">
            <img
              src="https://forum.example.org/uploads/default/original/2X/1/icon.png"
              class="site-icon"
              alt=""
              data-dominant-color="B4C5E1"
              width="32"
              height="32"
            />
            <a href="https://example.com/page#comment-1" target="_blank" rel="noopener nofollow ugc">example.com</a>
          </header>
          <article class="onebox-body">
            <div class="aspect-image" style="--aspect-ratio:690/362;">
              <img
                src="https://forum.example.org/uploads/default/optimized/2X/d/thumb.jpeg"
                class="thumbnail"
                data-dominant-color="DEDEDE"
                width="690"
                height="362"
              />
            </div>
            <h3><a href="https://example.com/page#comment-1" target="_blank" rel="noopener nofollow ugc">Page title</a></h3>
            <p>Preview text</p>
          </article>
          <div class="onebox-metadata"></div>
          <div style="clear: both"></div>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page#comment-1',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://forum.example.org/uploads/default/original/2X/1/icon.png',
        thumbnail: 'https://forum.example.org/uploads/default/optimized/2X/d/thumb.jpeg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the source and title are present', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/page">
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should split the date suffix off the source into date', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://example.com/page">
          <header class="source">
            <img src="https://example.com/favicon.svg" class="site-icon" width="500" height="500">
            <a href="https://example.com/page" target="_blank" rel="noopener" title="03:33PM - 13 January 2023">Example – 13 Jan 23</a>
          </header>
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `

      expect(await extract(value)).toMatchObject({
        publisher: 'Example',
        date: '13 Jan 23',
      })
    })

    it('should leave the date unset when the source has no suffix', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/page">
          <header class="source">
            <a href="https://example.com/page">Example Forum</a>
          </header>
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `
      const result = await extract(value)

      expect(result?.publisher).toBe('Example Forum')
      expect(result?.date).toBeUndefined()
    })

    it('should read the title from a level-four heading', async () => {
      const value = html`
        <aside class="onebox githubissue" data-onebox-src="https://example.com/owner/repo/issues/1">
          <article class="onebox-body">
            <h4>Issue title</h4>
            <p>Issue body</p>
          </article>
        </aside>
      `

      expect((await extract(value))?.title).toBe('Issue title')
    })

    it('should extract the author, date, avatar and rejoined body from a GitHub onebox', async () => {
      const value = html`
        <aside class="onebox githubissue" data-onebox-src="https://github.com/owner/repo/issues/284">
          <header class="source">
            <a href="https://github.com/owner/repo/issues/284" target="_blank" rel="noopener">github.com/owner/repo</a>
          </header>
          <article class="onebox-body">
            <div class="github-row">
              <div class="github-info-container">
                <h4><a href="https://github.com/owner/repo/issues/284" target="_blank" rel="noopener">Issue title</a></h4>
                <div class="github-info">
                  <div class="date">
                    opened <span class="discourse-local-date" data-format="ll" data-date="2024-12-06" data-time="01:33:49" data-timezone="UTC">01:33AM - 06 Dec 24 UTC</span>
                  </div>
                  <div class="user">
                    <a href="https://github.com/author" target="_blank" rel="noopener">
                      <img alt="author" src="https://avatars.example.com/u/1" class="onebox-avatar-inline" width="20" height="20">
                      Author name
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div class="github-row">
              <p class="github-body-container">The visible half of the configur<span class="show-more-container"><a href="" rel="noopener" class="show-more">…</a></span><span class="excerpt hidden">ation preview.</span></p>
            </div>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://github.com/owner/repo/issues/284',
        title: 'Issue title',
        description: 'The visible half of the configuration preview.',
        author: 'Author name',
        publisher: 'github.com/owner/repo',
        date: '2024-12-06',
        icon: 'https://avatars.example.com/u/1',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a githubrepo onebox through the generic reads', async () => {
      const value = html`
        <aside class="onebox githubrepo" data-onebox-src="https://github.com/owner/repo">
          <header class="source">
            <a href="https://github.com/owner/repo" target="_blank" rel="noopener">github.com</a>
          </header>
          <article class="onebox-body">
            <div class="github-row">
              <img width="690" height="344" src="https://cdn.example.com/preview.png" class="thumbnail" />
              <h3><a href="https://github.com/owner/repo" target="_blank">GitHub - owner/repo</a></h3>
              <p><span class="github-repo-description">Repo description text.</span></p>
            </div>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://github.com/owner/repo',
        title: 'GitHub - owner/repo',
        description: 'Repo description text.',
        publisher: 'github.com',
        thumbnail: 'https://cdn.example.com/preview.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract the author, date and avatar from a Stack Exchange onebox', async () => {
      const value = html`
        <aside class="onebox stackexchange">
          <header class="source">
            <a href="https://stackoverflow.com/questions/1">stackoverflow.com</a>
          </header>
          <article class="onebox-body">
            <a href="https://stackoverflow.com/users/1/author" target="_blank">
              <img alt="Author name" src="https://www.gravatar.com/avatar/abc?s=128" class="thumbnail" width="" height="">
            </a>
            <h4><a href="https://stackoverflow.com/questions/1" target="_blank">Question title</a></h4>
            <div class="date">
              asked by <a href="https://stackoverflow.com/users/1/author" target="_blank">Author name</a> on <a href="https://stackoverflow.com/questions/1" target="_blank">12:42AM - 07 Sep 08</a>
            </div>
            <div><strong>c++, c, bit-manipulation</strong></div>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://stackoverflow.com/questions/1',
        title: 'Question title',
        author: 'Author name',
        publisher: 'stackoverflow.com',
        date: '12:42AM - 07 Sep 08',
        thumbnail: 'https://www.gravatar.com/avatar/abc?s=128',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A social post is not a link preview, so its onebox must not turn into a cite.
    it('should not match the social-post onebox', async () => {
      const value = html`
        <aside class="onebox twitterstatus" data-onebox-src="https://twitter.com/handle/status/1">
          <header class="source">
            <a href="https://twitter.com/handle/status/1" target="_blank" rel="noopener">twitter.com</a>
          </header>
          <article class="onebox-body">
            <img src="https://cdn.example.com/avatar.jpeg" class="thumbnail onebox-avatar" alt="" width="200" height="200">
            <h4><a href="https://twitter.com/handle/status/1" target="_blank" rel="noopener">Display name (@handle) on X</a></h4>
            <div class="twitter-screen-name"><a href="https://twitter.com/handle/status/1" target="_blank" rel="noopener">@handle</a></div>
            <div class="tweet"><span class="tweet-description">Tweet text</span></div>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should prefer the wrapper source over the inner anchor href', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/canonical">
          <article class="onebox-body">
            <h3><a href="https://example.com/tracked">Page title</a></h3>
          </article>
        </aside>
      `

      expect((await extract(value))?.url).toBe('https://example.com/canonical')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the source attribute is missing', async () => {
      const value = html`
        <aside class="onebox">
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/page">
          <article class="onebox-body">
            <p>Preview text</p>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
