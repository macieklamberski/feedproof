import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { discourseCiteResolver, omittedOneboxClasses, socialPostHosts } from './discourse.js'

describeForEachParser('discourseCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, discourseCiteResolver)

  describe('generic oneboxes', () => {
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
            <h3>
              <a href="https://example.com/page#comment-1" target="_blank" rel="noopener nofollow ugc">Page title</a>
            </h3>
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
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page',
        title: 'Page title',
        publisher: 'Example',
        date: '13 Jan 23',
        icon: 'https://example.com/favicon.svg',
      }

      expect(await extract(value)).toEqual(expected)
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
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page',
        title: 'Page title',
        publisher: 'Example Forum',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the wrapper source over the inner anchor href', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/canonical">
          <article class="onebox-body">
            <h3>
              <a href="https://example.com/tracked">Page title</a>
            </h3>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/canonical',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('GitHub oneboxes', () => {
    it('should read the title from a level-four heading', async () => {
      const value = html`
        <aside class="onebox githubissue" data-onebox-src="https://example.com/owner/repo/issues/1">
          <article class="onebox-body">
            <h4>Issue title</h4>
            <p>Issue body</p>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/owner/repo/issues/1',
        title: 'Issue title',
        description: 'Issue body',
      }

      expect(await extract(value)).toEqual(expected)
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
                <h4>
                  <a href="https://github.com/owner/repo/issues/284" target="_blank" rel="noopener">Issue title</a>
                </h4>
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
              <p class="github-body-container">The visible half of the configur<span class="show-more-container">
                  <a href="" rel="noopener" class="show-more">…</a>
                </span>
                <span class="excerpt hidden">ation preview.</span>
              </p>
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

    // The comment shape puts the author in a bare span and repeats it in the heading.
    it('should read the comment author from its span and drop it from the title', async () => {
      const value = html`
        <aside class="onebox githubpullrequest" data-onebox-src="https://github.com/owner/repo/pull/12#issuecomment-99">
          <header class="source">
            <a href="https://github.com/owner/repo/pull/12" target="_blank" rel="noopener">github.com/owner/repo</a>
          </header>
          <article class="onebox-body">
            <div class="github-row">
              <div class="github-info-container">
                <h4>
                  <a href="https://github.com/owner/repo/pull/12" target="_blank" rel="noopener">Comment by octocat - Fix the thing</a>
                </h4>
                <div class="github-info">
                  <div class="date">
                    commented <span class="discourse-local-date" data-format="ll" data-date="2025-03-04" data-time="09:12:00" data-timezone="UTC">09:12AM - 04 Mar 25 UTC</span>
                  </div>
                  <span>
                    <a href="https://github.com/octocat" target="_blank" rel="noopener">octocat</a>
                  </span>
                </div>
              </div>
            </div>
            <div class="github-row">
              <p class="github-body-container">The comment body.</p>
            </div>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://github.com/owner/repo/pull/12#issuecomment-99',
        title: 'Fix the thing',
        description: 'The comment body.',
        author: 'octocat',
        publisher: 'github.com/owner/repo',
        date: '2025-03-04',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a title that does not name the author', async () => {
      const value = html`
        <aside class="onebox githubpullrequest" data-onebox-src="https://github.com/owner/repo/pull/12">
          <header class="source">
            <a href="https://github.com/owner/repo/pull/12" target="_blank" rel="noopener">github.com/owner/repo</a>
          </header>
          <article class="onebox-body">
            <div class="github-row">
              <div class="github-info-container">
                <h4>
                  <a href="https://github.com/owner/repo/pull/12" target="_blank" rel="noopener">Fix the thing (#12)</a>
                </h4>
                <div class="github-info">
                  <span>
                    <a href="https://github.com/octocat" target="_blank" rel="noopener">octocat</a>
                  </span>
                </div>
              </div>
            </div>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://github.com/owner/repo/pull/12',
        title: 'Fix the thing (#12)',
        author: 'octocat',
        publisher: 'github.com/owner/repo',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the folder description from its label span, not the path', async () => {
      const value = html`
        <aside class="onebox githubfolder" data-onebox-src="https://github.com/owner/repo/tree/main/lib">
          <header class="source">
            <a href="https://github.com/owner/repo/tree/main/lib" target="_blank">github.com</a>
          </header>
          <article class="onebox-body">
            <h3>
              <a href="https://github.com/owner/repo/tree/main/lib">repo/lib at main</a>
            </h3>
            <p>
              <a href="https://github.com/owner/repo/tree/main/lib">main/lib</a>
            </p>
            <p>
              <span class="label1">The repo description text.</span>
            </p>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://github.com/owner/repo/tree/main/lib',
        title: 'repo/lib at main',
        description: 'The repo description text.',
        publisher: 'github.com',
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
              <h3>
                <a href="https://github.com/owner/repo" target="_blank">GitHub - owner/repo</a>
              </h3>
              <p>
                <span class="github-repo-description">Repo description text.</span>
              </p>
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
  })

  describe('file oneboxes (omitted)', () => {
    it('should not match the pdf onebox', async () => {
      const value = html`
        <aside class="onebox pdf" data-onebox-src="https://example.com/paper.pdf">
          <header class="source">
            <a href="https://example.com/paper.pdf" target="_blank">example.com</a>
          </header>
          <article class="onebox-body">
            <span class="pdf-onebox-logo"></span>
            <h3>
              <a href="https://example.com/paper.pdf">paper.pdf</a>
            </h3>
            <p class="filesize">697 KB</p>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('Stack Exchange oneboxes', () => {
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
            <h4>
              <a href="https://stackoverflow.com/questions/1" target="_blank">Question title</a>
            </h4>
            <div class="date">
              asked by <a href="https://stackoverflow.com/users/1/author" target="_blank">Author name</a> on <a href="https://stackoverflow.com/questions/1" target="_blank">12:42AM - 07 Sep 08</a>
            </div>
            <div>
              <strong>c++, c, bit-manipulation</strong>
            </div>
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
  })

  describe('Hacker News oneboxes', () => {
    it('should leave the description unset on a link post whose only paragraph is the stats line', async () => {
      const value = html`
        <aside class="onebox hackernews" data-onebox-src="https://news.ycombinator.com/item?id=28680387">
          <header class="source">
            <img src="https://cdn.example.com/y18.svg" class="site-icon" alt="" width="18" height="18">
            <a href="https://news.ycombinator.com/item?id=28680387" target="_blank" rel="noopener">news.ycombinator.com</a>
          </header>
          <article class="onebox-body">
            <h3>
              <a href="https://news.ycombinator.com/item?id=28680387" target="_blank" rel="noopener">Story title</a>
            </h3>
            <p>
              <span class="label1">379 points</span> —
              <span class="label2">127 comments</span> —
              <a href="https://news.ycombinator.com/user?id=poster" class="author" target="_blank" rel="noopener">poster</a> —
              <a href="https://news.ycombinator.com/item?id=28680387" class="timestamp" target="_blank" rel="noopener">8:09 AM - 28 Sep 2021</a>
            </p>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://news.ycombinator.com/item?id=28680387',
        title: 'Story title',
        author: 'poster',
        publisher: 'news.ycombinator.com',
        date: '8:09 AM - 28 Sep 2021',
        icon: 'https://cdn.example.com/y18.svg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the self-post text over the stats line', async () => {
      const value = html`
        <aside class="onebox hackernews" data-onebox-src="https://news.ycombinator.com/item?id=12759520">
          <header class="source">
            <a href="https://news.ycombinator.com/item?id=12759520" target="_blank" rel="noopener">news.ycombinator.com</a>
          </header>
          <article class="onebox-body">
            <h3>
              <a href="https://news.ycombinator.com/item?id=12759520" target="_blank" rel="noopener">Story title</a>
            </h3>
            <p>The text the poster wrote for the self-post.</p>
            <p>
              <span class="label1">391 points</span> —
              <span class="label2">265 comments</span> —
              <a href="https://news.ycombinator.com/user?id=poster" class="author" target="_blank" rel="noopener">poster</a> —
              <a href="https://news.ycombinator.com/item?id=12759520" class="timestamp" target="_blank" rel="noopener">11:30 AM - 21 Oct 2016</a>
            </p>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://news.ycombinator.com/item?id=12759520',
        title: 'Story title',
        description: 'The text the poster wrote for the self-post.',
        author: 'poster',
        publisher: 'news.ycombinator.com',
        date: '11:30 AM - 21 Oct 2016',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('omitted oneboxes', () => {
    // Iterates the real exclusion list, so every entry is exercised and a new entry is
    // covered automatically.
    it.each(omittedOneboxClasses)('should not match the %s onebox', async (engine) => {
      const value = html`
        <aside class="onebox ${engine}" data-onebox-src="https://example.com/post/1">
          <header class="source">
            <a href="https://example.com/post/1" target="_blank" rel="noopener">example.com</a>
          </header>
          <article class="onebox-body">
            <h4><a href="https://example.com/post/1" target="_blank" rel="noopener">Author name on Platform</a></h4>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it.each(socialPostHosts)('should not cite a generic onebox of a %s post', async (host) => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://${host}/profile/user/post/1">
          <header class="source">
            <a href="https://${host}/profile/user/post/1" target="_blank" rel="noopener">${host}</a>
          </header>
          <article class="onebox-body">
            <h3><a href="https://${host}/profile/user/post/1">Author name (@handle)</a></h3>
            <p>Post text</p>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not cite a generic onebox of a Mastodon status, recognized by its url shape', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://mastodon.social/@Gargron/117060465546524768">
          <header class="source">
            <a href="https://mastodon.social/@Gargron/117060465546524768" target="_blank" rel="noopener">mastodon.social</a>
          </header>
          <article class="onebox-body">
            <h3>
              <a href="https://mastodon.social/@Gargron/117060465546524768">Eugen Rochko (@Gargron@mastodon.social)</a>
            </h3>
            <p>Post text</p>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not cite a generic onebox whose title carries a fediverse handle', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://mastodon.example/users/author/statuses/117060465546524768">
          <header class="source">
            <a href="https://mastodon.example/users/author/statuses/117060465546524768" target="_blank">mastodon.example</a>
          </header>
          <article class="onebox-body">
            <h3>Author name (@author@mastodon.example)</h3>
            <p>Post text</p>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should still cite an article whose path has an @author segment and a slug', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://blog.example.com/@author/why-i-did-it-3f2a1b9c">
          <header class="source">
            <a href="https://blog.example.com/@author/why-i-did-it-3f2a1b9c" target="_blank">blog.example.com</a>
          </header>
          <article class="onebox-body">
            <h3>
              <a href="https://blog.example.com/@author/why-i-did-it-3f2a1b9c">Why I did it</a>
            </h3>
            <p>Preview text</p>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://blog.example.com/@author/why-i-did-it-3f2a1b9c',
        title: 'Why I did it',
        description: 'Preview text',
        publisher: 'blog.example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should skip a social post whose url only sits on the source anchor', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric">
          <header class="source">
            <a href="https://bsky.app/profile/user/post/1" target="_blank">bsky.app</a>
          </header>
          <article class="onebox-body">
            <h3>
              <a href="https://bsky.app/profile/user/post/1">Author name (@handle)</a>
            </h3>
            <p>Post text</p>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
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
            <h4>
              <a href="https://twitter.com/handle/status/1" target="_blank" rel="noopener">Display name (@handle) on X</a>
            </h4>
            <div class="twitter-screen-name">
              <a href="https://twitter.com/handle/status/1" target="_blank" rel="noopener">@handle</a>
            </div>
            <div class="tweet">
              <span class="tweet-description">Tweet text</span>
            </div>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
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
