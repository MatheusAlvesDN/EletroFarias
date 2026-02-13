export function converterParaISO(dataBr: string): string {
    // Divide a string nas barras
    const [dia, mes, ano] = dataBr.split('/');

    // Retorna no formato YYYY-MM-DD
    return `${ano}-${mes}-${dia}`;
}
