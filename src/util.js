export function normalizeRange(value, min, max) {
    return (value - min) / (max - min);
}

export function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
}
