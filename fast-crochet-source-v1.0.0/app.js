const storage = {
  apiKey: "fio_camera_api_key",
  draft: "fio_camera_draft",
  history: "fio_camera_history",
  googleBackupFileId: "fio_camera_google_backup_file_id",
  rememberKey: "fio_camera_remember_key",
  model: "fio_camera_model",
};

const stitchFallbackLegend = {
  ch: { label: "Corrente", use_case: "base e subida" },
  sc: { label: "Ponto baixo", use_case: "estrutura firme" },
  hdc: { label: "Meio ponto alto", use_case: "transicao e corpo" },
  dc: { label: "Ponto alto", use_case: "ganho de altura" },
  tr: { label: "Ponto alto duplo", use_case: "queda e alongamento" },
  sl: { label: "Ponto baixissimo", use_case: "uniao e acabamento" },
  inc: { label: "Aumento", use_case: "abrir volume" },
  dec: { label: "Diminuicao", use_case: "afinar ou fechar" },
  bob: { label: "Pipoca", use_case: "relevo" },
  shell: { label: "Leque", use_case: "borda decorativa" },
  picot: { label: "Picot", use_case: "acabamento delicado" },
  sp: { label: "Vazio", use_case: "respiro do diagrama" },
};

const styleLabels = {
  fiel: "Fiel ao visual",
  iniciante: "Versao simplificada",
  texturizado: "Textura e relevo",
  autor: "Interpretacao autoral",
};

const GOOGLE_BACKUP_FILE_NAME = "fast-crochet-backup.json";
const GOOGLE_BACKUP_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.appdata",
].join(" ");
const HISTORY_LIMIT = 6;

const runtime = resolveRuntime();

const state = {
  accessSnapshot: null,
  googleBackup: {
    accessToken: "",
    busy: false,
    clientId: "",
    expiresAt: 0,
    fileId: localStorage.getItem(storage.googleBackupFileId) || "",
    profile: null,
    tokenClient: null,
  },
  history: [],
  imageDataUrl: "",
  loading: false,
  meta: null,
  result: null,
  stream: null,
};

const refs = {
  accessBadge: document.querySelector("#accessBadge"),
  accessCopy: document.querySelector("#accessCopy"),
  accessHeadline: document.querySelector("#accessHeadline"),
  accessMetaPills: document.querySelector("#accessMetaPills"),
  accountEmail: document.querySelector("#accountEmail"),
  apiKey: document.querySelector("#apiKey"),
  backupAccountEmail: document.querySelector("#backupAccountEmail"),
  backupConnectionState: document.querySelector("#backupConnectionState"),
  backupCopy: document.querySelector("#backupCopy"),
  backupHeadline: document.querySelector("#backupHeadline"),
  backupMetaPills: document.querySelector("#backupMetaPills"),
  authFormsSection: document.querySelector("#authFormsSection"),
  authGate: document.querySelector("#authGate"),
  camera: document.querySelector("#camera"),
  cameraPlaceholder: document.querySelector("#cameraPlaceholder"),
  captureButton: document.querySelector("#captureButton"),
  demoSubscribeButton: document.querySelector("#demoSubscribeButton"),
  downloadJsonButton: document.querySelector("#downloadJsonButton"),
  emptyState: document.querySelector("#emptyState"),
  form: document.querySelector("#patternForm"),
  gateDemoButton: document.querySelector("#gateDemoButton"),
  gateLogoutButton: document.querySelector("#gateLogoutButton"),
  gateMessage: document.querySelector("#gateMessage"),
  gateSubscribeButton: document.querySelector("#gateSubscribeButton"),
  gateTitle: document.querySelector("#gateTitle"),
  generateButton: document.querySelector("#generateButton"),
  googleBackupButton: document.querySelector("#googleBackupButton"),
  googleConnectButton: document.querySelector("#googleConnectButton"),
  googleDisconnectButton: document.querySelector("#googleDisconnectButton"),
  googleRestoreButton: document.querySelector("#googleRestoreButton"),
  imageInput: document.querySelector("#imageInput"),
  lockedHint: document.querySelector("#lockedHint"),
  loggedInGateEmail: document.querySelector("#loggedInGateEmail"),
  loggedInGateSection: document.querySelector("#loggedInGateSection"),
  loginEmail: document.querySelector("#loginEmail"),
  loginForm: document.querySelector("#loginForm"),
  loginPassword: document.querySelector("#loginPassword"),
  logoutButton: document.querySelector("#logoutButton"),
  materialsList: document.querySelector("#materialsList"),
  metaPills: document.querySelector("#metaPills"),
  model: document.querySelector("#model"),
  notes: document.querySelector("#notes"),
  pieceName: document.querySelector("#pieceName"),
  pieceType: document.querySelector("#pieceType"),
  planPrice: document.querySelector("#planPrice"),
  planProvider: document.querySelector("#planProvider"),
  previewImage: document.querySelector("#previewImage"),
  printButton: document.querySelector("#printButton"),
  productionNote: document.querySelector("#productionNote"),
  registerEmail: document.querySelector("#registerEmail"),
  registerForm: document.querySelector("#registerForm"),
  registerPassword: document.querySelector("#registerPassword"),
  rememberKey: document.querySelector("#rememberKey"),
  resultsSection: document.querySelector("#resultsSection"),
  showLoginButton: document.querySelector("#showLoginButton"),
  showRegisterButton: document.querySelector("#showRegisterButton"),
  sizeTarget: document.querySelector("#sizeTarget"),
  skillLevel: document.querySelector("#skillLevel"),
  snapshotCanvas: document.querySelector("#snapshotCanvas"),
  startCameraButton: document.querySelector("#startCameraButton"),
  statusBar: document.querySelector("#statusBar"),
  styleCardTemplate: document.querySelector("#styleCardTemplate"),
  stylesGrid: document.querySelector("#stylesGrid"),
  subscribeButton: document.querySelector("#subscribeButton"),
  trialBlock: document.querySelector(".trial-block"),
  trialBarFill: document.querySelector("#trialBarFill"),
  trialValue: document.querySelector("#trialValue"),
  visualSummary: document.querySelector("#visualSummary"),
};

