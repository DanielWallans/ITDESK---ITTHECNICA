import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check } from 'lucide-react';
import { buildPixPayload } from '../utils/pix';

const KEY_TYPE_LABEL = { CPF: 'CPF', CNPJ: 'CNPJ', EMAIL: 'E-mail', TELEFONE: 'Telefone', ALEATORIA: 'Chave aleatória' };

/** Bloco de pagamento Pix (QR Code enviado pelo admin ou gerado automaticamente + Chave Pix) no tema do portal do cliente. */
export default function PixPayment({ method, amount, ticketCode }) {
  const [generatedQr, setGeneratedQr] = useState('');
  const [copied, setCopied] = useState('');

  const payload = useMemo(() => {
    if (!method.pixKey) return '';
    return buildPixPayload({
      pixKey: method.pixKey,
      pixKeyType: method.pixKeyType,
      receiverName: method.receiverName || 'IT ONE',
      receiverCity: method.receiverCity || 'SAO PAULO',
      amount,
      txid: ticketCode
    });
  }, [method, amount, ticketCode]);

  useEffect(() => {
    if (method.qrCodeImage || !payload) {
      setGeneratedQr('');
      return;
    }
    QRCode.toDataURL(payload, { margin: 1, width: 240, color: { dark: '#000000', light: '#ffffff' } })
      .then(setGeneratedQr)
      .catch(() => setGeneratedQr(''));
  }, [method.qrCodeImage, payload]);

  const qrSrc = method.qrCodeImage || generatedQr;

  const copy = (text, what) => {
    navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(''), 1800);
  };

  return (
    <div className="cp-pix">
      <div className="cp-pix-qr">
        {qrSrc ? <img src={qrSrc} alt="QR Code Pix" style={{ objectFit: 'contain' }} /> : <div className="cp-pix-qr-ph" />}
      </div>
      <div className="cp-pix-info">
        {method.pixKey && (
          <div>
            <label className="cp-label">Chave Pix ({KEY_TYPE_LABEL[method.pixKeyType] || method.pixKeyType})</label>
            <div className="cp-pix-code" style={{ fontSize: 14, color: 'var(--cp-text)', fontWeight: 600 }}>
              {method.pixKey}
            </div>
            <button type="button" className="cp-btn-ghost" style={{ color: 'var(--cp-orange)', marginTop: 8 }}
              onClick={() => copy(method.pixKey, 'key')}>
              {copied === 'key' ? <><Check size={13} /> Chave copiada</> : <><Copy size={13} /> Copiar chave Pix</>}
            </button>
          </div>
        )}

        {payload && (
          <div>
            <label className="cp-label">Pix copia e cola</label>
            <div className="cp-pix-code">{payload}</div>
            <button type="button" className="cp-btn-ghost" style={{ color: 'var(--cp-orange)', marginTop: 8 }}
              onClick={() => copy(payload, 'code')}>
              {copied === 'code' ? <><Check size={13} /> Código copiado</> : <><Copy size={13} /> Copiar código Pix</>}
            </button>
          </div>
        )}

        <dl className="cp-pix-meta">
          <div><dt>Favorecido</dt><dd>{method.receiverName || 'IT ONE'}</dd></div>
          <div><dt>Banco / Identificação</dt><dd>{method.label || 'Pix'}</dd></div>
        </dl>
        {method.instructions && <p className="cp-sub" style={{ fontSize: 12.5 }}>{method.instructions}</p>}
      </div>
    </div>
  );
}
