import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

let created: Blob[]
let revoked: string[]
let clicked: Array<{ href: string; download: string }>

beforeEach(() => {
  created = []
  revoked = []
  clicked = []
  URL.createObjectURL = vi.fn((blob: Blob) => {
    created.push(blob)
    return `blob:fake-${created.length}`
  })
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url)
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push({ href: this.href, download: this.download })
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('downloadTextFile', () => {
  it('saves the text under the given file name', async () => {
    downloadTextFile('backup.json', '{"a":1}', 'application/json')
    expect(clicked).toEqual([{ href: 'blob:fake-1', download: 'backup.json' }])
    expect(created).toHaveLength(1)
    expect(created[0].type).toBe('application/json')
    expect(await created[0].text()).toBe('{"a":1}')
  })

  it('keeps unusual characters intact', async () => {
    downloadTextFile('x.json', 'Don’t Stop Believin’ — 🎹', 'application/json')
    expect(await created[0].text()).toBe('Don’t Stop Believin’ — 🎹')
  })

  it('leaves nothing behind in the page', () => {
    downloadTextFile('x.json', '{}', 'application/json')
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })

  it('releases the temporary address once the download has started, not before', () => {
    downloadTextFile('x.json', '{}', 'application/json')
    expect(revoked).toEqual([])
    vi.advanceTimersByTime(5000)
    expect(revoked).toEqual(['blob:fake-1'])
  })
})