init();

async function init() {
  restoreLocalSettings();
  restoreDraftState();
  restoreHistoryState();
  bindEvents();
  registerServiceWorker();
  await refreshAccess("Preparando o uso livre do app...");
  handleCheckoutReturn();
}

function bindEvents() {
  bindIfPresent(refs.startCameraButton, "click", handleStartCamera);
  bindIfPresent(refs.captureButton, "click", handleCaptureFrame);
  bindIfPresent(refs.imageInput, "change", handleFileInput);
  bindIfPresent(refs.form, "submit", handleGenerate);
  bindIfPresent(refs.loginForm, "submit", (event) =>
    handleAuthSubmit(event, "/api/auth/login", refs.loginEmail, refs.loginPassword)
  );
  bindIfPresent(refs.registerForm, "submit", (event) =>
    handleAuthSubmit(event, "/api/auth/register", refs.registerEmail, refs.registerPassword)
  );
  bindIfPresent(refs.showLoginButton, "click", () => setAuthView("login"));
  bindIfPresent(refs.showRegisterButton, "click", () => setAuthView("register"));
  bindIfPresent(refs.subscribeButton, "click", handleSubscribe);
  bindIfPresent(refs.gateSubscribeButton, "click", handleSubscribe);
  bindIfPresent(refs.demoSubscribeButton, "click", handleDemoSubscribe);
  bindIfPresent(refs.gateDemoButton, "click", handleDemoSubscribe);
  bindIfPresent(refs.logoutButton, "click", handleLogout);
  bindIfPresent(refs.gateLogoutButton, "click", handleLogout);
  bindIfPresent(refs.rememberKey, "change", persistLocalSettings);
  bindIfPresent(refs.apiKey, "input", persistLocalSettings);
  bindIfPresent(refs.model, "input", persistLocalSettings);
  bindIfPresent(refs.pieceType, "input", persistDraftState);
  bindIfPresent(refs.sizeTarget, "input", persistDraftState);
  bindIfPresent(refs.skillLevel, "change", persistDraftState);
  bindIfPresent(refs.notes, "input", persistDraftState);
  bindIfPresent(refs.downloadJsonButton, "click", handleDownloadJson);
  bindIfPresent(refs.googleConnectButton, "click", handleGoogleConnect);
  bindIfPresent(refs.googleBackupButton, "click", handleGoogleBackup);
  bindIfPresent(refs.googleRestoreButton, "click", handleGoogleRestore);
  bindIfPresent(refs.googleDisconnectButton, "click", handleGoogleDisconnect);
  bindIfPresent(refs.printButton, "click", () => window.print());

  window.addEventListener("beforeunload", stopCameraStream);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopCameraStream();
    }
  });
}

function restoreLocalSettings() {
  const rememberKey = localStorage.getItem(storage.rememberKey) === "true";
  refs.rememberKey.checked = rememberKey;
  refs.model.value = localStorage.getItem(storage.model) || refs.model.value;

  if (rememberKey) {
    refs.apiKey.value = localStorage.getItem(storage.apiKey) || "";
  }
}

