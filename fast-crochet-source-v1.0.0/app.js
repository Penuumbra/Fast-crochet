const storage = {
  apiKey: "fio_camera_api_key",
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

const state = {
  accessSnapshot: null,
  authView: "login",
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
  trialBarFill: document.querySelector("#trialBarFill"),
  trialValue: document.querySelector("#trialValue"),
  visualSummary: document.querySelector("#visualSummary"),
};

init();

async function init() {
  restoreLocalSettings();
  bindEvents();
  registerServiceWorker();
  await refreshAccess("Preparando o seu periodo gratis...");
  handleCheckoutReturn();
}

function bindEvents() {
  refs.startCameraButton.addEventListener("click", handleStartCamera);
  refs.captureButton.addEventListener("click", handleCaptureFrame);
  refs.imageInput.addEventListener("change", handleFileInput);
  refs.form.addEventListener("submit", handleGenerate);
  refs.loginForm.addEventListener("submit", (event) =>
    handleAuthSubmit(event, "/api/auth/login", refs.loginEmail, refs.loginPassword)
  );
  refs.registerForm.addEventListener("submit", (event) =>
    handleAuthSubmit(event, "/api/auth/register", refs.registerEmail, refs.registerPassword)
  );
  refs.showLoginButton.addEventListener("click", () => setAuthView("login"));
  refs.showRegisterButton.addEventListener("click", () => setAuthView("register"));
  refs.subscribeButton.addEventListener("click", handleSubscribe);
  refs.gateSubscribeButton.addEventListener("click", handleSubscribe);
  refs.demoSubscribeButton.addEventListener("click", handleDemoSubscribe);
  refs.gateDemoButton.addEventListener("click", handleDemoSubscribe);
  refs.logoutButton.addEventListener("click", handleLogout);
  refs.gateLogoutButton.addEventListener("click", handleLogout);
  refs.rememberKey.addEventListener("change", persistLocalSettings);
  refs.apiKey.addEventListener("input", persistLocalSettings);
  refs.model.addEventListener("input", persistLocalSettings);
  refs.downloadJsonButton.addEventListener("click", handleDownloadJson);
  refs.printButton.addEventListener("click", () => window.print());

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

function setAuthView(view) {
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
  const trial = snapshot?.trial || null;
  const user = snapshot?.user || null;
  const subscription = snapshot?.subscription || null;
  const plan = snapshot?.plan || {};

  refs.planPrice.textContent = `${plan.price_label || "R$ 3,69"} / ${plan.interval || "mensal"}`;
  refs.planProvider.textContent = providerLabel(plan.provider);
  refs.accessBadge.textContent = accessBadgeLabel(access.mode);
  refs.accessHeadline.textContent = accessTitle(access.mode);
  refs.accessCopy.textContent = access.reason || "Estado de acesso indisponivel.";
  refs.accountEmail.textContent = user
    ? user.email
    : "Uso anonimo liberado durante o periodo gratis";
  refs.loggedInGateEmail.textContent = user ? user.email : "";

  refs.trialValue.textContent = formatTrialValue(trial);
  refs.trialBarFill.style.width = `${trial?.remaining_percent || 0}%`;

  refs.logoutButton.hidden = !user;
  refs.subscribeButton.hidden = !user || Boolean(subscription?.active);
  refs.demoSubscribeButton.hidden =
    plan.provider !== "demo" || !user || Boolean(subscription?.active);
  refs.gateSubscribeButton.hidden = !user;
  refs.gateDemoButton.hidden =
    plan.provider !== "demo" || !user || Boolean(subscription?.active);
  refs.lockedHint.hidden = access.can_generate !== false;

  const locked = access.can_generate === false;
  document.body.classList.toggle("app-locked", locked);
  refs.authGate.hidden = !locked;
  refs.authFormsSection.hidden = Boolean(user);
  refs.loggedInGateSection.hidden = !user;

  if (locked) {
    refs.gateTitle.textContent = user
      ? "Assine para liberar novas geracoes"
      : "Seu teste gratis terminou";
    refs.gateMessage.textContent = user
      ? "Sua conta esta pronta. Finalize a assinatura mensal de R$ 3,69 para voltar a gerar diagramas."
      : "Agora o app exige conta e assinatura. Entre ou crie seu cadastro para continuar.";
  } else {
    refs.gateTitle.textContent = "Acesso liberado";
    refs.gateMessage.textContent =
      "Seu uso esta desbloqueado. Gere novas variacoes quando quiser.";
  }

  refs.generateButton.disabled = state.loading || locked;

  refs.accessMetaPills.innerHTML = "";
  if (trial) {
    refs.accessMetaPills.appendChild(createMetaPill(`Trial: ${formatTrialValue(trial)}`));
  }
  if (user) {
    refs.accessMetaPills.appendChild(createMetaPill(`Conta: ${user.email}`));
  }
  if (subscription?.label) {
    refs.accessMetaPills.appendChild(createMetaPill(subscription.label));
  }
}

function handleCheckoutReturn() {
  const url = new URL(window.location.href);
  const status = url.searchParams.get("checkout");
  if (!status) {
    return;
  }

  if (status === "success") {
    setStatus("Pagamento concluido. Atualizando o estado da assinatura...");
    refreshAccess().catch(() => {});
  } else if (status === "cancel") {
    setStatus("O checkout foi cancelado. Voce pode tentar novamente quando quiser.");
  }

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
  try {
    const response = await fetch("/api/subscription/checkout", {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Falha ao iniciar a assinatura.");
    }

    if (payload.checkout_url) {
      window.location.href = payload.checkout_url;
      return;
    }

    if (payload.mode === "demo") {
      setStatus(payload.message || "Modo local: use a assinatura de demonstracao.");
      return;
    }

    setStatus(payload.message || "Checkout preparado.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Falha ao iniciar a assinatura.", true);
  }
}

async function handleDemoSubscribe() {
  try {
    const response = await fetch("/api/subscription/demo-activate", {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Falha ao ativar assinatura local.");
    }

    state.accessSnapshot = payload;
    renderAccess(payload);
    setStatus(payload.message || "Assinatura local ativada.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Falha ao ativar assinatura.", true);
  }
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

  if (!state.accessSnapshot?.access?.can_generate) {
    renderAccess(state.accessSnapshot || { access: { can_generate: false, mode: "auth_required" } });
    setStatus(
      state.accessSnapshot?.access?.reason ||
        "O acesso esta bloqueado. Entre na conta e finalize a assinatura.",
      true
    );
    return;
  }

  if (!state.imageDataUrl) {
    setStatus("Capture ou envie uma imagem antes de gerar o diagrama.", true);
    return;
  }

  persistLocalSettings();
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
  refs.generateButton.disabled = isLoading || !state.accessSnapshot?.access?.can_generate;
  refs.generateButton.textContent = isLoading
    ? "Gerando diagramas..."
    : "Gerar 4 estilos de croche";
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

function providerLabel(provider) {
  if (provider === "stripe") {
    return "Checkout Stripe";
  }
  if (provider === "payment_link") {
    return "Link de pagamento";
  }
  return "Checkout local";
}

function accessBadgeLabel(mode) {
  switch (mode) {
    case "authenticated_subscriber":
      return "Assinatura ativa";
    case "authenticated_trial":
      return "Trial em conta";
    case "anonymous_trial":
      return "Trial anonimo";
    case "subscription_required":
      return "Assinatura necessaria";
    case "auth_required":
      return "Login necessario";
    default:
      return "Carregando";
  }
}

function accessTitle(mode) {
  switch (mode) {
    case "authenticated_subscriber":
      return "Acesso completo liberado";
    case "authenticated_trial":
      return "Seu teste segue ativo na conta";
    case "anonymous_trial":
      return "Use livremente por 7 dias";
    case "subscription_required":
      return "Sua conta precisa de assinatura";
    case "auth_required":
      return "Crie a conta para continuar";
    default:
      return "Validando o acesso";
  }
}

function formatTrialValue(trial) {
  if (!trial) {
    return "Sem periodo livre";
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
