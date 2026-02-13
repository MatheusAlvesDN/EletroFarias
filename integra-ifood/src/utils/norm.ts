
export function norm(s: string) {
    return String(s ?? '').normalize('NFC').trim();
}
