/*
 * Cofre de bem-estar: criptografia de ponta a ponta (no navegador) dos check-ins e do diário.
 *
 * - Os textos são cifrados com uma chave de dados (DEK) aleatória de 256 bits (AES-GCM).
 * - A DEK é guardada no banco "embrulhada" (cifrada) por uma chave derivada da senha do cofre
 *   (PBKDF2-SHA256, sal aleatório). A senha nunca sai do dispositivo; quem acessa o banco
 *   não lê os textos. Trocar a senha só reembrulha a DEK — nenhum dado precisa ser recifrado.
 * - Sem a senha, os dados cifrados não podem ser recuperados (nem por nós): por isso existe
 *   a opção "Redefinir cofre", que apaga os registros cifrados.
 * - Opcionalmente a chave (não exportável) fica no IndexedDB deste dispositivo para
 *   evitar digitar a senha toda vez.
 */
(function () {
  const DEFAULT_ITERATIONS = 600000;
  const MIN_PASSPHRASE = 10;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let meta = null; // { salt, verifier (DEK embrulhada), iterations }
  let key = null; // DEK como CryptoKey não exportável (cifrar/decifrar)
  let rawDek = null; // bytes da DEK, só em memória, só após digitar a senha (para trocar a senha)
  let suspended = false; // desativação em andamento: novas gravações saem em claro
  let currentUser = null;

  function subtle() {
    return globalThis.crypto && globalThis.crypto.subtle ? globalThis.crypto.subtle : null;
  }
  const supported = () => !!subtle() && typeof TextEncoder !== 'undefined';

  function toB64(bytes) {
    let s = '';
    const arr = new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
    return btoa(s);
  }
  function fromB64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(passphrase, saltBytes, iterations) {
    const material = await subtle().importKey(
      'raw',
      encoder.encode(String(passphrase).normalize('NFKC')),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return subtle().deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptWith(k, text) {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, k, encoder.encode(text));
    return 'v1.' + toB64(iv) + '.' + toB64(ct);
  }
  async function decryptWith(k, payload) {
    const parts = String(payload || '').split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('VAULT_BAD_PAYLOAD');
    const pt = await subtle().decrypt(
      { name: 'AES-GCM', iv: fromB64(parts[1]) },
      k,
      fromB64(parts[2])
    );
    return decoder.decode(pt);
  }

  // ---- IndexedDB (chave não exportável, opcional) ----
  function idb() {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) return reject(new Error('no-idb'));
      const req = indexedDB.open('synapse-vault', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('keys');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbOp(mode, fn) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('keys', mode);
      const result = fn(tx.objectStore('keys'));
      tx.oncomplete = () => {
        db.close();
        resolve(result && 'result' in result ? result.result : undefined);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async function importDek(bytes) {
    return subtle().importKey('raw', bytes, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt'
    ]);
  }
  /** Embrulha a DEK com a senha: devolve os metadados a guardar no perfil. */
  async function wrapDek(passphrase, dekBytes, iterations) {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const kek = await deriveKey(passphrase, salt, iterations);
    return {
      salt: toB64(salt),
      verifier: await encryptWith(kek, toB64(dekBytes)),
      iterations
    };
  }
  async function unwrapDek(passphrase, m) {
    const kek = await deriveKey(passphrase, fromB64(m.salt), m.iterations);
    return fromB64(await decryptWith(kek, m.verifier));
  }

  const vault = {
    MIN_PASSPHRASE,
    DEFAULT_ITERATIONS,
    supported,

    /** Define o usuário e os metadados do cofre vindos do perfil (ou null se não há cofre). */
    configure(userId, nextMeta) {
      if (currentUser !== userId) {
        key = null;
        rawDek = null;
      }
      currentUser = userId;
      suspended = false;
      meta =
        nextMeta && nextMeta.salt && nextMeta.verifier
          ? {
              salt: nextMeta.salt,
              verifier: nextMeta.verifier,
              iterations: Number(nextMeta.iterations) || DEFAULT_ITERATIONS
            }
          : null;
      if (!meta) {
        key = null;
        rawDek = null;
      }
    },
    isEnabled: () => !!meta && !suspended,
    isConfigured: () => !!meta,
    isUnlocked: () => !!key,
    getMeta: () => (meta ? { ...meta } : null),

    validatePassphrase(pass) {
      const p = String(pass || '');
      if (p.length < MIN_PASSPHRASE) return `Use pelo menos ${MIN_PASSPHRASE} caracteres.`;
      if (/^(.)\1+$/.test(p)) return 'Escolha uma senha menos repetitiva.';
      if (new Set(p.toLowerCase()).size < 5) return 'Use mais variedade de caracteres.';
      return '';
    },

    /** Cria um cofre novo (DEK nova) e o deixa desbloqueado. Retorna os metadados a salvar. */
    async create(passphrase, options = {}) {
      if (!supported()) throw new Error('VAULT_UNSUPPORTED');
      const iterations = options.iterations || DEFAULT_ITERATIONS;
      const dek = globalThis.crypto.getRandomValues(new Uint8Array(32));
      const wrapped = await wrapDek(passphrase, dek, iterations);
      key = await importDek(dek);
      rawDek = dek;
      meta = wrapped;
      suspended = false;
      return { ...meta };
    },

    /** Tenta desbloquear com a senha. Retorna true/false. */
    async unlock(passphrase) {
      if (!meta || !supported()) return false;
      try {
        const dek = await unwrapDek(passphrase, meta);
        if (dek.length !== 32) return false;
        key = await importDek(dek);
        rawDek = dek;
        return true;
      } catch (_) {
        return false;
      }
    },

    /** Troca a senha: confere a atual e reembrulha a MESMA chave de dados. Retorna os novos metadados. */
    async changePassphrase(oldPassphrase, newPassphrase, options = {}) {
      if (!meta) throw new Error('VAULT_NOT_CONFIGURED');
      if (!(await vault.unlock(oldPassphrase))) throw new Error('VAULT_WRONG_PASSPHRASE');
      const wrapped = await wrapDek(
        newPassphrase,
        rawDek,
        options.iterations || DEFAULT_ITERATIONS
      );
      meta = wrapped;
      return { ...meta };
    },

    /** Durante a desativação: novas gravações saem em claro, mas a chave segue disponível para leitura. */
    suspend() {
      suspended = true;
    },
    resume() {
      suspended = false;
    },

    lock() {
      key = null;
      rawDek = null;
    },

    async encryptJSON(value) {
      if (!key) throw new Error('VAULT_LOCKED');
      return encryptWith(key, JSON.stringify(value));
    },
    async decryptJSON(payload) {
      if (!key) throw new Error('VAULT_LOCKED');
      return JSON.parse(await decryptWith(key, payload));
    },

    // ---- lembrar neste dispositivo (chave não exportável no IndexedDB) ----
    async rememberOnDevice() {
      if (!key || !currentUser) return false;
      try {
        await idbOp('readwrite', store => store.put({ key, salt: meta && meta.salt }, currentUser));
        return true;
      } catch (_) {
        return false;
      }
    },
    async forgetDevice(userId) {
      try {
        await idbOp('readwrite', store => store.delete(userId || currentUser));
      } catch (_) {}
    },
    /** Restaura a chave guardada neste dispositivo, se ainda valer para os dados atuais. */
    async restoreFromDevice() {
      if (!meta || !currentUser || !supported()) return false;
      try {
        const stored = await idbOp('readonly', store => store.get(currentUser));
        // Só vale para o cofre em uso: trocar a senha ou recriar o cofre muda o sal.
        if (!stored || stored.salt !== meta.salt) return false;
        if (!stored.key || !stored.key.algorithm || stored.key.algorithm.name !== 'AES-GCM')
          return false;
        key = stored.key;
        return true;
      } catch (_) {
        return false;
      }
    }
  };

  window.SynapseVault = vault;
})();