function persistLocalSettings() {
  localStorage.setItem(storage.model, refs.model.value.trim());

  if (refs.rememberKey.checked) {
    localStorage.setItem(storage.rememberKey, "true");
    localStorage.setItem(storage.apiKey, refs.apiKey.value.trim());
    return;
  }

  localStorage.removeItem(storage.rememberKey);
  localStorage.removeItem(storage.apiKey);
}

function restoreDraftState() {
  const draft = readStorageJson(storage.draft, {});
  refs.pieceType.value = draft.pieceType || refs.pieceType.value;
  refs.sizeTarget.value = draft.sizeTarget || refs.sizeTarget.value;
  refs.skillLevel.value = draft.skillLevel || refs.skillLevel.value;
  refs.notes.value = draft.notes || refs.notes.value;
}

function persistDraftState() {
  localStorage.setItem(
    storage.draft,
    JSON.stringify({
      notes: refs.notes.value.trim(),
      pieceType: refs.pieceType.value.trim(),
      sizeTarget: refs.sizeTarget.value.trim(),
      skillLevel: refs.skillLevel.value,
    })
  );
}

function restoreHistoryState() {
  const history = readStorageJson(storage.history, []);
  state.history = Array.isArray(history) ? history.slice(0, HISTORY_LIMIT) : [];

  const latest = state.history[0];
  if (latest?.result) {
    state.result = latest.result;
    state.meta = latest.meta || {};
    renderResult(state.result, state.meta);
  }
}

function persistHistoryEntry(result, meta) {
  const entry = {
    created_at: new Date().toISOString(),
    meta,
    piece_name: result?.piece_name || "Peca sem titulo",
    result,
  };

  state.history = [entry, ...state.history]
    .filter((item, index) => index === 0 || item.created_at !== entry.created_at)
    .slice(0, HISTORY_LIMIT);
  localStorage.setItem(storage.history, JSON.stringify(state.history));
}

function readStorageJson(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
}

function bindIfPresent(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function setAuthView(view) {
  if (!refs.loginForm || !refs.registerForm || !refs.showLoginButton || !refs.showRegisterButton) {
    return;
  }

  state.authView = view;
  const showLogin = view === "login";
  refs.loginForm.hidden = !showLogin;
  refs.registerForm.hidden = showLogin;
  refs.showLoginButton.classList.toggle("is-active", showLogin);
  refs.showRegisterButton.classList.toggle("is-active", !showLogin);
}

async function refreshAccess(statusMessage) {
  if (statusMessage) {
    setStatus(statusMessage);
  }

  try {
    const response = await fetch("/api/access");
    const payload = await response.json();
    state.accessSnapshot = payload;
    renderAccess(payload);
    return payload;
  } catch (error) {
    setStatus("Nao foi possivel carregar o estado do acesso.", true);
    throw error;
  }
}

function renderAccess(snapshot) {
  const access = snapshot?.access || {};
  const user = snapshot?.user || null;
  const plan = snapshot?.plan || {};
  const googleBackupConfigured = Boolean(snapshot?.features?.google_backup?.enabled);

  refs.planPrice.textContent = plan.price_label || "Uso livre";
  refs.planProvider.textContent = providerLabel(plan.provider);
  refs.accessBadge.textContent = accessBadgeLabel(access.mode);
  refs.accessHeadline.textContent = accessTitle(access.mode);
  refs.accessCopy.textContent =
    access.reason || "Uso liberado. Conecte Google apenas se quiser manter backups.";
  refs.accountEmail.textContent = user
    ? user.email
    : "Uso livre sem login obrigatorio";
  if (refs.loggedInGateEmail) {
    refs.loggedInGateEmail.textContent = user ? user.email : "";
  }

  refs.trialValue.textContent = "Uso livre";
  refs.trialBarFill.style.width = "100%";
  refs.trialBlock.hidden = true;

  refs.logoutButton.hidden = true;
  refs.subscribeButton.hidden = true;
  refs.demoSubscribeButton.hidden = true;
  if (refs.gateSubscribeButton) {
    refs.gateSubscribeButton.hidden = true;
  }
  if (refs.gateDemoButton) {
    refs.gateDemoButton.hidden = true;
  }
  refs.lockedHint.hidden = false;

  document.body.classList.remove("app-locked");
  if (refs.authGate) {
    refs.authGate.hidden = true;
  }
  if (refs.authFormsSection) {
    refs.authFormsSection.hidden = true;
  }
  if (refs.loggedInGateSection) {
    refs.loggedInGateSection.hidden = true;
  }

  refs.generateButton.disabled = state.loading;

  refs.accessMetaPills.innerHTML = "";
  refs.accessMetaPills.appendChild(createMetaPill("Geracao liberada"));
  if (user) {
    refs.accessMetaPills.appendChild(createMetaPill(`Conta local: ${user.email}`));
  }
  if (googleBackupConfigured) {
    refs.accessMetaPills.appendChild(createMetaPill("Backup Google disponivel"));
  } else {
    refs.accessMetaPills.appendChild(createMetaPill("Backup Google ainda nao configurado"));
  }

  renderGoogleBackup(snapshot);
}

function handleCheckoutReturn() {
  const url = new URL(window.location.href);
  const status = url.searchParams.get("checkout");
  if (!status) {
    return;
  }

  setStatus("O checkout foi removido. O app agora segue em uso livre.");

  url.searchParams.delete("checkout");
  window.history.replaceState({}, "", url);
}

async function handleAuthSubmit(event, endpoint, emailInput, passwordInput) {
  event.preventDefault();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Falha no processo de autenticacao.");
    }

    state.accessSnapshot = payload;
    renderAccess(payload);
    setStatus(payload.message || "Autenticacao concluida.");
    passwordInput.value = "";
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Falha na autenticacao.", true);
  }
}

