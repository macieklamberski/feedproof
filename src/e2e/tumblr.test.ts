import { describe } from 'bun:test'

describe.todo('Tumblr', () => {
  // tumblrCiteResolver owns both NPF link shapes: the bare .npf_link anchor with its
  // data-npf JSON and the .npf-link-block card painted as markup. Unwrapping the
  // t.umblr.com and href.li redirectors stays with the injected cleanUrlFn on purpose.
})
