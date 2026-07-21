// Carrega o lamejs dinamicamente de forma segura no client-side
function loadLamejs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('lamejs só pode ser carregado no navegador.'));
      return;
    }

    if ((window as any).lamejs) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).lamejs) {
        resolve();
      } else {
        reject(new Error('Falha ao instanciar lamejs após o carregamento do script.'));
      }
    };
    script.onerror = () => reject(new Error('Erro ao baixar lamejs da CDN.'));
    document.head.appendChild(script);
  });
}

/**
 * Comprime um arquivo de áudio para MP3 mono em 16kHz (qualidade otimizada para transcrição do Whisper)
 * @param file Arquivo de áudio de entrada (m4a, mp3, wav, etc)
 * @param onProgress Callback opcional para progresso (0 a 1)
 */
export async function compressAudioToMp3(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  // 1. Garantir que o lamejs esteja carregado
  await loadLamejs();

  // 2. Criar contexto de áudio para decodificar
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API não é suportada neste navegador.');
  }

  const audioCtx = new AudioContextClass();

  // 3. Ler o arquivo de entrada como ArrayBuffer e decodificar
  const arrayBuffer = await file.arrayBuffer();
  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error('Erro ao decodificar áudio:', err);
    throw new Error('Não foi possível decodificar o arquivo de áudio. O formato pode estar corrompido ou ser incompatível com o navegador.');
  } finally {
    await audioCtx.close();
  }

  // 4. Downsampling para 16kHz Mono usando OfflineAudioContext (renderização offline instantânea)
  const targetSampleRate = 16000;
  const targetChannels = 1;
  const duration = decodedBuffer.duration;
  const length = Math.floor(duration * targetSampleRate);

  const OfflineAudioContextClass = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineAudioContextClass(targetChannels, length, targetSampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampledBuffer = await offlineCtx.startRendering();
  const channelData = resampledBuffer.getChannelData(0);

  // 5. Converter dados de Float32 (-1.0 a 1.0) para Int16 (-32768 a 32767)
  const pcmData = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  // 6. Iniciar compressão em MP3 com lamejs
  // Otimização: Mono, 16kHz, 32kbps (ideal para voz e mantém o tamanho muito reduzido)
  const mp3encoder = new (window as any).lamejs.Mp3Encoder(1, targetSampleRate, 32);
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152; // Múltiplo padrão requerido pelo LAME

  const totalSamples = pcmData.length;
  let offset = 0;

  while (offset < totalSamples) {
    const chunk = pcmData.subarray(offset, offset + sampleBlockSize);
    let mp3buf;
    if (chunk.length < sampleBlockSize) {
      // Preencher o último bloco com zeros caso seja menor do que 1152
      const padded = new Int16Array(sampleBlockSize);
      padded.set(chunk);
      mp3buf = mp3encoder.encodeBuffer(padded);
    } else {
      mp3buf = mp3encoder.encodeBuffer(chunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    offset += sampleBlockSize;
    if (onProgress) {
      onProgress(Math.min(1, offset / totalSamples));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  // 7. Agrupar em um arquivo File final
  const mp3Blob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  
  return new File([mp3Blob], `${baseName}_compressed.mp3`, {
    type: 'audio/mp3',
  });
}
