export interface onCallReturn {
    type: 'alreadyPassed' | 'success' | 'error' | 'no-result';
    error?: string
}