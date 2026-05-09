import { createParamExtractor } from '../utils.js'

// ICPTrack email click tracker (click.icptrack.com/icp/relay.php?...&destination=<target>).
export const extractIcptrack = createParamExtractor({
  hosts: 'click.icptrack.com',
  path: '/icp/relay.php',
  params: ['destination'],
})
