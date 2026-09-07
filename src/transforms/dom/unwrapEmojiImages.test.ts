import { describe, expect, it } from 'bun:test'
import { defaultEmojiImageHosts } from '../../defaults.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { mergeEmojiNames, unwrapEmojiImages } from './unwrapEmojiImages.js'
import vocabularies from './unwrapEmojiImages.json' with { type: 'json' }
import { emojiPlatforms } from './unwrapEmojiImages.platforms.js'

const asciiLetterRegex = /[a-zA-Z]/
const conflictingNameRegex = /happy/

describeForEachParser('unwrapEmojiImages', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [unwrapEmojiImages(context)])
  }

  // An emoji image that keeps its picture is also marked. The marker has its own describe block
  // below, so it is dropped here to keep each case about the reason the image was kept.
  const transformKeeping = async (value: string, context: TransformContext = baseContext) => {
    return (await transform(value, context)).replaceAll(' data-emoji=""', '')
  }

  describe('WordPress (wp-smiley class + s.w.org host)', () => {
    it('should replace wp-smiley image with alt emoji', async () => {
      const value = html`
        <p>Hello
          <img
            src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png"
            alt="😉"
            class="wp-smiley"
          >
        </p>
      `
      const expected = '<p>Hello 😉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace multiple wp-smiley images in the same paragraph', async () => {
      const value = html`
        <p>
          <img alt="😉" class="wp-smiley"> and <img alt="😊" class="wp-smiley">
        </p>
      `
      const expected = '<p>😉 and 😊</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should handle wp-smiley alongside additional classes', async () => {
      const value = '<p><img alt="😀" class="wp-smiley emoji extra"></p>'
      const expected = '<p>😀</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace newer WP variant with class="emoji"', async () => {
      const value = html`
        <p>
          <img
            class="emoji"
            role="img"
            draggable="false"
            src="https://s.w.org/images/core/emoji/16.0.1/svg/1f914.svg"
            alt="🤔"
          >
        </p>
      `
      const expected = '<p>🤔</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // The alt is a gemoji shortcode we deliberately do not carry, but the filename names the
    // codepoint, so the picture states its own meaning. The mrgreen case below still covers an
    // untabled alt whose filename says nothing.
    it('should resolve a wp-smiley by its codepoint filename when the alt is untabled', async () => {
      const value = html`
        <p>
          <img
            src="https://s.w.org/images/core/emoji/12.0.0-1/72x72/1f40d.png"
            alt=":snake:"
            class="wp-smiley"
          >
        </p>
      `
      const expected = '<p>🐍</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace no-class WP variant matched by s.w.org URL', async () => {
      const value = html`
        <p>
          <img src="https://s.w.org/images/core/emoji/13.1.0/svg/1f680.svg" alt="🚀">
        </p>
      `
      const expected = '<p>🚀</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace a legacy wp-includes smilie whose alt is a shortcode', async () => {
      const value = html`
        <p>
          <img
            src="https://example.com/wp-includes/images/smilies/icon_smile.gif"
            alt=":)"
            class="wp-smiley"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave the lossy mrgreen smilie with its working image', async () => {
      const value = html`
        <p>
          <img
            src="https://example.com/wp-includes/images/smilies/mrgreen.gif"
            alt=":mrgreen:"
            class="wp-smiley"
          >
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should resolve a Tango icon-set filename once the face- prefix is dropped', async () => {
      const value = html`
        <p>
          <img
            class="wp-smiley"
            src="/wp-content/plugins/tango-smilies/tango/face-smile.png"
            alt=":)"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('WordPress.com (wpcom-smileys Twemoji)', () => {
    it('should replace WordPress.com wpcom-smileys image', async () => {
      const value = html`
        <p>
          <img
            src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/72x72/1f642.png"
            alt="🙂"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('XenForo (sprite smilies: data-URI src + data-shortname)', () => {
    // The src is the 1x1 transparent GIF XenForo paints its sprite sheet behind, so these
    // render as nothing in a reader. Kept verbatim from a real feed.
    const spriteSource =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    it('should replace a mapped sprite smilie with its glyph', async () => {
      const value = html`
        <p>Eigenwerbung...
          <img
            src="${spriteSource}"
            class="smilie smilie--sprite smilie--sprite8"
            alt=":D"
            title="Big grin    :D"
            loading="lazy"
            data-shortname=":D"
          >
        </p>
      `
      const expected = '<p>Eigenwerbung... 😃</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should match the shortname case-insensitively', async () => {
      const value = `<p><img src="${spriteSource}" data-shortname=":ROFLMAO:" alt=":ROFLMAO:"></p>`
      const expected = '<p>🤣</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // The shortname is not an emoji, so it is marked as fallback text rather than left as prose.
    it('should replace an unmapped sprite smilie with its literal shortname', async () => {
      const value = `<p><img src="${spriteSource}" data-shortname=":sk21_d1:" alt=":sk21_d1:"></p>`
      const expected = '<p><span data-emoji="">:sk21_d1:</span></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should never emit the title, which pads the name onto the shortcode', async () => {
      const value = html`
        <p>
          <img
            src="${spriteSource}"
            data-shortname=":confused:"
            alt=":confused:"
            title="Confused    :confused:"
          >
        </p>
      `
      const expected = '<p>😕</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // Pre-2.2 boards and modified templates omit data-shortname. The image still paints
    // nothing, so the smilie class plus a mapped alt is what rescues it.
    it('should replace a sprite smilie that has no data-shortname', async () => {
      const value = `<p><img src="${spriteSource}" class="smilie smilie--sprite" alt=":D"></p>`
      const expected = '<p>😃</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a sprite smilie untouched when nothing names it', async () => {
      const value = `<p><img src="${spriteSource}" class="smilie smilie--sprite"></p>`

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave an inlined data-URI image untouched when it is too long to be a spacer', async () => {
      const value = `<p><img src="data:image/png;base64,${'A'.repeat(300)}" data-shortname=":D"></p>`

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    // 1.x numbers its sprites in the class instead of carrying data-shortname, and points src at
    // a shared transparent PNG rather than a data URI.
    it('should replace a 1.x sprite named by its numbered class', async () => {
      const value = html`
        <p>
          <img
            src="styles/default/xenforo/clear.png"
            class="mceSmilieSprite mceSmilie7"
            alt=":p"
            title="Stick Out Tongue :p"
          >
        </p>
      `
      const expected = '<p>😛</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // The theme directory differs per board, so the `smilies` directory is what identifies a
    // self-hosted set. Converting these matches how phpBB's are already treated.
    it('should replace a self-hosted XenForo smilie from its theme directory', async () => {
      const value = html`
        <p>
          <img
            src="https://example.com/styles/default/xenforo/smilies/smile.png"
            class="smilie"
            alt=":)"
            data-shortname=":)"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should preserve position when the sprite is nested inside an anchor', async () => {
      const value = `<p><a href="/x">nice <img src="${spriteSource}" data-shortname=":)"> work</a></p>`
      const expected = '<p><a href="/x">nice 🙂 work</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should be idempotent', async () => {
      const value = `<p>Hi <img src="${spriteSource}" data-shortname=":D" alt=":D"></p>`
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })

  describe('JoyPixels CDN (host list)', () => {
    it('should replace an image whose alt is already the glyph', async () => {
      const value = html`
        <p>
          <img
            src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f642.png"
            alt="🙂"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace an image whose alt is a shortcode in the table', async () => {
      const value = html`
        <p>
          <img
            src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f642.png"
            class="smilie smilie--emoji"
            alt=":)"
            data-shortname=":)"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // Still a gap, though no longer for want of a decoder. A host match alone does not make the
    // vocabulary known, so a CDN image never reaches the filename table and the codepoint route
    // with it. Widening that is a separate decision about how much a bare host should imply.
    it('should leave a host-matched image with no usable alt alone', async () => {
      const value = html`
        <p>
          <img
            src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f1fa-1f1f8.png"
            alt=""
          >
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave an unhosted image with a codepoint filename untouched', async () => {
      const value = '<p><img src="https://forum.example.com/assets/1f642.png" alt=":nope:"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('phpBB (smilies class + /images/smilies/ path)', () => {
    it('should replace a smilie whose alt is a shortcode', async () => {
      const value = html`
        <p>
          <img
            class="smilies"
            src="https://example.com/images/smilies/icon_e_smile.gif"
            width="15"
            height="17"
            alt=":)"
            title="Smile"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace several smilies in one sentence', async () => {
      const value = html`
        <p>See
          <img class="smilies" src="/images/smilies/icon_arrow.gif" alt=":arrow:">
          and
          <img class="smilies" src="/images/smilies/icon_cool.gif" alt="8-)">
        </p>
      `
      const expected = '<p>See ➡️ and 😎</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should fall back to the filename when the alt is empty', async () => {
      const value = '<p><img class="smilies" src="/images/smilies/icon_wink.gif" alt=""></p>'
      const expected = '<p>😉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an unmapped smilie with its working image', async () => {
      const value = html`
        <p>
          <img class="smilies" src="/images/smilies/icon_mrgreen.gif" alt=":mrgreen:">
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    // The parent of the smilies directory is the theme name and differs per board, so these
    // are all the same set under different skins.
    it.each([
      '/themes/default/smilies/smile.png',
      '/dc2themes/mrvb6_sobre/smilies/smile.png',
      '/plxeditor/smilies/smile.png',
      '/style/BlueSky/smilies/smile.png',
    ])('should replace a smilie served from the theme directory %s', async (path) => {
      const value = `<p><img src="https://example.com${path}" alt=":)" class="smiley"></p>`

      expect(await transform(value)).toEqualHtml('<p>🙂</p>')
    })

    it.each(['smiley', 'smilie', 'mceSmilie'])(
      'should recognize the singular %s class other engines use',
      async (className) => {
        const value = `<p><img src="/x/smilies/wink.png" alt=";)" class="${className}"></p>`

        expect(await transform(value)).toEqualHtml('<p>😉</p>')
      },
    )

    it('should leave a non-smilie image served from the smilies folder untouched', async () => {
      const value = '<p><img src="https://example.com/images/smilies/banner.png" alt="Banner"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    // The board shipped the template variable unsubstituted, so the src is a placeholder and the
    // image cannot load anywhere. Text beats a broken picture, unlike every case above.
    it('should replace a smilie whose path is the raw placeholder', async () => {
      const value = `<p><img src="{SMILIES_PATH}/teeth_smile.gif" alt=":D" title="Very Happy"></p>`
      const expected = '<p>😃</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace a smilie whose placeholder arrived percent-encoded', async () => {
      const value = `<p><img src="%7BSMILIES_PATH%7D/wink_smile.gif" alt=";)"></p>`
      const expected = '<p>😉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should resolve a placeholder smilie by its alt when the filename carries no meaning', async () => {
      const value = `<p><img src="{SMILIES_PATH}/15.gif" alt=":cry:" title="Crying"></p>`
      const expected = '<p>😢</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // A placeholder src is a link the board failed to build, which is not this transform's to
    // repair. Unresolvable ones are left exactly as any other dead image would be.
    it('should leave a placeholder smilie that resolves to nothing alone', async () => {
      const value = `<p><img src="%7BSMILIES_PATH%7D/borracho.gif" alt="(borracho)" title="Borracho"></p>`

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('IPS / Invision (data-emoticon + /uploads/emoticons/ path)', () => {
    it('should replace an emoticon whose alt is a shortcode', async () => {
      const value = html`
        <p>
          <img
            alt=":)"
            data-emoticon=""
            height="20"
            src="https://example.com/uploads/emoticons/default_smile.png"
            srcset="https://example.com/uploads/emoticons/smile@2x.png 2x"
            title=":)"
            width="20"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should resolve a stock filename once the default_ prefix is dropped', async () => {
      const value = html`
        <p>
          <img
            data-emoticon="true"
            src="https://example.com/uploads/emoticons/default_wink.png"
            alt=""
          >
        </p>
      `
      const expected = '<p>😉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should resolve a filename carrying a resolution variant suffix', async () => {
      const value = html`
        <p>
          <img data-emoticon="" src="https://example.com/uploads/emoticons/biggrin@2x.png" alt="">
        </p>
      `
      const expected = '<p>😃</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a site-custom emoticon with its working image', async () => {
      const value = html`
        <p>
          <img alt=":yahoo:" data-emoticon="" src="https://example.com/uploads/emoticons/yahoo.png">
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('FluxBB / PunBB (/img/smilies/ path with word names)', () => {
    it('should replace a smilie named by a word rather than a shortcode', async () => {
      const value = html`
        <p>Compare the files
          <img src="https://example.com/forum/img/smilies/wink.png" width="15" height="15" alt="wink">
        </p>
      `
      const expected = '<p>Compare the files 😉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should resolve from the filename when the alt is empty', async () => {
      const value = '<p><img src="https://example.com/forum/img/smilies/big_smile.png" alt=""></p>'
      const expected = '<p>😃</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // Forums translate the alt but keep the stock English filename, so a localized board
    // resolves through the filename and the table needs no translations of its own.
    it('should replace a smilie whose alt is localized but filename is not', async () => {
      const value = '<p><img src="https://example.com/forum/img/smilies/love.gif" alt="Hjärta"></p>'
      const expected = '<p>😍</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace a French-labelled smilie from its stock filename', async () => {
      const value = html`
        <p>
          <img src="https://example.com/img/smilies/big_smile.png" alt="fou" width="15">
        </p>
      `
      const expected = '<p>😃</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // base64 may contain `/`, so a stem parsed out of a data URI is a slice of the payload.
    it('should not answer an unmapped sprite from its own base64 payload', async () => {
      const value = html`
        <p>
          <img src="data:image/gif;base64,AAA/smile" data-shortname=":totally_custom:">
        </p>
      `
      const expected = '<p><span data-emoji="">:totally_custom:</span></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a smilie from a custom theme pack with its working image', async () => {
      const value = html`
        <p>
          <img src="https://example.com/forum/img/smilies/haku/haku-smirk.svg" alt="壞笑">
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('engines named only by their smilie directory', () => {
    // None of these carry a usable class, so the smilie directory is the only signal. All three
    // spellings are in use in the wild.
    const pathCases: Array<[string, string, string]> = [
      ['Serendipity', 'http://example.com/templates/default/img/emoticons/wink.png', '😉'],
      [
        'Serendipity custom theme',
        'http://example.com/templates/schluetersde/img/emoticons/smile.png',
        '🙂',
      ],
      ['Drupal smileys module', 'http://example.com/misc/smileys/smile.png', '🙂'],
      ['blog smileys directory', 'http://example.com/images/smileys/big_smile.gif', '😃'],
      ['Kunena emoticons directory', 'http://example.com/media/kunena/emoticons/unsure.png', '😕'],
    ]

    it.each(pathCases)('should replace a %s smilie', async (_engine, source, expected) => {
      const value = `<p><img src="${source}" alt=""></p>`

      expect(await transform(value)).toEqualHtml(`<p>${expected}</p>`)
    })

    it('should leave a site-custom smilie set untouched', async () => {
      const value = '<p><img src="http://example.com/smilies/yahoo_laughloud.gif" alt=":))"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('ArtStation (/mailer/emoji/ path with a generic emoji class)', () => {
    // The generic class is read for a glyph alt and never for a shortcode, so the path is what
    // lets the filename be looked up.
    it('should replace an emoji named only by its path', async () => {
      const value = html`
        <p>
          <img class="emoji" alt="smiley" src="https://cdn.artstation.com/mailer/emoji/smiley.png">
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an emoji whose name is not in the table alone', async () => {
      const value = html`
        <p>
          <img
            class="emoji"
            alt="partying"
            src="https://cdn.artstation.com/mailer/emoji/partying.png"
          >
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('engines with a single distinguishing case', () => {
    // Each entry is markup as the engine actually emits it into feed content, so the awkward
    // parts are deliberate: MyBB's alt is an English name, vBulletin's is empty, FCKeditor
    // ships neither alt nor class, and IPB 2 puts the filename in the alt.
    const engineCases: Array<[string, string, string]> = [
      [
        'SMF',
        '<img src="https://example.com/forum/Smileys/default/wink.gif" alt=";)" title="Wink" class="smiley">',
        '😉',
      ],
      [
        'MyBB',
        '<img src="https://example.com/images/smilies/angry.gif" alt="Angry" title="Angry" class="smilie smilie_26">',
        '😠',
      ],
      [
        'vBulletin',
        '<img src="https://example.com/images/smilies/smile.gif" border="0" alt="" title="Smile" class="inlineimg">',
        '🙂',
      ],
      [
        'DokuWiki',
        '<img src="https://example.com/lib/images/smileys/smile.svg" class="icon smiley" alt=":-)">',
        '🙂',
      ],
      [
        'Vanilla',
        '<img class="emoji" src="https://example.com/resources/emoji/smile.png" title=":smile:" alt=":smile:" height="20">',
        '🙂',
      ],
      [
        'CKEditor',
        '<img src="/ckeditor/plugins/smiley/images/regular_smile.gif" title="smiley" alt="smiley">',
        '🙂',
      ],
      ['FCKeditor', '<img src="/editor/images/smiley/msn/wink_smile.gif">', '😉'],
      // Both spellings ship in the wild, and the corrected one is the commoner of the two.
      [
        'CKEditor corrected tongue',
        '<img src="/ckeditor/plugins/smiley/images/tongue_smile.png" alt="cheeky" title="cheeky">',
        '😛',
      ],
      ['TinyMCE 4', '<img src="/tinymce/plugins/emoticons/img/smiley-cool.gif" alt="cool">', '😎'],
      [
        'Invision Power Board 3',
        '<img src="/public/style_emoticons/default/smile.png" class="bbc_emoticon" alt=":)">',
        '🙂',
      ],
      [
        'Invision Power Board 2',
        '<img src="/style_emoticons/default/smile.gif" emoid=":)" alt="smile.gif">',
        '🙂',
      ],
      [
        'e107',
        '<img class="e-emoticon" src="/e107_images/emotes/default/smile.png" alt="smile">',
        '🙂',
      ],
      [
        'Simple:Press',
        '<img src="/wp-content/forum-smileys/sf-wink.gif" width="15" class="sfimageleft" title="wink" alt="wink">',
        '😉',
      ],
      // From the engines' own default sets rather than from corpus tokens, so these cover
      // boards the corpus never sampled. The last two are misspelled in the distributions.
      [
        'phpBB geek',
        '<img class="smilies" src="/images/smilies/icon_e_geek.svg" alt="" title="Geek">',
        '🤓',
      ],
      [
        'SMF sealed lips',
        '<img src="/Smileys/fugue/lipsrsealed.png" alt="" title="Lips sealed" class="smiley">',
        '🤐',
      ],
      [
        'e107 suprised',
        '<img class="e-emoticon" src="/e107_images/emotes/default/suprised.png" alt="">',
        '😲',
      ],
      [
        'e107 cheesey',
        '<img class="e-emoticon" src="/e107_images/emotes/default/cheesey.png" alt="">',
        '😁',
      ],
      // Boards add clap.gif to several engines' sets. The shortcode alt already resolved. This
      // is the localized-title case where only the filename says what the picture is.
      [
        'community-added clap',
        '<img class="smiley" src="https://example.com/images/smilies/clap.gif" alt="" title="Beifall">',
        '👏',
      ],
    ]

    it.each(engineCases)('should replace a %s smilie', async (_engine, tag, expected) => {
      expect(await transform(`<p>${tag}</p>`)).toEqualHtml(`<p>${expected}</p>`)
    })
  })

  describe('WoltLab (codepoint filenames under /smilies/)', () => {
    // The file is named after the codepoint, so only the alt says what the picture is.
    const shortcodeCases: Array<[string, string, string]> = [
      [':thumbup:', '1f44d', '👍'],
      [':saint:', '1f607', '😇'],
    ]

    it.each(shortcodeCases)(
      'should replace a %s smilie from its alt',
      async (shortcode, codepoint, expected) => {
        const value = html`
        <p>
          <img
            src="https://example.com/images/smilies/emojione/${codepoint}.png"
            alt="${shortcode}"
            title="${shortcode}"
            class="smiley"
            height="23"
          >
        </p>
      `

        expect(await transform(value)).toEqualHtml(`<p>${expected}</p>`)
      },
    )
  })

  describe('Khoros / Lithium (/i/smilies/ stock faces)', () => {
    // The alt and title are translated per board, so the stock filename is the only stable key.
    const faceCases: Array<[string, string, string]> = [
      ['smiley-happy', 'Smiley heureux', '🙂'],
      ['smiley-wink', "Smiley clignant de l'œil", '😉'],
      ['smiley-very-happy', 'Smiley très heureux', '😃'],
      ['smiley-tongue', 'Emotikon: Język', '😛'],
      ['smiley-sad', 'Emotikon: Smutny', '🙁'],
      ['smiley-surprised', 'Emotikon: Zaskoczony', '😲'],
      ['smiley-lol', 'Smiley LOL', '😄'],
      ['smiley-embarrassed', 'Smiley Embarrassed', '😳'],
      ['smiley-indifferent', 'Smiley Indifferent', '😐'],
      ['heart', 'Cœur', '❤️'],
      ['cat-happy', 'Chat heureux', '😺'],
      ['cat-very-happy', 'Chat très heureux', '😸'],
      ['cat-lol', 'Chat MDR', '😹'],
    ]

    it.each(faceCases)('should replace the %s face', async (name, alt, expected) => {
      const value = html`
        <p>
          <img
            id="${name}"
            class="emoticon emoticon-${name}"
            src="https://example.com/i/smilies/16x16_${name}.png"
            alt="${alt}"
            title="${alt}"
          >
        </p>
      `

      expect(await transform(value)).toEqualHtml(`<p>${expected}</p>`)
    })

    // The set also draws each expression on a cat, a man, a woman and a robot. Unicode's cat
    // faces cover the three smiles but not a winking or tongue-out one, so swapping those would
    // change the expression.
    const keptCases: Array<[string, string]> = [
      ['cat', '16x16_cat-wink'],
      ['woman', '16x16_woman-happy'],
      ['robot', '16x16_robot-lol'],
    ]

    it.each(keptCases)('should leave the %s variant with its picture', async (_species, name) => {
      const value = `<p><img class="emoticon" src="https://example.com/i/smilies/${name}.png" alt="Wink"></p>`

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    // Between annoyed, weary and pouting there is no single face this one obviously means.
    it('should leave the frustrated face with its picture', async () => {
      const value = html`
        <p>
          <img
            class="emoticon emoticon-smileyfrustrated"
            src="https://example.com/i/smilies/16x16_smiley-frustrated.png"
            alt="Smiley frustré"
          >
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    // Some boards replace the stock art with a licensed set whose files are numbered, leaving
    // nothing in the markup that names the picture.
    it('should leave a board-specific replacement set with its picture', async () => {
      const value = html`
        <p>
          <img
            class="emoticon emoticon-ClinDoeil"
            src="https://example.com/images/smilies/emoji_licence_46.png"
            alt=""
          >
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should be idempotent', async () => {
      const value = html`
        <p>Hi
          <img
            class="emoticon emoticon-smileywink"
            src="https://example.com/i/smilies/16x16_smiley-wink.png"
            alt="Smiley clignant"
          >
        </p>
      `
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })

  describe('Telegram (tg-emoji element)', () => {
    it('should replace the element with the glyph it wraps', async () => {
      const value = '<p>Nice work <tg-emoji emoji-id="5368324170671202286">👍</tg-emoji> today</p>'
      const expected = '<p>Nice work 👍 today</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should replace several elements in one paragraph', async () => {
      const value = html`
        <p>
          <tg-emoji emoji-id="1">🔥</tg-emoji>
          <tg-emoji emoji-id="2">🎉</tg-emoji>
        </p>
      `
      const expected = '<p>🔥🎉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should preserve position inside a link', async () => {
      const value = '<p><a href="/x">go <tg-emoji emoji-id="1">👍</tg-emoji></a></p>'
      const expected = '<p><a href="/x">go 👍</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep a multi-codepoint fallback intact', async () => {
      const value = '<p><tg-emoji emoji-id="1">👨‍👩‍👧</tg-emoji></p>'
      const expected = '<p>👨‍👩‍👧</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should mark the text of a fallback that is not an emoji', async () => {
      const value = '<p><tg-emoji emoji-id="1">[cat]</tg-emoji></p>'
      const expected = '<p><span data-emoji="">[cat]</span></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should flatten a fallback wrapped in another element', async () => {
      const value = '<p><tg-emoji emoji-id="1"><span>👍</span></tg-emoji></p>'
      const expected = '<p>👍</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an empty element untouched', async () => {
      const value = '<p>a <tg-emoji emoji-id="1"></tg-emoji> b</p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    // The facades this package rebuilds into real iframes are custom elements too, so the tag
    // list stays explicit rather than unwrapping anything hyphenated that wraps text.
    it('should leave other custom elements untouched', async () => {
      const value = html`
        <p>
          <lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>
          <my-widget>text</my-widget>
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should be idempotent', async () => {
      const value = '<p>Hi <tg-emoji emoji-id="1">👍</tg-emoji></p>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })

  describe('Mastodon (custom_emojis path with an emojione class)', () => {
    // Custom emoji have no Unicode counterpart at all, so there is nothing to convert them to.
    it('should leave a custom emoji with its picture', async () => {
      const value = html`
        <p>
          <img
            rel="emoji"
            class="emojione"
            alt=":catjam:"
            src="https://files.mastodon.social/custom_emojis/images/000/224/097/original/d9c.gif"
          >
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('Weibo (sinaimg emoticon path)', () => {
    it('should leave an emoticon with a bracketed localized alt untouched', async () => {
      const value = html`
        <p>
          <span class="url-icon">
            <img alt="[围观]" src="https://h5.sinaimg.cn/m/emoticon/icon/others/o_weiguan.png">
          </span>
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('Ameba (ucs char and author-uploaded emoji paths)', () => {
    // The alt is the Japanese name of the picture, not a shortcode and not a glyph, so there is
    // nothing to convert either set to.
    it('should leave a built-in char image with its picture', async () => {
      const value = html`
        <p>
          <img src="https://stat100.ameba.jp/blog/ucs/img/char/char3/084.png" alt="ラブラブ" width="24" height="24">
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave a built-in char image served from the c subdomain with its picture', async () => {
      const value = html`
        <p>
          <img src="https://c.stat100.ameba.jp/blog/ucs/img/char/char4/610.png" alt="ニヤニヤ" width="24" height="24">
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave an author-uploaded emoji with its picture', async () => {
      const value = html`
        <p>
          <img src="https://emoji.ameba.jp/img/user/ho/hokkokuamaebi/4409391.gif" alt="ベルギー" border="0">
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should not touch an ordinary post image on the same domain', async () => {
      const value = html`
        <p>
          <img src="https://stat.ameba.jp/user_images/20220822/15/rci-kobe/39/39/j/o10801204.jpg" alt="">
        </p>
      `

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('Discourse (emoji class with shortcode alt)', () => {
    it('should leave Discourse shortcode-alt with class="emoji" untouched', async () => {
      const value = '<p><img class="emoji" alt=":slight_smile:"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('Facebook (embedded posts)', () => {
    it('should replace Facebook emoji image', async () => {
      const value = html`
        <p>
          <img
            height="16"
            width="16"
            alt="🙂"
            referrerpolicy="origin-when-cross-origin"
            src="https://static.xx.fbcdn.net/images/emoji.php/v9/t4c/1/16/1f642.png"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('Twitter / X (embedded tweets)', () => {
    it('should replace Twitter/X emoji image', async () => {
      const value = '<p><img src="https://abs.twimg.com/emoji/v2/72x72/1f600.png" alt="😀"></p>'
      const expected = '<p>😀</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('GitHub (gemoji README scrapings)', () => {
    it('should replace GitHub gemoji image when alt is the emoji glyph', async () => {
      const value = html`
        <p>
          <img
            src="https://github.githubassets.com/images/icons/emoji/unicode/1f680.png"
            alt="🚀"
          >
        </p>
      `
      const expected = '<p>🚀</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('codepoint filenames', () => {
    // Read for any engine the tables already cover. WoltLab names its whole default set this
    // way, across both the 1F plane and the BMP, but nothing here is specific to it.
    const codepointCases: Array<[string, string]> = [
      ['1f618', '😘'],
      ['1f62d', '😭'],
      ['2639', '☹'],
      ['263a', '☺'],
      ['1f1fa-1f1f8', '🇺🇸'],
    ]

    it.each(codepointCases)('should decode the filename %s', async (codepoint, expected) => {
      const value = html`
        <p>
          <img
            class="smiley"
            src="https://example.com/images/smilies/emojione/${codepoint}.png"
            alt=""
          >
        </p>
      `

      expect(await transform(value)).toEqualHtml(`<p>${expected}</p>`)
    })

    it('should decode a filename carrying a resolution variant suffix', async () => {
      const value = html`
        <p>
          <img
            class="smiley"
            src="https://example.com/images/smilies/emojione/1f44d@2x.png"
            alt=""
          >
        </p>
      `
      const expected = '<p>👍</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // Any engine, not one: this is a phpBB directory rather than WoltLab's.
    it('should decode under any recognized smilie directory', async () => {
      const value = html`
        <p>
          <img class="smilies" src="https://example.com/images/smilies/1f604.png" alt="">
        </p>
      `
      const expected = '<p>😄</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // Hex-shaped is not emoji-shaped, and each of these is a filename that really occurs:
    // e107 ships dead.png, and boards number their uploads.
    const hexShapedCases: Array<[string, string]> = [
      ['a sequential id, which decodes to a space', '2000'],
      ['a lone surrogate', 'dead'],
      ['a CJK ideograph', 'face'],
      ['a stem too long to be a codepoint', 'ffffff'],
    ]

    it.each(hexShapedCases)('should not decode %s', async (_reason, stem) => {
      const value = html`
        <p>
          <img class="smiley" src="https://example.com/images/smilies/${stem}.png" alt="">
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('data-emoji marker', () => {
    // Custom sets have no glyph to become, so the marker is the only thing a reader can act on.
    const markedCases: Array<[string, string, string]> = [
      [
        'Mastodon custom emoji',
        '<img class="emojione" alt=":catjam:" src="https://files.mastodon.social/custom_emojis/images/000/224/097/d9c.gif">',
        '<img data-emoji="" class="emojione" alt=":catjam:" src="https://files.mastodon.social/custom_emojis/images/000/224/097/d9c.gif">',
      ],
      [
        'Weibo emoticon',
        '<img alt="[微笑]" src="https://h5.sinaimg.cn/m/emoticon/icon/default/d_weixiao.png">',
        '<img data-emoji="" alt="[微笑]" src="https://h5.sinaimg.cn/m/emoticon/icon/default/d_weixiao.png">',
      ],
      [
        'phpBB smilie with no mapping',
        '<img class="smilies" src="/images/smilies/x.gif" alt=":mrgreen:">',
        '<img data-emoji="" class="smilies" src="/images/smilies/x.gif" alt=":mrgreen:">',
      ],
      [
        'IPS emoticon with no mapping',
        '<img data-emoticon="" src="/uploads/emoticons/yahoo.png" alt=":yahoo:">',
        '<img data-emoji="" data-emoticon="" src="/uploads/emoticons/yahoo.png" alt=":yahoo:">',
      ],
      [
        'emoji CDN image with no usable alt',
        '<img src="https://s.w.org/images/core/emoji/14/72x72/1f642.png" alt="?">',
        '<img data-emoji="" src="https://s.w.org/images/core/emoji/14/72x72/1f642.png" alt="?">',
      ],
      [
        'Ameba built-in char image',
        '<img src="https://stat100.ameba.jp/blog/ucs/img/char/char3/004.png" alt="ウインク" width="24" height="24">',
        '<img data-emoji="" src="https://stat100.ameba.jp/blog/ucs/img/char/char3/004.png" alt="ウインク" width="24" height="24">',
      ],
      [
        'Ameba author-uploaded emoji',
        '<img src="https://emoji.ameba.jp/img/user/sa/sayu74/118238.gif" alt="カナダ" border="0">',
        '<img data-emoji="" src="https://emoji.ameba.jp/img/user/sa/sayu74/118238.gif" alt="カナダ" border="0">',
      ],
    ]

    it.each(markedCases)('should mark a %s', async (_label, tag, marked) => {
      const value = `<p>${tag}</p>`
      const expected = `<p>${marked}</p>`

      expect(await transform(value)).toEqualHtml(expected)
    })

    // A smilie directory is matched loosely on purpose, so evidence that rests only on the path
    // is not enough to call something an emoji once it fails to resolve.
    const unmarkedCases: Array<[string, string]> = [
      [
        'banner in a smilies folder',
        '<img src="https://example.com/images/smilies/banner.png" alt="Banner">',
      ],
      [
        'ordinary photograph',
        '<img src="https://cdn.example.com/photo-1920.jpg" alt="A photograph">',
      ],
    ]

    it.each(unmarkedCases)('should not mark a %s', async (_label, tag) => {
      const value = `<p>${tag}</p>`

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not mark an image it converted', async () => {
      const value = '<p><img class="wp-smiley" alt="\u{1F642}"></p>'
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // Marking a glyph would style two identical emoji differently in one sentence, since an
    // author who typed theirs directly never had an image for us to mark.
    it('should leave a converted emoji indistinguishable from one the author typed', async () => {
      const value = html`
        <p>Nice 😉 work
          <img class="wp-smiley" src="https://s.w.org/images/core/emoji/14/72x72/1f609.png" alt="😉">
        </p>
      `
      const expected = '<p>Nice 😉 work 😉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should be idempotent', async () => {
      const value = '<p><img class="smilies" src="/images/smilies/x.gif" alt=":mrgreen:"></p>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })

    it('should be idempotent over fallback text it wrapped', async () => {
      const value = html`
        <p>
          <img
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            data-shortname=":sk21_d1:"
          >
        </p>
      `
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })

  describe('shortcode table', () => {
    const shortcodeEntries = Object.entries(vocabularies.shortcodes)

    // Iterates the real table, so every entry is exercised and a new entry is covered
    // automatically. A value carrying ASCII letters would inject a word into the document,
    // and an empty one would strand the wrapper it sat in for stripEmptyTags to delete.
    it.each(shortcodeEntries)('should map %s to a bare glyph', (_shortcode, glyph) => {
      expect(glyph).not.toBe('')
      expect(glyph).not.toMatch(asciiLetterRegex)
    })

    it('should key every entry in lower case so lookups can normalize', () => {
      const keys = Object.keys(vocabularies.shortcodes)

      expect(keys).toEqual(keys.map((key) => key.toLowerCase()))
    })
  })

  describe('platform filename tables', () => {
    const nameEntries = emojiPlatforms.flatMap((platform) =>
      Object.entries(platform.names ?? {}).map(
        ([name, glyph]) => [platform.name, name, glyph] as const,
      ),
    )

    it.each(nameEntries)('should map the %s name %s to a bare glyph', (_platform, _name, glyph) => {
      expect(glyph).not.toBe('')
      expect(glyph).not.toMatch(asciiLetterRegex)
    })

    it.each(nameEntries)(
      'should key the %s name %s in lower case, as getFileStem normalizes',
      (_platform, name) => {
        expect(name).toBe(name.toLowerCase())
      },
    )

    // A filename two platforms disagree on cannot be resolved without knowing the engine, which
    // the markup does not say, so the merge refuses rather than picking a winner.
    it('should reject two platforms mapping one filename to different glyphs', () => {
      const conflicting = [
        { name: 'one', names: { happy: '🙂' } },
        { name: 'two', names: { happy: '😄' } },
      ]

      expect(() => mergeEmojiNames(conflicting)).toThrow(conflictingNameRegex)
    })

    it('should accept the same filename when the platforms agree', () => {
      const agreeing = [
        { name: 'one', names: { smile: '🙂' } },
        { name: 'two', names: { smile: '🙂' } },
      ]

      expect(mergeEmojiNames(agreeing)).toEqual({ smile: '🙂' })
    })

    it('should merge the shipped platforms without conflict', () => {
      expect(() => mergeEmojiNames(emojiPlatforms)).not.toThrow()
    })
  })

  describe('configurable host list', () => {
    // Iterates the real default list, so every entry is exercised and a new entry
    // is covered automatically.
    it.each(defaultEmojiImageHosts)('should replace an emoji image from %s', async (host) => {
      const value = `<p>Hi <img src="https://${host}1f642.png" alt="🙂"></p>`
      const expected = '<p>Hi 🙂</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('alt-shape guard', () => {
    it('should preserve multi-codepoint alt (ZWJ sequence)', async () => {
      const value = '<p><img alt="👨‍👩‍👧" class="wp-smiley"></p>'
      const expected = '<p>👨‍👩‍👧</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should preserve skin-tone modifier alt', async () => {
      const value = '<p><img alt="👋🏽" class="wp-smiley"></p>'
      const expected = '<p>👋🏽</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should preserve BMP-only emoji (length 1 in JS)', async () => {
      const value = '<p><img class="wp-smiley" alt="✔"></p>'
      const expected = '<p>✔</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    // These are real alts from localized boards. The old guard accepted anything non-ASCII
    // without ASCII letters, so each was injected into the text in place of its image.
    it.each(['壞笑', 'улыбка', '笑顔', 'χαμόγελο'])(
      'should leave image untouched when alt is the localized word %s',
      async (alt) => {
        const value = `<p><img src="emoji.png" alt="${alt}" class="wp-smiley"></p>`

        expect(await transformKeeping(value)).toEqualHtml(value)
      },
    )

    // A subdivision flag is a base flag plus tag characters spelling the region code, so the
    // guard has to accept a class of character that appears in nothing else.
    it.each(['🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'])(
      'should replace image when alt is the subdivision flag %s',
      async (flag) => {
        const value = `<p><img class="wp-smiley" src="/f.png" alt="${flag}"></p>`

        expect(await transform(value)).toEqualHtml(`<p>${flag}</p>`)
      },
    )

    it('should leave image untouched when alt is a lone digit without a keycap', async () => {
      const value = '<p><img src="emoji.png" alt="7" class="wp-smiley"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should replace image when alt is several emoji separated by a space', async () => {
      const value = '<p><img src="emoji.png" alt="🙂 🎉" class="wp-smiley"></p>'
      const expected = '<p>🙂 🎉</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave image untouched when alt has mixed text', async () => {
      const value = '<p><img class="emoji" alt="hello 🐱"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave image untouched when alt is empty', async () => {
      const value = '<p><img src="emoji.png" alt="" class="wp-smiley"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave image untouched when alt is ASCII-only', async () => {
      const value = '<p><img src="emoji.png" alt="x" class="wp-smiley"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should never emit a "?" fallback alt as text', async () => {
      const value = '<p><img src="smilies/broken.png" alt="?" class="wp-smiley"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    // A "?" alt is WordPress failing to encode the emoji it meant. The filename still names the
    // codepoint, but decoding it is not worth its cost, so the image is left as it is.
    it('should leave an image with a "?" fallback alt alone', async () => {
      const value = html`
        <p>
          <img
            src="https://s.w.org/images/core/emoji/2.4/72x72/1f642.png"
            class="size_orig"
            alt="?"
          >
        </p>
      `

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave image untouched when alt attribute is missing', async () => {
      const value = '<p><img src="emoji.png" class="wp-smiley"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })

    it('should leave non-emoji images untouched', async () => {
      const value = '<p><img src="photo.jpg" alt="cat photo"></p>'

      expect(await transformKeeping(value)).toEqualHtml(value)
    })
  })

  describe('positional preservation', () => {
    it('should preserve position when emoji is nested inside an anchor', async () => {
      const value = '<p><a href="/x">click <img alt="🚀" class="wp-smiley"> here</a></p>'
      const expected = '<p><a href="/x">click 🚀 here</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should preserve position when emoji is nested inside strong', async () => {
      const value = '<p><strong>wow <img alt="🎉" class="wp-smiley"></strong></p>'
      const expected = '<p><strong>wow 🎉</strong></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>Hello
        <img
          src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png"
          alt="😉"
          class="wp-smiley"
        >
      </p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
