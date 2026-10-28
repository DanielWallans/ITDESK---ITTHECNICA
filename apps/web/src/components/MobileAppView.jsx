import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Bell, CheckCircle2, Share, PlusSquare, Download, Send, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { playNotificationSound } from '../utils/sound';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function MobileAppView({ onNavigateTab }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [subscribedCount, setSubscribedCount] = useState(0);
  const [isSubscribedLocal, setIsSubscribedLocal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permissionState, setPermissionState] = useState('default');
  const [loadingPush, setLoadingPush] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/?source=pwa` : 'https://itone-itthecnica.vercel.app/?source=pwa';

  useEffect(() => {
    QRCode.toDataURL(appUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true;
    setIsStandalone(Boolean(standalone));

    if (typeof Notification !== 'undefined') {
      setPermissionState(Notification.permission);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    loadPushStatus();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const loadPushStatus = async () => {
    try {
      const cfg = await api.getPushConfig();
      if (cfg?.publicKey) setPublicKey(cfg.publicKey);
      if (typeof cfg?.subscribedCount === 'number') setSubscribedCount(cfg.subscribedCount);

      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setIsSubscribedLocal(true);
        }
      }
    } catch {
      // ignora em navegadores sem suporte
    }
  };

  const handleEnablePush = async () => {
    setFeedback(null);
    setLoadingPush(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && !isStandalone) {
          throw new Error(
            'No iPhone (Safari), toque primeiro em "Compartilhar" -> "Adicionar à Tela de Início" e abra o app IT ONE pela tela inicial para liberar as notificações da Apple.'
          );
        }
        throw new Error('Este navegador não suporta Web Push. No iPhone, abra pelo app instalado na Tela de Início.');
      }

      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada. Libere as notificações nas configurações do navegador/aparelho.');
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidKey = publicKey || 'BDAH9v7vNy72F160kTuKcCYR_U9lsXwpCEWYY8HcsPu7jqT26xgBCZ0XrRtslyVXyz8pd-__CaxnMtsLo4OLTcg';
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
      }

      const res = await api.subscribePush(sub);
      setIsSubscribedLocal(true);
      if (typeof res?.subscribedCount === 'number') {
        setSubscribedCount(res.subscribedCount);
      } else {
        setSubscribedCount((c) => Math.max(1, c));
      }
      playNotificationSound();
      setFeedback({
        type: 'success',
        text: 'Aparelho vinculado com sucesso! Agora você receberá notificações mesmo fora de casa quando chegar um novo chamado ou mensagem.'
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Não foi possível ativar as notificações neste aparelho.'
      });
    } finally {
      setLoadingPush(false);
    }
  };

  const handleTestPush = async () => {
    setFeedback(null);
    setTestingPush(true);
    try {
      playNotificationSound();
      const res = await api.sendTestPush();
      setFeedback({
        type: 'success',
        text:
          res?.sent > 0
            ? `Alerta enviado em tempo real para ${res.sent} aparelho(s) conectado(s)! Verifique a barra de notificações do seu telefone.`
            : 'Sinal sonoro disparado! Para receber na tela bloqueada do telefone, toque em "Ativar Notificações neste Aparelho" pelo seu celular.'
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Falha ao disparar notificação de teste.'
      });
    } finally {
      setTestingPush(false);
    }
  };

  const handleDownloadSafariProfile = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    // Gera um perfil instalável Apple WebClip (.mobileconfig) para download direto via Safari no iOS
    const mobileConfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>IT ONE</string>
      <key>PayloadDescription</key>
      <string>Instala o aplicativo administrativo IT ONE na Tela de Início do iOS</string>
      <key>PayloadDisplayName</key>
      <string>IT ONE App</string>
      <key>PayloadIdentifier</key>
      <string>com.itthecnica.itone.webclip</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>8A72E9E1-4F92-4C11-9D31-118000170001</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${appUrl}</string>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Aplicativo Mobile IT ONE — Monitoramento de Chamados e Chat em Tempo Real</string>
  <key>PayloadDisplayName</key>
  <string>IT ONE — Central do Especialista</string>
  <key>PayloadIdentifier</key>
  <string>com.itthecnica.itone.profile</string>
  <key>PayloadOrganization</key>
  <string>IT THECNICA</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>8A72E9E1-4F92-4C11-9D31-118000170002</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;

    const blob = new Blob([mobileConfigXml], { type: 'application/x-apple-aspen-config' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'IT-ONE-App-Installer.mobileconfig';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setFeedback({
      type: 'success',
      text: 'Instalador baixado! Dica para iPhone: para receber notificações Push na tela bloqueada do iOS, instale tocando no botão "Compartilhar" do Safari -> "Adicionar à Tela de Início".'
    });
  };

  const copyAppLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Header */}
      <div className="adm-page-head">
        <div>
          <div className="adm-kicker">APP MOBILE • IPHONE (SAFARI) & ANDROID SEM LOJA</div>
          <h2 className="adm-title">App no Celular & Alertas Push</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={loadPushStatus} className="adm-btn-ghost">
            <RefreshCw size={13} /> Atualizar Status
          </button>
          <button onClick={handleTestPush} disabled={testingPush} className="adm-btn-ghost" style={{ borderColor: '#ff6b00', color: '#ff6b00' }}>
            <Send size={13} /> {testingPush ? 'DISPARANDO...' : 'TESTAR NOTIFICAÇÃO AGORA'}
          </button>
          <button onClick={handleEnablePush} disabled={loadingPush} className="adm-btn-primary">
            <Bell size={14} />
            {loadingPush
              ? 'ATIVANDO...'
              : isSubscribedLocal
              ? 'NOTIFICAÇÕES ATIVAS NESTE APARELHO'
              : 'ATIVAR NOTIFICAÇÕES NESTE APARELHO'}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '14px 18px',
            borderLeft: `3px solid ${feedback.type === 'error' ? '#ef4444' : '#ff6b00'}`,
            borderTop: '1px solid #1f1f1f',
            borderRight: '1px solid #1f1f1f',
            borderBottom: '1px solid #1f1f1f',
            backgroundColor: '#050505',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: feedback.type === 'error' ? '#fca5a5' : '#ffffff',
            fontSize: '0.84rem',
            lineHeight: 1.5
          }}
        >
          {feedback.type === 'error' ? <AlertCircle size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#ff6b00" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Strip de Métricas do App Mobile */}
      <div className="adm-stats-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="adm-stat-item">
          <span className="adm-stat-label">MODO DO APLICATIVO</span>
          <div className="adm-stat-value" style={{ fontSize: '1.35rem', color: isStandalone ? '#ff6b00' : '#ffffff' }}>
            {isStandalone ? 'APP INSTALADO' : 'NAVEGADOR'}
          </div>
          <span className="adm-stat-sub">{isStandalone ? 'Rodando em tela cheia nativa' : 'Adicione à Tela de Início'}</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">ALERTAS NESTE APARELHO</span>
          <div className="adm-stat-value" style={{ fontSize: '1.35rem', color: isSubscribedLocal ? '#ff6b00' : '#71717a' }}>
            {isSubscribedLocal ? 'CONECTADO' : 'DESATIVADO'}
          </div>
          <span className="adm-stat-sub"> Permissão: {permissionState.toUpperCase()}</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">DISPOSITIVOS VINCULADOS</span>
          <div className="adm-stat-value" style={{ fontSize: '1.35rem' }}>
            {subscribedCount}
          </div>
          <span className="adm-stat-sub">Recebendo alertas em tempo real</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">EVENTOS MONITORADOS</span>
          <div className="adm-stat-value" style={{ fontSize: '1.35rem', color: '#ff6b00' }}>
            100% AO VIVO
          </div>
          <span className="adm-stat-sub">Novo chamado • Chat • Pix</span>
        </div>
      </div>

      {/* Grid Principal: Instalação Safari/Android + QR Code */}
      <div className="adm-mobile-grid" style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '48px', alignItems: 'start' }}>
        {/* Coluna Esquerda: Guia direto Safari sem App Store */}
        <div>
          <div className="adm-section-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Smartphone size={15} color="#ff6b00" />
              <span className="adm-section-title">COMO INSTALAR NO IPHONE PELO SAFARI (SEM APP STORE)</span>
            </div>
            <span className="adm-section-meta">iOS 16.4+ & ANDROID</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="adm-row" style={{ gridTemplateColumns: '42px 1fr', gap: '16px', padding: '18px 8px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: '#ff6b00' }}>01</div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Abra este painel pelo Safari do seu iPhone
                </div>
                <div style={{ fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Aponte a câmera do iPhone para o QR Code ao lado ou copie o link direto abaixo e abra no navegador <strong>Safari</strong>.
                </div>
              </div>
            </div>

            <div className="adm-row" style={{ gridTemplateColumns: '42px 1fr', gap: '16px', padding: '18px 8px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: '#ff6b00' }}>02</div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Toque em Compartilhar <Share size={14} color="#ff6b00" /> e em "Adicionar à Tela de Início" <PlusSquare size={14} color="#ff6b00" />
                </div>
                <div style={{ fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                  No iPhone, a Apple bloqueia arquivos <code>.apk</code> (que são exclusivos do Android), mas permite instalar Web Apps nativos direto pelo Safari sem precisar pagar ou publicar na App Store. O ícone oficial do <strong>IT ONE</strong> será criado na tela inicial do seu iPhone.
                </div>
              </div>
            </div>

            <div className="adm-row" style={{ gridTemplateColumns: '42px 1fr', gap: '16px', padding: '18px 8px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: '#ff6b00' }}>03</div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Abra o App IT ONE na Tela Inicial e toque em "Ativar Notificações"
                </div>
                <div style={{ fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Assim que abrir pelo ícone na Tela de Início, entre nesta aba <strong>App no Celular</strong> e toque no botão laranja <strong>Ativar Notificações neste Aparelho</strong>. Quando você sair de casa e um cliente abrir chamado ou mandar mensagem, seu telefone vai vibrar e mostrar o alerta na tela bloqueada!
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Download / Ação Rápida */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #1f1f1f', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button onClick={handleDownloadSafariProfile} className="adm-btn-primary">
              <Download size={14} />
              {deferredPrompt ? 'INSTALAR APP AGORA (1 CLIQUE)' : 'BAIXAR INSTALADOR SAFARI (.MOBILECONFIG)'}
            </button>

            <button onClick={copyAppLink} className="adm-btn-ghost">
              {copiedLink ? <Check size={14} color="#ff6b00" /> : <Copy size={14} />}
              {copiedLink ? 'LINK COPIADO!' : 'COPIAR LINK DO APP'}
            </button>

            {onNavigateTab && (
              <button onClick={() => onNavigateTab('tickets')} className="adm-btn-ghost">
                ABRIR FILA MOBILE →
              </button>
            )}
          </div>
        </div>

        {/* Coluna Direita: QR Code + Resumo de Resposta Rápida Fora de Casa */}
        <div>
          <div className="adm-section-bar">
            <span className="adm-section-title">QR CODE DE INSTALAÇÃO RÁPIDA</span>
            <span className="adm-section-meta">ESCANEIE COM A CÂMERA</span>
          </div>

          <div style={{ padding: '24px 0', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {qrDataUrl && (
              <div style={{ padding: '10px', backgroundColor: '#ffffff', border: '2px solid #ff6b00', display: 'inline-block' }}>
                <img src={qrDataUrl} alt="QR Code App IT ONE" style={{ width: '148px', height: '148px', display: 'block' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ff6b00', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
                ACESSO DIRETO NO TELEFONE
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                Aponte a câmera do iPhone para abrir no Safari
              </div>
              <div style={{ fontSize: '0.8rem', color: '#71717a', lineHeight: 1.5, marginBottom: '12px' }}>
                Use o mesmo login de administrador (<strong>itthecnica@hotmail.com</strong>) para monitorar todos os chamados em tempo real na rua.
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: '#a1a1aa', wordBreak: 'break-all' }}>
                {appUrl}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '20px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ff6b00', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              MODO "FORA DE CASA" INTEGRADO AO CHAT
            </div>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
              Quando chegar uma notificação no seu celular e você estiver na rua, basta tocar na notificação para abrir o chamado e usar os novos <strong>Botões de Resposta Rápida (1 Toque)</strong> no chat ou chamar o cliente no WhatsApp para avisar em quantos minutos você iniciará o acesso remoto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
