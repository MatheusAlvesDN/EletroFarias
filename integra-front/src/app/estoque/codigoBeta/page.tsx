'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';

type CamState = 'idle' | 'starting' | 'running' | 'error';

function explainGumError(err: unknown) {
  const name = (err as any)?.name || '';
  const msg = (err as any)?.message || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permissão negada. Ative o acesso à câmera nas permissões do navegador.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Nenhuma câmera foi encontrada neste dispositivo.';
  }
  if (name === 'NotReadableError') {
    return 'A câmera está em uso por outro app ou não pôde ser iniciada.';
  }
  if (name === 'OverconstrainedError') {
    return 'Não foi possível atender às restrições da câmera (tente sem "facingMode").';
  }
  if (name === 'SecurityError') {
    return 'A câmera foi bloqueada por segurança. Use HTTPS (ou localhost) e evite navegador embutido de apps.';
  }
  return `Falha ao abrir câmera. ${name ? `(${name})` : ''} ${msg}`.trim();
}

export default function BarcodeCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CamState>('idle');
  const [error, setError] = useState<string>('');

  const stopCamera = useCallback(() => {
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;

    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        // solta a referência do stream
        // @ts-ignore
        v.srcObject = null;
      } catch {
        // ignore
      }
    }
    setState('idle');
  }, []);

  const startCamera = useCallback(async () => {
    setError('');

    // 1) garante que o elemento existe
    const video = videoRef.current;
    if (!video) {
      setState('error');
      setError('Elemento de vídeo não disponível (ref null). Tente novamente após a tela carregar.');
      return;
    }

    // 2) checagens mínimas
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setError('Seu navegador não suporta acesso à câmera (getUserMedia indisponível).');
      return;
    }

    // 3) evita abrir 2x
    stopCamera();
    setState('starting');

    try {
      // iOS/Safari: playsInline + muted ajuda muito
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      video.autoplay = true;

      // facingMode: environment ajuda no celular (câmera traseira)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          // você pode limitar resolução se quiser estabilidade:
          // width: { ideal: 1280 },
          // height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // @ts-ignore
      video.srcObject = stream;

      // aguarda metadata para garantir que o vídeo “pegou”
      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoaded);
      });

      // play() pode falhar se não foi por gesto; aqui você está chamando via botão (gesto), então ok
      await video.play();

      setState('running');
    } catch (err) {
      setState('error');
      setError(explainGumError(err));
      stopCamera();
    }
  }, [stopCamera]);

  // para evitar câmera presa ao sair da página
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Dica útil de diagnóstico
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isSecure =
    typeof window !== 'undefined'
      ? window.isSecureContext || origin.startsWith('https://') || origin.includes('localhost')
      : false;

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {!isSecure && (
        <Alert severity="warning">
          Esta página não parece estar em HTTPS. Em celular, câmera pode ser bloqueada fora de HTTPS (exceto localhost).
        </Alert>
      )}

      {state === 'error' && (
        <Alert severity="error">
          {error || 'Erro ao abrir câmera.'}
          <Box sx={{ mt: 1, fontSize: 13 }}>
            Se estiver abrindo dentro do Instagram/WhatsApp, tente abrir no Chrome/Safari “de verdade”.
          </Box>
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={startCamera} disabled={state === 'starting' || state === 'running'}>
          {state === 'starting' ? 'Abrindo…' : 'Abrir câmera'}
        </Button>
        <Button variant="outlined" onClick={stopCamera} disabled={state !== 'running'}>
          Parar
        </Button>
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          aspectRatio: '3 / 4',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.15)',
          background: '#000',
        }}
      >
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          playsInline
          muted
          autoPlay
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        Se a câmera não abrir: verifique permissões do navegador, use HTTPS e evite navegador embutido de apps.
      </Typography>
    </Box>
  );
}
