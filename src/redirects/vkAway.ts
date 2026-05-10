import { createParamExtractor } from '../utils.js'

// VK away redirect (vk.com/away.php?to=<target>).
export const extractVkAway = createParamExtractor({
  hosts: 'vk.com',
  path: '/away.php',
  params: ['to'],
})