async function handleLogout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Falha ao sair.");
    }
    state.accessSnapshot = payload;
    renderAccess(payload);
    setStatus(payload.message || "Sessao encerrada.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Falha ao sair.", true);
  }
}

async function handleSubscribe() {
  setStatus(
    "O checkout foi removido por enquanto. O app esta liberado para uso sem assinatura.",
    false
  );
}

async function handleDemoSubscribe() {
  setStatus(
    "A assinatura local tambem foi desativada. O uso segue livre sem bloqueio.",
    false
  );
}

async function handleStartCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Este navegador nao oferece acesso a camera. Use o envio de imagem.", true);
    return;
  }

  stopCameraStream();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1920 },
      },
    });

    state.stream = stream;
    refs.camera.srcObject = stream;
    await refs.camera.play();
    await waitForVideoFrame(refs.camera);
    refs.captureButton.disabled = false;
    refs.camera.hidden = false;
    refs.previewImage.hidden = true;
    refs.cameraPlaceholder.hidden = true;
    setStatus("Camera pronta. Capture uma referencia quando quiser.");
  } catch (error) {
    setStatus(
      "Nao foi possivel abrir a camera. Verifique a permissao do navegador ou envie um arquivo.",
      true
    );
  }
}

function stopCameraStream() {
  if (!state.stream) {
    return;
  }

  for (const track of state.stream.getTracks()) {
    track.stop();
  }

  refs.camera.srcObject = null;
  state.stream = null;
  refs.captureButton.disabled = true;
}

async function handleCaptureFrame() {
  if (!refs.camera.srcObject) {
    setStatus("Abra a camera antes de capturar.", true);
    return;
  }

  const video = refs.camera;
  const canvas = refs.snapshotCanvas;
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 1280;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, width, height);

  const rawDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  state.imageDataUrl = await downscaleDataUrl(rawDataUrl, 1400);
  updatePreview(state.imageDataUrl);
  setStatus("Imagem capturada. Agora podemos gerar os quatro estilos.");
}

async function handleFileInput(event) {
  const [file] = Array.from(event.target.files || []);
  if (!file) {
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    state.imageDataUrl = await downscaleDataUrl(dataUrl, 1400);
    updatePreview(state.imageDataUrl);
    setStatus("Imagem carregada. Ja podemos montar o padrao.");
  } catch (error) {
    setStatus("Nao foi possivel ler a imagem selecionada.", true);
  }
}

function updatePreview(dataUrl) {
  refs.previewImage.src = dataUrl;
  refs.previewImage.hidden = false;
  refs.camera.hidden = true;
  refs.cameraPlaceholder.hidden = true;
}

