import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractSimplecastEpisode, simplecastResolveEmbed } from './simplecast.js'

const uuid = '7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

describe('extractSimplecastEpisode', () => {
  it('should read the current player uuid', () => {
    const value = `https://player.simplecast.com/${uuid}?dark=false`
    const expected = {
      id: uuid,
      isCurrent: true,
    }

    expect(extractSimplecastEpisode(value)).toEqual(expected)
  })

  it('should read the legacy embed id', () => {
    const value = 'https://embed.simplecast.com/a1b2c3d4?color=fff'
    const expected = {
      id: 'a1b2c3d4',
      isCurrent: false,
    }

    expect(extractSimplecastEpisode(value)).toEqual(expected)
  })

  it('should read the legacy numeric form', () => {
    const value = 'https://simplecast.com/e/1234567?style=medium'
    const expected = {
      id: '1234567',
      isCurrent: false,
    }

    expect(extractSimplecastEpisode(value)).toEqual(expected)
  })

  it('should return undefined for a simplecast url naming no episode', () => {
    const value = 'https://simplecast.com/pricing'

    expect(extractSimplecastEpisode(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractSimplecastEpisode(value)).toBeUndefined()
  })

  it('should return undefined for a simplecast url naming no path', () => {
    const value = 'https://simplecast.com/'

    expect(extractSimplecastEpisode(value)).toBeUndefined()
  })
})

describe('simplecastResolveEmbed', () => {
  // 200 in 75 of 75 sampled corpus iframes.
  it('should state the fixed player height', () => {
    const value = `https://player.simplecast.com/${uuid}`
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: uuid,
      src: `https://player.simplecast.com/${uuid}`,
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  it('should mint the player host from the share host, which names the same uuid', () => {
    const value = `https://play.simplecast.com/${uuid}`
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: uuid,
      src: `https://player.simplecast.com/${uuid}`,
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  // The legacy id is a separate id space: the server maps `fc9a4d22` to a uuid we cannot
  // compute, so the url stands and the iframe follows the redirect itself.
  it('should keep a legacy embed url rather than speak its id to the player host', () => {
    const value = 'https://embed.simplecast.com/a1b2c3d4'
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: 'a1b2c3d4',
      src: 'https://embed.simplecast.com/a1b2c3d4',
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  it('should keep a legacy numeric url', () => {
    const value = 'https://simplecast.com/e/1234567'
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: '1234567',
      src: 'https://simplecast.com/e/1234567',
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a simplecast url naming no episode', () => {
    const value = 'https://simplecast.com/pricing'

    expect(simplecastResolveEmbed(value)).toBeUndefined()
  })
})
