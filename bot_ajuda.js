const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────
const DONO_NUMERO = '5567998161300';
const DB_PATH = './data.json';

// ── DATABASE ─────────────────────────────────────────────
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      lista: [],
      avisos: [],
      atualizacao: '',
      ultimamensagem: ''
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── HELPERS ───────────────────────────────────────────────
function isDono(from) {
  return from.replace('@s.whatsapp.net', '') === DONO_NUMERO;
}

function bloco(titulo, linhas) {
  const borda = '┏═•✭･ﾟ✧*･ﾟ| ⊱✿⊰ |*✭˚･ﾟ✧･ﾟ•═┓';
  const bordaM = '┣⋆⃟ۣۜ᭪➣ 𖡦 ' + titulo;
  const bordaB = '┗═•✭･ﾟ✧*･ﾟ| ⊱✿⊰ |*✭˚･ﾟ✧･ﾟ•═┛';
  const topo2 = '┏═•✭･ﾟ✧*･ﾟ| ⊱✿⊰ |*✭˚･ﾟ✧･ﾟ•═┓';
  const abre = '┃╭━━─ ≪ •❈• ≫ ─━━╮';
  const fecha = '┃╰━━─ ≪ •❈• ≫ ─━━╯';
  const rodape = '┗═•✭･ﾟ✧*･ﾟ| ⊱✿⊰ |*✭˚･ﾟ✧･ﾟ•═┛';
  const corpo = linhas.map(l => l === '' ? '┃╎' : `┃╎✰ ${l}`).join('\n');
  return `${borda}\n${bordaM}\n${bordaB}\n${topo2}\n${abre}\n${corpo}\n${fecha}\n${rodape}`;
}

