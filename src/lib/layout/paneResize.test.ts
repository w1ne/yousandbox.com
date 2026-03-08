import { describe, it, expect } from 'vitest'
import { adjustLeftHandle, adjustRightHandle, PaneWidths } from './paneResize'

const base: PaneWidths = { left: 15, center: 55, right: 30 }

describe('adjustLeftHandle', () => {
    it('grows left and shrinks center when delta is positive', () => {
        const result = adjustLeftHandle(base, 5)
        expect(result.left).toBe(20)
        expect(result.center).toBe(50)
        expect(result.right).toBe(30)
    })

    it('shrinks left and grows center when delta is negative', () => {
        const result = adjustLeftHandle(base, -5)
        expect(result.left).toBe(10)
        expect(result.center).toBe(60)
        expect(result.right).toBe(30)
    })

    it('clamps left to minPct floor', () => {
        const result = adjustLeftHandle(base, -100)
        expect(result.left).toBe(10) // minPct default = 10
        expect(result.center).toBe(60)
        expect(result.right).toBe(30)
    })

    it('clamps left so center does not shrink below minPct', () => {
        const result = adjustLeftHandle(base, 100)
        // maxLeft = 100 - 30 - 10 = 60
        expect(result.left).toBe(60)
        expect(result.center).toBe(10)
        expect(result.right).toBe(30)
    })

    it('widths always sum to 100', () => {
        const result = adjustLeftHandle(base, 7)
        expect(result.left + result.center + result.right).toBeCloseTo(100)
    })

    it('respects custom minPct', () => {
        const result = adjustLeftHandle(base, -100, 5)
        expect(result.left).toBe(5)
    })
})

describe('adjustRightHandle', () => {
    it('grows center and shrinks right when delta is positive', () => {
        const result = adjustRightHandle(base, 10)
        expect(result.left).toBe(15)
        expect(result.center).toBe(65)
        expect(result.right).toBe(20)
    })

    it('shrinks center and grows right when delta is negative', () => {
        const result = adjustRightHandle(base, -10)
        expect(result.left).toBe(15)
        expect(result.center).toBe(45)
        expect(result.right).toBe(40)
    })

    it('clamps right to minPct floor', () => {
        const result = adjustRightHandle(base, 100)
        // maxCenter = 100 - 15 - 10 = 75
        expect(result.center).toBe(75)
        expect(result.right).toBe(10)
        expect(result.left).toBe(15)
    })

    it('clamps center to minPct floor', () => {
        const result = adjustRightHandle(base, -100)
        expect(result.center).toBe(10)
        expect(result.right).toBe(75)
        expect(result.left).toBe(15)
    })

    it('widths always sum to 100', () => {
        const result = adjustRightHandle(base, 5)
        expect(result.left + result.center + result.right).toBeCloseTo(100)
    })
})
