const TOS_KEY = 'ysb_tos_v1'

export function readTosAccepted(): boolean {
    try {
        return localStorage.getItem(TOS_KEY) === 'true'
    } catch {
        return false
    }
}

export function writeTosAccepted(): void {
    try {
        localStorage.setItem(TOS_KEY, 'true')
    } catch {
        // storage unavailable — degrade gracefully
    }
}
