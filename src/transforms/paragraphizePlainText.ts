import { autop } from '@wordpress/autop'
import type { StringTransform } from '../types.js'

const hasHtmlRegex = /<[a-z][a-z0-9]*[\s>]/i

export const paragraphizePlainText: StringTransform = () => {
  return (html) => {
    return hasHtmlRegex.test(html) ? html : autop(html)
  }
}
