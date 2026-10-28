// Gerador de BR Code Pix estático ("Pix Copia e Cola"), conforme o Manual de Padrões do Banco Central.
// O valor é informado com 2 casas decimais a partir de string (sem aritmética de ponto flutuante).

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

const clean = (text, max) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .\-@]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, max);

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function normalizePixKey(key, type) {
  let raw = String(key || '').trim();
  // Se o admin colou um código Pix Copia e Cola (000201...) no campo chave, extrai a chave real do campo 26->01
  if (raw.startsWith('000201')) {
    const idx = raw.toLowerCase().indexOf('br.gov.bcb.pix01');
    if (idx !== -1) {
      const lenStr = raw.slice(idx + 16, idx + 18);
      const len = parseInt(lenStr, 10);
      if (len > 0 && len <= 99) {
        raw = raw.slice(idx + 18, idx + 18 + len);
      }
    }
  }
  switch ((type || '').toUpperCase()) {
    case 'CPF':
    case 'CNPJ':
      return raw.replace(/\D/g, '');
    case 'TELEFONE': {
      const digits = raw.replace(/\D/g, '');
      return digits.startsWith('55') && digits.length > 11 ? `+${digits}` : `+55${digits}`;
    }
    case 'EMAIL':
      return raw.toLowerCase();
    default:
      return raw;
  }
}

/** Converte o valor (number/string) para "123.45" usando apenas manipulação de string. */
function formatAmount(amount) {
  const [int = '0', dec = ''] = String(amount ?? '0').replace(',', '.').split('.');
  const cents = (dec + '00').slice(0, 2);
  const integer = int.replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0';
  return `${integer}.${cents}`;
}

export function buildPixPayload({ pixKey, pixKeyType, receiverName, receiverCity, amount, txid, description }) {
  const account =
    field('00', 'br.gov.bcb.pix') +
    field('01', normalizePixKey(pixKey, pixKeyType)) +
    (description ? field('02', clean(description, 40)) : '');

  const ref = (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const value = formatAmount(amount);

  let payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    (value !== '0.00' ? field('54', value) : '') +
    field('58', 'BR') +
    field('59', clean(receiverName, 25)) +
    field('60', clean(receiverCity, 15)) +
    field('62', field('05', ref)) +
    '6304';

  return payload + crc16(payload);
}