// ── BOT ──────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const from = msg.key.participant || msg.key.remoteJid;
    const texto = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption || ''
    ).trim();

    if (!texto.startsWith('/')) return;

    const [cmd_raw, ...args] = texto.split(' ');
    const cmd = cmd_raw.slice(1).toLowerCase();
    const resto = args.join(' ').trim();

    const enviar = (texto) => sock.sendMessage(jid, { text: texto });
    const db = loadDB();

    // ── MENU ─────────────────────────────────────────────
    if (cmd === 'menu') {
      return enviar(bloco('𝐌𝐄𝐍𝐔 【📋】', [
        '📋 /lista — Ver lista de ideias',
        '📢 /avisos — Ver avisos',
        '🔄 /att — Ver atualização atual',
        '📌 /ultimamensagem — Ver última mensagem',
        '',
        '_Evolua ou morra._ ⚔️'
      ]));
    }

    // ── LISTA ─────────────────────────────────────────────
    if (cmd === 'lista') {
      if (db.lista.length === 0) {
        return enviar(bloco('𝐋𝐈𝐒𝐓𝐀 𝐃𝐄 𝐈𝐃𝐄𝐈𝐀𝐒 【📋】', [
          '_Nenhuma ideia na lista ainda!_'
        ]));
      }
      const itens = db.lista.map((item, i) =>
        `${i + 1}. [${item.autor}]: ${item.ideia}`
      );
      return enviar(bloco('𝐋𝐈𝐒𝐓𝐀 𝐃𝐄 𝐈𝐃𝐄𝐈𝐀𝐒 【📋】', [
        ...itens,
        '',
        `_Total: ${db.lista.length} ideias_`
      ]));
    }

    // ── AVISOS ────────────────────────────────────────────
    if (cmd === 'avisos') {
      if (db.avisos.length === 0) {
        return enviar(bloco('𝐀𝐕𝐈𝐒𝐎𝐒 【📢】', [
          '_Nenhum aviso no momento!_'
        ]));
      }
      const avisos = db.avisos.map((a, i) => `${i + 1}. ${a}`);
      return enviar(bloco('𝐀𝐕𝐈𝐒𝐎𝐒 【📢】', avisos));
    }

    // ── ATUALIZAÇÃO ATUAL ─────────────────────────────────
    if (cmd === 'att') {
      return enviar(bloco('𝐀𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐂̧𝐀̃𝐎 【🔄】', [
        db.atualizacao || '_Nenhuma atualização no momento!_'
      ]));
    }

    // ── ÚLTIMA MENSAGEM ───────────────────────────────────
    if (cmd === 'ultimamensagem') {
      return enviar(bloco('𝐔́𝐋𝐓𝐈𝐌𝐀 𝐌𝐄𝐍𝐒𝐀𝐆𝐄𝐌 【📌】', [
        db.ultimamensagem || '_Nenhuma mensagem fixada!_'
      ]));
    }

    // ── COMANDOS ADM ─────────────────────────────────────
    if (!isDono(from)) return;

    // /addlista [nome]: [ideia]
    if (cmd === 'addlista') {
      if (!resto || !resto.includes(':')) {
        return enviar(bloco('❌ ERRO 【⚠️】', [
          'Use: /addlista [nome]: [ideia]',
          '_Ex: /addlista João: Adicionar sistema de ranking_'
        ]));
      }
      const [autor, ...ideiaArr] = resto.split(':');
      const ideia = ideiaArr.join(':').trim();
      if (!autor || !ideia) {
        return enviar('❌ Formato inválido! Use: /addlista [nome]: [ideia]');
      }
      db.lista.push({ autor: autor.trim(), ideia, data: new Date().toLocaleDateString('pt-BR') });
      saveDB(db);
      return enviar(bloco('✅ ADICIONADO 【📋】', [
        `👤 ${autor.trim()}`,
        `💡 ${ideia}`,
        '',
        `_Total na lista: ${db.lista.length}_`
      ]));
    }

    // /tirarlista [número]
    if (cmd === 'tirarlista') {
      const num = parseInt(resto);
      if (!num || num < 1 || num > db.lista.length) {
        return enviar(bloco('❌ ERRO 【⚠️】', [
          'Use: /tirarlista [número]',
          `_Lista tem ${db.lista.length} itens_`
        ]));
      }
      const removido = db.lista.splice(num - 1, 1)[0];
      saveDB(db);
      return enviar(bloco('✅ REMOVIDO 【🗑️】', [
        `❌ ${removido.autor}: ${removido.ideia}`,
        '',
        `_Total na lista: ${db.lista.length}_`
      ]));
    }

    // /fixar [mensagem]
    if (cmd === 'fixar') {
      if (!resto) return enviar('❌ Use: /fixar [mensagem]');
      db.ultimamensagem = resto;
      saveDB(db);
      return enviar(bloco('✅ MENSAGEM FIXADA 【📌】', [
        resto
      ]));
    }

    // /setatt [atualização]
    if (cmd === 'setatt') {
      if (!resto) return enviar('❌ Use: /setatt [atualização]');
      db.atualizacao = resto;
      saveDB(db);
      return enviar(bloco('✅ ATUALIZAÇÃO DEFINIDA 【🔄】', [
        resto
      ]));
    }

    // /addaviso [aviso]
    if (cmd === 'addaviso') {
      if (!resto) return enviar('❌ Use: /addaviso [aviso]');
      db.avisos.push(resto);
      saveDB(db);
      return enviar(bloco('✅ AVISO ADICIONADO 【📢】', [
        resto,
        '',
        `_Total de avisos: ${db.avisos.length}_`
      ]));
    }

    // /tiraviso [número]
    if (cmd === 'tiraviso') {
      const num = parseInt(resto);
      if (!num || num < 1 || num > db.avisos.length) {
        return enviar(`❌ Aviso inválido! Total: ${db.avisos.length}`);
      }
      db.avisos.splice(num - 1, 1);
      saveDB(db);
      return enviar(`✅ Aviso ${num} removido!`);
    }
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
    if (connection === 'open') console.log('✅ Bot de Ajuda conectado!');
  });
}

startBot().catch(console.error);
