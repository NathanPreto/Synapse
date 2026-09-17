(function(){
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Nenhum arquivo foi selecionado.'));
      if (file.size > MAX_FILE_BYTES) return reject(new Error('O arquivo excede o limite de 15 MB.'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
      reader.onabort = () => reject(new Error('A leitura do arquivo foi cancelada.'));
      try { reader.readAsArrayBuffer(file); } catch (error) { reject(error); }
    });
  }
  function readText(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Nenhum arquivo foi selecionado.'));
      if (file.size > MAX_FILE_BYTES) return reject(new Error('O arquivo excede o limite de 15 MB.'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
      reader.onabort = () => reject(new Error('A leitura do arquivo foi cancelada.'));
      try { reader.readAsText(file); } catch (error) { reject(error); }
    });
  }
  async function parse(file) {
    window.SynapseFeedback?.start('Processando planilha');
    try {
    if (!window.XLSX) throw new Error('A biblioteca de planilhas não foi carregada.');
    const buffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(new Uint8Array(buffer), { type:'array', cellDates:true });
    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) throw new Error('Nenhuma aba foi encontrada na planilha.');
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval:'', raw:true });
    if (!rows.length) throw new Error('A planilha está vazia.');
    const headers = Object.keys(rows[0] || {});
    if (!headers.length) throw new Error('Não foi possível encontrar cabeçalhos na primeira linha.');
    // Pré-processamento fora do DOM: para planilhas grandes, o fragmento evita
    // múltiplas inserções individuais caso uma prévia nativa precise ser montada.
    const fragment = document.createDocumentFragment();
    const sample = rows.slice(0, Math.min(rows.length, 50));
    sample.forEach(row => { const marker = document.createElement('span'); marker.textContent = JSON.stringify(row); fragment.appendChild(marker); });
    return { workbook, sheetName, rows, headers, previewFragment: fragment };
    } finally { window.SynapseFeedback?.end(); }
  }
  window.SynapseSpreadsheet = { parse, readText, readFileAsArrayBuffer, MAX_FILE_BYTES };
})();
