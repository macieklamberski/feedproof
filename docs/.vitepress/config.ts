import { defineConfig } from 'vitepress'

const indexMdRegex = /index\.md$/
const mdRegex = /\.md$/
const trailingSlashRegex = /\/$/

const hostname = 'https://feedsweep.dev'

export default defineConfig({
  title: 'Feedsweep',
  titleTemplate: ':title',
  description:
    'Tidy up the HTML content in web feeds. Fix feed-specific quirks so content displays in its best possible form.',
  lastUpdated: true,
  cleanUrls: true,
  sitemap: {
    hostname,
  },
  transformHead: ({ pageData }) => {
    const canonicalUrl = `${hostname}/${pageData.relativePath}`
      .replace(indexMdRegex, '')
      .replace(mdRegex, '')
      .replace(trailingSlashRegex, '')

    return [['link', { rel: 'canonical', href: canonicalUrl }]]
  },
  head: [
    ['meta', { property: 'og:site_name', content: 'Feedsweep' }],
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Feedsweep',
        url: hostname,
      }),
    ],
    [
      'script',
      {
        defer: '',
        src: '/beat.js',
        'data-domain': 'feedsweep.dev',
        'data-api': '/beat.json',
      },
    ],
  ],
  themeConfig: {
    outline: {
      level: [2, 3],
    },
    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quick Start', link: '/quick-start' },
          { text: 'How It Works', link: '/how-it-works' },
        ],
      },
      {
        text: 'Transforms',
        items: [
          { text: 'Overview', link: '/transforms' },
          { text: 'String Transforms', link: '/transforms/string' },
          { text: 'Media Recovery', link: '/transforms/media' },
          { text: 'Embed Recovery', link: '/transforms/embeds' },
          { text: 'Code Blocks', link: '/transforms/code' },
          { text: 'Links and URLs', link: '/transforms/urls' },
          { text: 'Text and Structure', link: '/transforms/structure' },
          { text: 'Content Cleanup', link: '/transforms/cleanup' },
          { text: 'Heuristics', link: '/transforms/heuristics' },
        ],
      },
      {
        text: 'Widgets',
        items: [
          { text: 'Overview', link: '/widgets' },
          { text: 'Embeds', link: '/widgets/embeds' },
          { text: 'Cites', link: '/widgets/cites' },
        ],
      },
      {
        text: 'Output',
        items: [
          { text: 'Data Attributes', link: '/output/data-attributes' },
          { text: 'Rendering', link: '/output/rendering' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Enclosures', link: '/guides/enclosures' },
          { text: 'Security', link: '/guides/security' },
          { text: "What's Built In", link: '/guides/built-in' },
          {
            text: 'Customization',
            collapsed: false,
            items: [
              { text: 'DOM Parsing', link: '/guides/customization/dom-parsing' },
              { text: 'URL Handling', link: '/guides/customization/url-handling' },
              { text: 'Enrichment', link: '/guides/customization/enrichment' },
              { text: 'Code Highlighting', link: '/guides/customization/code-highlighting' },
              { text: 'Custom Transforms', link: '/guides/customization/custom-transforms' },
            ],
          },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'transformContent', link: '/reference/transform-content' },
          { text: 'Utilities', link: '/reference/utilities' },
          { text: 'Types', link: '/reference/types' },
          { text: 'TypeScript', link: '/reference/typescript' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [
      {
        icon: 'npm',
        link: 'https://www.npmjs.com/package/feedsweep',
      },
      {
        icon: 'github',
        link: 'https://github.com/macieklamberski/feedsweep',
      },
      {
        icon: 'x',
        link: 'https://x.com/macieklamberski',
      },
    ],
  },
})
