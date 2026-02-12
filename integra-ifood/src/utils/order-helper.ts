export function orderByEnderecoStrict<T extends { endereco: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        const pa = a.endereco.split('.').map(Number);
        const pb = b.endereco.split('.').map(Number);

        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const da = pa[i] ?? 0;
            const db = pb[i] ?? 0;
            if (da !== db) return da - db;
        }
        return 0;
    });
}