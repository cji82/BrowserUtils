(() => {
  const params = new URLSearchParams(location.search);
  let duration = parseInt(params.get('duration') || '10', 10);
  if (isNaN(duration) || duration < 3) duration = 3;
  if (duration > 120) duration = 120;

  const statusEl = document.getElementById('status') || document.querySelector('#status');
  const startBtn = document.getElementById('start-btn') || document.querySelector('#start-btn');
  const stopBtn = document.getElementById('stop-btn') || document.querySelector('#stop-btn');
  let recorder = null;
  let chunks = [];
  let stopTimer = null;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }
  function notify(type, payload = {}) {
    try {
      if (window.opener) {
        window.opener.postMessage({ source: 'clip-recorder', type, payload }, '*');
      }
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ source: 'clip-recorder', type, payload }).catch(() => {});
      }
    } catch (_) {}
  }
  function finish(delay = 400) {
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
    setTimeout(() => window.close(), delay);
  }

  function download(blob, mime) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tab-recording.webm';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function startRecorder(stream) {
    try {
      if (!stream || !stream.getVideoTracks || stream.getVideoTracks().length === 0) {
        setStatus('영상 스트림을 받지 못했습니다. 다시 「녹화 시작」을 눌러 주세요.');
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }
    } catch (_) {}
    if (stopBtn) stopBtn.disabled = false;
    let mr = null;
    try {
      mr = new MediaRecorder(stream);
    } catch (err) {
      setStatus('녹화 장치를 켜지 못했습니다: ' + (err && err.message ? err.message : ''));
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    recorder = mr;
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      download(blob, recorder.mimeType);
      stream.getTracks().forEach(t => t.stop());
      notify('recorder-stopped');
      finish();
    };
    recorder.onerror = () => {
      stream.getTracks().forEach(t => t.stop());
      setStatus('녹화 중 오류가 발생했습니다.');
      notify('recorder-error', { message: '녹화 중 오류' });
      finish();
    };
    recorder.start(1000);
    notify('recorder-started');
    setStatus(`녹화 중... ${duration}초 후 자동 종료`);
    stopTimer = setTimeout(() => {
      if (recorder && recorder.state === 'recording') recorder.stop();
    }, duration * 1000);
    if (stopBtn) stopBtn.onclick = () => {
      if (recorder && recorder.state === 'recording') recorder.stop();
    };
  }

  async function startCapture() {
    setStatus('잠시만 기다려 주세요...');
    if (startBtn) startBtn.disabled = true;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      setStatus('이 브라우저에서는 화면 녹화를 지원하지 않습니다. Chrome 최신 버전을 사용해 주세요.');
      if (startBtn) startBtn.disabled = false;
      return;
    }
    try {
      setStatus('탭/화면을 클릭한 뒤, 창 맨 아래의 「공유」 또는 「Share」 버튼을 눌러 주세요.');
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } catch (e1) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }
      setStatus('녹화를 시작합니다...');
      startRecorder(stream);
    } catch (e) {
      const isNotAllowed = e && e.name === 'NotAllowedError';
      setStatus(isNotAllowed
        ? '공유가 취소되었거나 창이 뜨지 않았습니다. 미디어 탭의 「스크린샷」으로 보이는 영역/전체 페이지를 캡처해 이용해 주세요.'
        : '녹화를 시작할 수 없습니다. 미디어 탭의 「스크린샷」 기능을 이용해 주세요.');
      notify('recorder-cancel', { error: e && e.message ? e.message : '', notAllowed: isNotAllowed });
    } finally {
      if (startBtn) startBtn.disabled = false;
    }
  }

  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'recorder-stop') return;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    } else {
      notify('recorder-cancel');
      finish(200);
    }
  });

  window.addEventListener('beforeunload', () => {
    notify('recorder-closed');
  });

  function startWithStreamId(streamId) {
    setStatus('녹화를 시작합니다...');
    const constraints = {
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } },
      audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
    };
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => startRecorder(stream))
      .catch((err) => {
        navigator.mediaDevices.getUserMedia({
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } },
          audio: false
        }).then((stream) => startRecorder(stream)).catch((e2) => {
          setStatus('녹화를 켜지 못했습니다: ' + (e2 && e2.message ? e2.message : ''));
          if (startBtn) startBtn.disabled = false;
        });
      });
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'startWithStreamId' && msg.streamId) {
        startWithStreamId(msg.streamId);
      } else if (msg.action === 'clipCaptureCancelled') {
        setStatus(msg.error || '선택이 취소되었습니다. 이 환경에서는 공유 창이 뜨지 않을 수 있습니다. 미디어 탭의 「스크린샷」(보이는 영역/전체 페이지)을 이용해 주세요.');
        if (startBtn) startBtn.disabled = false;
      }
    });
  }

  function openDesktopCapturePicker() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      setStatus('이 브라우저에서는 화면 녹화를 지원하지 않습니다.');
      if (startBtn) startBtn.disabled = false;
      return;
    }
    setStatus('화면/탭 선택 창이 뜨면 공유할 대상을 고른 뒤 「공유」를 누르세요.');
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      .then((stream) => startRecorder(stream))
      .catch((e) => {
        if (startBtn) startBtn.disabled = false;
        try {
          chrome.runtime.sendMessage({ action: 'setScreenCaptureUnavailable', value: true }).catch(() => {});
        } catch (_) {}
        if (e && e.name === 'NotAllowedError') {
          setStatus('공유 선택 창이 뜨지 않았거나 취소되었습니다. 이 확장에서는 Chrome이 선택 창을 띄우지 않는 경우가 있습니다. 대신 미디어 탭의 「스크린샷」으로 보이는 영역/전체 페이지를 캡처해 이용해 주세요.');
        } else {
          setStatus('녹화를 시작할 수 없습니다. 미디어 탭의 「스크린샷」 기능을 이용해 주세요.');
        }
      });
  }

  function bindStart() {
    const btn = document.getElementById('start-btn') || document.querySelector('#start-btn');
    if (!btn) {
      if (statusEl) statusEl.textContent = '오류: 녹화 시작 버튼을 찾을 수 없습니다.';
      return;
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (recorder && recorder.state === 'recording') return;
      if (startBtn) startBtn.disabled = true;
      openDesktopCapturePicker();
    });
    if (statusEl) statusEl.textContent = '아래 「녹화 시작」을 클릭하면 공유할 대상 선택 창이 뜹니다. (Chrome은 반드시 버튼 클릭 시에만 창을 띄웁니다)';
    try {
      chrome.runtime.sendMessage({ action: 'clipRecorderReady' }).catch(() => {});
    } catch (_) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindStart);
  } else {
    bindStart();
  }
})();
