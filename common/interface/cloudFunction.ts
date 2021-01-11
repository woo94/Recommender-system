export interface onCallReturn {
    type: 'alreadyPassed' | 'success' | 'error';
    error?: string
}