async function handleGenerate(event) {
  event.preventDefault();

  if (state.loading) {
    return;
  }

  if (!state.imageDataUrl) {
    setStatus("Capture ou envie uma imagem antes de gerar o diagrama.", true);
    return;
  }

  persistLocalSettings();
  persistDraftState();
  setLoading(true);
  setStatus("Interpretando a imagem e desenhando as quatro variacoes...");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: refs.apiKey.value.trim(),
        imageDataUrl: state.imageDataUrl,
        model: refs.model.value.trim(),
        notes: refs.notes.value.trim(),
        pieceType: refs.pieceType.value.trim(),
        sizeTarget: refs.sizeTarget.value.trim(),
        skillLevel: refs.skillLevel.value,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (payload.snapshot) {
        state.accessSnapshot = payload.snapshot;
        renderAccess(payload.snapshot);
      }
      throw new Error(payload.error || "Falha ao gerar a receita.");
    }

    state.result = payload.result;
    state.meta = payload.meta || {};
    persistHistoryEntry(state.result, state.meta);
    renderResult(state.result, state.meta);
    await refreshAccess();
    setStatus(`Quatro estilos prontos. Modelo usado: ${payload.meta?.model || refs.model.value}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Erro inesperado.", true);
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  state.loading = isLoading;
  refs.generateButton.disabled = isLoading;
  refs.generateButton.textContent = isLoading
    ? "Gerando diagramas..."
    : "Gerar 4 estilos de croche";
  renderGoogleBackup();
}

function setStatus(message, isError = false) {
  refs.statusBar.textContent = message;
  refs.statusBar.classList.toggle("error", Boolean(isError));
}

function renderResult(result, meta) {
  refs.emptyState.hidden = true;
  refs.resultsSection.hidden = false;
  refs.downloadJsonButton.disabled = false;
  refs.printButton.disabled = false;

  refs.pieceName.textContent = result.piece_name || "Peca sem titulo";
  refs.visualSummary.textContent = result.visual_summary || "";
  refs.productionNote.textContent = result.production_note || "";

  refs.metaPills.innerHTML = "";
  refs.metaPills.appendChild(
    createMetaPill(`Confianca visual: ${mapConfidence(result.confidence)}`)
  );
  refs.metaPills.appendChild(
    createMetaPill(`Modelo: ${meta?.model || refs.model.value.trim()}`)
  );
  if (meta?.fallback_used) {
    refs.metaPills.appendChild(createMetaPill("Fallback automatico aplicado"));
  }

  refs.materialsList.innerHTML = "";
  for (const item of result.recommended_materials || []) {
    const li = document.createElement("li");
    li.textContent = item;
    refs.materialsList.appendChild(li);
  }

  refs.stylesGrid.innerHTML = "";
  const styles = Array.isArray(result.styles) ? result.styles : [];

  styles.forEach((style, index) => {
    const node = refs.styleCardTemplate.content.firstElementChild.cloneNode(true);
    node.style.setProperty("--delay", `${index * 110}ms`);

    node.querySelector(".style-tag").textContent = style.key.toUpperCase();
    node.querySelector(".style-title").textContent =
      style.label || styleLabels[style.key] || "Estilo";
    node.querySelector(".difficulty-pill").textContent = capitalize(style.difficulty);
    node.querySelector(".style-concept").textContent = style.concept;
    node.querySelector(".yarn-value").textContent = style.yarn;
    node.querySelector(".hook-value").textContent = `${Number(style.hook_mm).toFixed(1)} mm`;
    node.querySelector(".gauge-value").textContent = style.gauge;

    const paletteRow = node.querySelector(".palette-row");
    for (const color of style.palette || []) {
      paletteRow.appendChild(createPaletteChip(color));
    }

    renderChart(node.querySelector(".chart-grid"), style.chart?.rows || []);
    renderLegend(
      node.querySelector(".legend-list"),
      style.stitch_legend || [],
      style.chart?.rows || []
    );

    const instructionList = node.querySelector(".instruction-list");
    for (const step of style.instructions || []) {
      const li = document.createElement("li");
      li.textContent = step;
      instructionList.appendChild(li);
    }

    const finishingList = node.querySelector(".finishing-list");
    for (const note of style.finishing || []) {
      const li = document.createElement("li");
      li.textContent = note;
      finishingList.appendChild(li);
    }

    refs.stylesGrid.appendChild(node);
  });
}

function renderChart(container, rows) {
  container.innerHTML = "";

  for (const row of rows) {
    for (const code of row) {
      const cell = document.createElement("div");
      cell.className = "chart-cell";
      cell.dataset.code = code;
      cell.textContent = code;
      cell.title = stitchFallbackLegend[code]?.label || code;
      container.appendChild(cell);
    }
  }
}

function renderLegend(container, legend, chartRows) {
  container.innerHTML = "";
  const seenCodes = new Set();
  const usedCodes = new Set();

  for (const row of chartRows) {
    for (const code of row) {
      if (code && code !== "sp") {
        usedCodes.add(code);
      }
    }
  }

  const completeLegend = [...legend];

  for (const code of usedCodes) {
    if (legend.some((item) => item.code === code)) {
      continue;
    }

    const fallback = stitchFallbackLegend[code];
    if (fallback) {
      completeLegend.push({
        code,
        label: fallback.label,
        use_case: fallback.use_case,
      });
    }
  }

  for (const item of completeLegend) {
    if (seenCodes.has(item.code)) {
      continue;
    }

    seenCodes.add(item.code);
    container.appendChild(createLegendPill(item.code, item.label, item.use_case));
  }
}

function createLegendPill(code, label, useCase) {
  const pill = document.createElement("div");
  pill.className = "legend-pill";
  pill.innerHTML = `<strong>${escapeHtml(code)}</strong>${escapeHtml(label)} - ${escapeHtml(
    useCase
  )}`;
  return pill;
}

function createPaletteChip(colorValue) {
  const chip = document.createElement("div");
  chip.className = "palette-chip";

  const swatch = document.createElement("span");
  swatch.className = "palette-swatch";
  swatch.style.background = normalizeColor(colorValue);
  chip.appendChild(swatch);

  const label = document.createElement("span");
  label.textContent = colorValue;
  chip.appendChild(label);
  return chip;
}

function createMetaPill(text) {
  const pill = document.createElement("span");
  pill.textContent = text;
  return pill;
}

function handleDownloadJson() {
  if (!state.result) {
    return;
  }

  const blob = new Blob([JSON.stringify({ meta: state.meta, result: state.result }, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "padrao-croche.json");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderGoogleBackup(snapshot = state.accessSnapshot) {
  const feature = snapshot?.features?.google_backup || {};
  const configured = Boolean(feature.enabled && feature.client_id);
  const backupState = state.googleBackup;
  const connected = Boolean(backupState.profile);
  const historyCount = state.history.length;

  refs.backupMetaPills.innerHTML = "";
  refs.backupMetaPills.appendChild(
    createMetaPill(`${historyCount} resultado${historyCount === 1 ? "" : "s"} local${historyCount === 1 ? "" : "es"}`)
  );
  refs.backupMetaPills.appendChild(
    createMetaPill(configured ? "Drive appDataFolder" : "Configure GOOGLE_CLIENT_ID")
  );
  if (backupState.fileId) {
    refs.backupMetaPills.appendChild(createMetaPill("Arquivo de backup vinculado"));
  }

  refs.backupHeadline.textContent = configured
    ? connected
      ? "Backup Google pronto"
      : "Conecte so para sincronizar"
    : "Backup Google indisponivel";
  refs.backupConnectionState.textContent = backupState.busy
    ? "Processando..."
    : connected
      ? "Conectado"
      : configured
        ? "Pronto para conectar"
        : "Nao configurado";
  refs.backupAccountEmail.textContent = connected
    ? backupState.profile.email || backupState.profile.name || "Conta Google conectada"
    : configured
      ? "Nenhuma conta conectada"
      : "Defina GOOGLE_CLIENT_ID no servidor";
  refs.backupCopy.textContent = configured
    ? "O backup salva configuracoes e resultados recentes no Google Drive. Isso nao bloqueia o uso do app."
    : "O uso segue livre. Para habilitar backups Google, publique o app com GOOGLE_CLIENT_ID configurado no servidor.";

  refs.googleConnectButton.disabled = !configured || backupState.busy;
  refs.googleBackupButton.disabled = !configured || !connected || backupState.busy;
  refs.googleRestoreButton.disabled = !configured || !connected || backupState.busy;
  refs.googleDisconnectButton.hidden = !connected;
  refs.googleDisconnectButton.disabled = backupState.busy;
}

function setGoogleBackupBusy(isBusy) {
  state.googleBackup.busy = isBusy;
  renderGoogleBackup();
}

function buildBackupPayload() {
  return {
    app: "fast-crochet",
    exported_at: new Date().toISOString(),
    history: state.history.slice(0, HISTORY_LIMIT),
    settings: {
      model: refs.model.value.trim(),
    },
    draft: {
      notes: refs.notes.value.trim(),
      pieceType: refs.pieceType.value.trim(),
      sizeTarget: refs.sizeTarget.value.trim(),
      skillLevel: refs.skillLevel.value,
    },
    version: 1,
  };
}

function applyBackupPayload(payload) {
  if (!payload || payload.app !== "fast-crochet") {
    throw new Error("O arquivo recebido nao pertence ao Fast Crochet.");
  }

  if (payload.settings?.model) {
    refs.model.value = payload.settings.model;
  }

  if (payload.draft) {
    refs.pieceType.value = payload.draft.pieceType || "";
    refs.sizeTarget.value = payload.draft.sizeTarget || "";
    refs.skillLevel.value = payload.draft.skillLevel || refs.skillLevel.value;
    refs.notes.value = payload.draft.notes || "";
    persistDraftState();
  }

  state.history = Array.isArray(payload.history) ? payload.history.slice(0, HISTORY_LIMIT) : [];
  localStorage.setItem(storage.history, JSON.stringify(state.history));
  persistLocalSettings();

  const latest = state.history[0];
  if (latest?.result) {
    state.result = latest.result;
    state.meta = latest.meta || {};
    renderResult(state.result, state.meta);
  }
}

function ensureGoogleBackupClient() {
  const clientId = state.accessSnapshot?.features?.google_backup?.client_id || "";
  if (!clientId) {
    throw new Error("Backup Google ainda nao esta configurado no servidor.");
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error("A biblioteca de login do Google ainda nao carregou. Tente novamente em alguns segundos.");
  }

  if (!state.googleBackup.tokenClient || state.googleBackup.clientId !== clientId) {
    state.googleBackup.clientId = clientId;
    state.googleBackup.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_BACKUP_SCOPES,
      callback: () => {},
    });
  }

  return state.googleBackup.tokenClient;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel ler o perfil da conta Google.");
  }

  return response.json();
}

function requestGoogleAccessToken(prompt = "") {
  return new Promise((resolve, reject) => {
    const tokenClient = ensureGoogleBackupClient();
    tokenClient.callback = async (response) => {
      if (!response || response.error) {
        reject(new Error(response?.error_description || response?.error || "Falha ao conectar com o Google."));
        return;
      }

      try {
        state.googleBackup.accessToken = response.access_token || "";
        state.googleBackup.expiresAt =
          Date.now() + Number(response.expires_in || 0) * 1000;
        state.googleBackup.profile = await fetchGoogleProfile(state.googleBackup.accessToken);
        renderGoogleBackup();
        resolve(response);
      } catch (error) {
        reject(error);
      }
    };

    tokenClient.error_callback = (error) => {
      reject(new Error(error?.type || "Falha ao abrir a autenticacao Google."));
    };

    tokenClient.requestAccessToken({ prompt });
  });
}

async function ensureGoogleAccess(interactive = false) {
  const hasValidToken =
    state.googleBackup.accessToken && state.googleBackup.expiresAt - Date.now() > 60 * 1000;

  if (hasValidToken) {
    return state.googleBackup.accessToken;
  }

  await requestGoogleAccessToken(interactive ? "consent" : "");
  return state.googleBackup.accessToken;
}

async function googleRequest(url, options = {}) {
  const token = await ensureGoogleAccess(false);
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await readGoogleError(response);
    throw new Error(message);
  }

  return response;
}

async function readGoogleError(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.error_description || "Falha no Google Drive.";
  } catch (error) {
    const text = await response.text();
    return text || "Falha no Google Drive.";
  }
}

async function findGoogleBackupFile() {
  const query = encodeURIComponent(
    `name = '${GOOGLE_BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`
  );
  const response = await googleRequest(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=1`
  );
  const payload = await response.json();
  return payload.files?.[0] || null;
}

async function uploadBackupPayload(payload) {
  let fileId = state.googleBackup.fileId;

  if (!fileId) {
    const existingFile = await findGoogleBackupFile();
    fileId = existingFile?.id || "";
  }

  const boundary = `fastcrochet_${Date.now().toString(36)}`;
  const metadata = fileId
    ? { name: GOOGLE_BACKUP_FILE_NAME }
    : { name: GOOGLE_BACKUP_FILE_NAME, parents: ["appDataFolder"] };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;

  const method = fileId ? "PATCH" : "POST";
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  let response;
  try {
    response = await googleRequest(url, {
      method,
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  } catch (error) {
    if (fileId) {
      state.googleBackup.fileId = "";
      localStorage.removeItem(storage.googleBackupFileId);
      return uploadBackupPayload(payload);
    }
    throw error;
  }
  const result = await response.json();
  state.googleBackup.fileId = result.id || fileId || "";
  if (state.googleBackup.fileId) {
    localStorage.setItem(storage.googleBackupFileId, state.googleBackup.fileId);
  }
}

async function restoreBackupPayload() {
  let fileId = state.googleBackup.fileId;

  if (!fileId) {
    const existingFile = await findGoogleBackupFile();
    fileId = existingFile?.id || "";
  }

  if (!fileId) {
    throw new Error("Nenhum backup encontrado na sua conta Google.");
  }

  let response;
  try {
    response = await googleRequest(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );
  } catch (error) {
    state.googleBackup.fileId = "";
    localStorage.removeItem(storage.googleBackupFileId);
    const existingFile = await findGoogleBackupFile();
    if (!existingFile?.id) {
      throw error;
    }
    fileId = existingFile.id;
    response = await googleRequest(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );
  }
  const payload = await response.json();
  state.googleBackup.fileId = fileId;
  localStorage.setItem(storage.googleBackupFileId, fileId);
  return payload;
}

async function handleGoogleConnect() {
  try {
    setGoogleBackupBusy(true);
    await ensureGoogleAccess(true);
    renderGoogleBackup();
    setStatus("Conta Google conectada. Os backups ja podem ser sincronizados.");
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Falha ao conectar a conta Google.",
      true
    );
  } finally {
    setGoogleBackupBusy(false);
  }
}

async function handleGoogleBackup() {
  try {
    setGoogleBackupBusy(true);
    await ensureGoogleAccess(true);
    await uploadBackupPayload(buildBackupPayload());
    renderGoogleBackup();
    setStatus("Backup salvo no Google Drive com sucesso.");
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Falha ao salvar o backup no Google.",
      true
    );
  } finally {
    setGoogleBackupBusy(false);
  }
}

async function handleGoogleRestore() {
  try {
    setGoogleBackupBusy(true);
    await ensureGoogleAccess(true);
    const payload = await restoreBackupPayload();
    applyBackupPayload(payload);
    renderGoogleBackup();
    setStatus("Backup restaurado com sucesso neste aparelho.");
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Falha ao restaurar o backup do Google.",
      true
    );
  } finally {
    setGoogleBackupBusy(false);
  }
}

async function handleGoogleDisconnect() {
  try {
    setGoogleBackupBusy(true);
    const accessToken = state.googleBackup.accessToken;
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      await new Promise((resolve) => {
        window.google.accounts.oauth2.revoke(accessToken, () => resolve());
      });
    }
  } finally {
    state.googleBackup.accessToken = "";
    state.googleBackup.expiresAt = 0;
    state.googleBackup.fileId = "";
    state.googleBackup.profile = null;
    localStorage.removeItem(storage.googleBackupFileId);
    renderGoogleBackup();
    setGoogleBackupBusy(false);
    setStatus("Conta Google desconectada. O app continua livre para uso.");
  }
}

function providerLabel(provider) {
  if (provider === "google_backup") {
    return "Backup opcional";
  }
  if (runtime.isPlayDistribution) {
    return "App publicado no Google Play";
  }
  if (provider === "stripe") {
    return "Checkout Stripe";
  }
  if (provider === "payment_link") {
    return "Link de pagamento";
  }
  return "Checkout local";
}

function resolveRuntime() {
  const url = new URL(window.location.href);
  const distribution = (url.searchParams.get("distribution") || "").trim().toLowerCase();
  const platform = (url.searchParams.get("platform") || "").trim().toLowerCase();

  return {
    distribution,
    platform,
    isPlayDistribution: distribution === "play",
    isAndroidShell:
      platform === "android" || /FastCrochetAndroid\/1\.0/i.test(navigator.userAgent),
  };
}

function accessBadgeLabel(mode) {
  switch (mode) {
    case "free_signed_in":
      return "Conta opcional";
    case "free_open_access":
      return "Uso livre";
    default:
      return "Pronto";
  }
}

function accessTitle(mode) {
  switch (mode) {
    case "free_signed_in":
      return "Uso liberado com conta opcional";
    case "free_open_access":
      return "Uso liberado sem login";
    default:
      return "Uso liberado";
  }
}

function formatTrialValue(trial) {
  if (!trial) {
    return "Uso livre";
  }

  if (trial.active) {
    if (trial.remaining_days > 1) {
      return `${trial.remaining_days} dias`;
    }
    return `${Math.max(1, trial.remaining_hours)} horas`;
  }

  return "Encerrado";
}

function normalizeColor(colorValue) {
  const color = String(colorValue || "").trim();
  const isSafe =
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ||
    /^rgb(a)?\(([\d\s.,%]+)\)$/i.test(color) ||
    /^hsl(a)?\(([\d\s.,%]+)\)$/i.test(color) ||
    /^[a-z]{3,20}$/i.test(color);
  return isSafe ? color : "#d6bca1";
}

function mapConfidence(value) {
  if (value === "high") {
    return "alta";
  }
  if (value === "medium") {
    return "media";
  }
  return "baixa";
}

function capitalize(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao processar a imagem."));
    image.src = dataUrl;
  });
}

async function downscaleDataUrl(dataUrl, maxSide = 1400) {
  const image = await loadImage(dataUrl);
  const width = image.width;
  const height = image.height;
  const ratio = Math.min(1, maxSide / Math.max(width, height));

  if (ratio === 1) {
    return dataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.warn("Nao foi possivel registrar o service worker.", error);
  }
}

function waitForVideoFrame(video) {
  if (video.readyState >= 2 && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onLoaded = () => {
      video.removeEventListener("loadeddata", onLoaded);
      resolve();
    };

    video.addEventListener("loadeddata", onLoaded, { once: true });
  });
}
