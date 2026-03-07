import { describe, it, expect, afterEach } from 'vitest'
import { isSupported } from './browser'

describe('isSupported', () => {
    const original = globalThis.SharedArrayBuffer

    afterEach(() => {
        if (original === undefined) {
            delete (globalThis as Record<string, unknown>).SharedArrayBuffer
        } else {
            ;(globalThis as Record<string, unknown>).SharedArrayBuffer = original
        }
    })

    it('returns true when SharedArrayBuffer is defined', () => {
        ;(globalThis as Record<string, unknown>).SharedArrayBuffer = class {}
        expect(isSupported()).toBe(true)
    })

    it('returns false when SharedArrayBuffer is absent', () => {
        delete (globalThis as Record<string, unknown>).SharedArrayBuffer
        expect(isSupported()).toBe(false)
    })
})
