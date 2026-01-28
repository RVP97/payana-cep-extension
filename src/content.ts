/**
 * CEP Banxico Integration for Payana
 *
 * This extension provides quick access to query CEP (Comprobante Electrónico de Pago)
 * from Banxico directly from Payana transaction detail pages.
 * Opens Banxico validation page in a new tab with pre-filled data.
 */

import { BANKS } from "cep-banxico";

// Bank lookup helpers
const BANKS_MAP = BANKS as Record<string, string>;

function getBankCode(bankName: string): string | null {
	for (const [code, name] of Object.entries(BANKS_MAP)) {
		if (name.toUpperCase() === bankName.toUpperCase()) {
			return code;
		}
	}
	return null;
}

interface CepFormData {
	fecha: string;
	claveRastreo: string;
	emisor: string;
	receptor: string;
	cuenta: string;
	monto: string;
}

interface ExtensionState {
	isPanelOpen: boolean;
	error: string | null;
}

const state: ExtensionState = {
	isPanelOpen: false,
	error: null,
};

function generateBankOptions(): string {
	const bankEntries = Object.entries(BANKS_MAP);
	return bankEntries
		.map(([code, name]) => `<option value="${code}">${code} - ${name}</option>`)
		.join("");
}

function createInlineButton(): HTMLElement {
	const button = document.createElement("button");
	button.id = "cep-inline-btn";
	button.type = "button";
	button.className = "css-b8x8u0";
	button.innerHTML = `
		<span class="button-icon">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0e22f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M9 12h6"></path>
				<path d="M12 9v6"></path>
				<circle cx="12" cy="12" r="10"></circle>
			</svg>
		</span>CEP Banxico
	`;
	return button;
}

function createExtensionUI(): HTMLElement {
	const container = document.createElement("div");
	container.id = "payana-cep-extension";
	const bankOptions = generateBankOptions();

	container.innerHTML = `
		<style>
			#payana-cep-extension {
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			}
			
			.cep-modal-overlay {
				display: none;
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba(0, 0, 0, 0.5);
				z-index: 10000;
				align-items: center;
				justify-content: center;
			}
			
			.cep-modal-overlay.open {
				display: flex;
				animation: fadeIn 0.2s ease;
			}
			
			@keyframes fadeIn {
				from { opacity: 0; }
				to { opacity: 1; }
			}
			
			.cep-panel {
				width: 480px;
				max-height: 90vh;
				background: white;
				border-radius: 12px;
				box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
				overflow: hidden;
				animation: slideIn 0.3s ease;
			}
			
			@keyframes slideIn {
				from {
					opacity: 0;
					transform: scale(0.95) translateY(-20px);
				}
				to {
					opacity: 1;
					transform: scale(1) translateY(0);
				}
			}
			
			.cep-header {
				background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
				color: white;
				padding: 16px 20px;
				font-weight: 600;
				font-size: 16px;
				display: flex;
				justify-content: space-between;
				align-items: center;
			}
			
			.cep-close-btn {
				background: none;
				border: none;
				color: white;
				cursor: pointer;
				padding: 4px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 4px;
				transition: background 0.2s;
			}
			
			.cep-close-btn:hover {
				background: rgba(255,255,255,0.2);
			}
			
			.cep-content {
				padding: 20px;
				max-height: 70vh;
				overflow-y: auto;
			}
			
			.cep-input-group {
				margin-bottom: 16px;
			}
			
			.cep-label {
				display: block;
				font-size: 13px;
				font-weight: 500;
				color: #374151;
				margin-bottom: 6px;
			}
			
			.cep-input, .cep-select {
				width: 100%;
				padding: 10px 12px;
				border: 1px solid #d1d5db;
				border-radius: 8px;
				font-size: 14px;
				transition: border-color 0.2s, box-shadow 0.2s;
				box-sizing: border-box;
			}
			
			.cep-input:focus, .cep-select:focus {
				outline: none;
				border-color: #4f46e5;
				box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
			}
			
			.cep-row {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 12px;
			}
			
			.cep-btn {
				width: 100%;
				padding: 12px 16px;
				background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
				color: white;
				border: none;
				border-radius: 8px;
				font-size: 14px;
				font-weight: 500;
				cursor: pointer;
				transition: opacity 0.2s;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 8px;
			}
			
			.cep-btn:hover {
				opacity: 0.9;
			}
			
			.cep-btn:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
			
			.cep-btn svg {
				width: 16px;
				height: 16px;
				fill: currentColor;
			}
			
			.cep-divider {
				border: none;
				border-top: 1px solid #e5e7eb;
				margin: 16px 0;
			}
			
			.cep-section-title {
				font-size: 13px;
				font-weight: 600;
				color: #6b7280;
				margin-bottom: 12px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			
			.cep-error {
				background: #fef2f2;
				color: #dc2626;
				padding: 12px;
				border-radius: 8px;
				font-size: 13px;
				margin-bottom: 16px;
				display: none;
			}
			
			.cep-hint {
				font-size: 12px;
				color: #6b7280;
				margin-top: 16px;
				text-align: center;
			}
		</style>
		
		<div class="cep-modal-overlay" id="cep-modal">
			<div class="cep-panel">
				<div class="cep-header">
					<span>Consultar CEP Banxico</span>
					<button class="cep-close-btn" id="cep-close-btn">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 6L6 18M6 6l12 12"/>
						</svg>
					</button>
				</div>
				
				<div class="cep-content">
					<div id="cep-error" class="cep-error"></div>
					
					<div id="cep-form">
						<div class="cep-section-title">Datos de la transferencia</div>
						
						<div class="cep-input-group">
							<label class="cep-label">Clave de Rastreo</label>
							<input type="text" class="cep-input" id="cep-clave-rastreo" placeholder="Ej: 2024012312345678901234">
						</div>
						
						<div class="cep-row">
							<div class="cep-input-group">
								<label class="cep-label">Fecha de Operación</label>
								<input type="date" class="cep-input" id="cep-fecha">
							</div>
							<div class="cep-input-group">
								<label class="cep-label">Monto</label>
								<input type="text" class="cep-input" id="cep-monto" placeholder="Ej: 1000.00">
							</div>
						</div>
						
						<div class="cep-row">
							<div class="cep-input-group">
								<label class="cep-label">Banco Emisor</label>
								<select class="cep-select" id="cep-emisor">
									<option value="">Seleccionar...</option>
									${bankOptions}
								</select>
							</div>
							<div class="cep-input-group">
								<label class="cep-label">Banco Receptor</label>
								<select class="cep-select" id="cep-receptor">
									<option value="">Seleccionar...</option>
									${bankOptions}
								</select>
							</div>
						</div>
						
						<div class="cep-input-group">
							<label class="cep-label">Cuenta Beneficiario</label>
							<input type="text" class="cep-input" id="cep-cuenta" placeholder="CLABE o número de cuenta">
						</div>
						
						<hr class="cep-divider">
						
						<button class="cep-btn" id="cep-search-btn">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
								<polyline points="15 3 21 3 21 9"/>
								<line x1="10" y1="14" x2="21" y2="3"/>
							</svg>
							Consultar en Banxico
						</button>
						
						<p class="cep-hint">Se abrirá la página de Banxico en una nueva pestaña</p>
					</div>
				</div>
			</div>
		</div>
	`;

	return container;
}

function getFormData(): CepFormData {
	const claveRastreoInput = document.getElementById("cep-clave-rastreo") as HTMLInputElement;
	const fechaInput = document.getElementById("cep-fecha") as HTMLInputElement;
	const montoInput = document.getElementById("cep-monto") as HTMLInputElement;
	const emisorSelect = document.getElementById("cep-emisor") as HTMLSelectElement;
	const receptorSelect = document.getElementById("cep-receptor") as HTMLSelectElement;
	const cuentaInput = document.getElementById("cep-cuenta") as HTMLInputElement;

	return {
		fecha: fechaInput?.value || "",
		claveRastreo: claveRastreoInput?.value?.trim() || "",
		emisor: emisorSelect?.value || "",
		receptor: receptorSelect?.value || "",
		cuenta: cuentaInput?.value?.trim() || "",
		monto: montoInput?.value?.trim().replace(/,/g, "") || "",
	};
}

function validateForm(data: CepFormData): string | null {
	if (!data.claveRastreo) return "Ingresa la clave de rastreo";
	if (!data.fecha) return "Selecciona la fecha de operación";
	if (!data.emisor) return "Selecciona el banco emisor";
	if (!data.receptor) return "Selecciona el banco receptor";
	if (!data.cuenta) return "Ingresa la cuenta del beneficiario";
	if (!data.monto) return "Ingresa el monto";
	return null;
}

function updateUI(): void {
	const errorEl = document.getElementById("cep-error");

	if (errorEl) {
		if (state.error) {
			errorEl.textContent = state.error;
			errorEl.style.display = "block";
		} else {
			errorEl.style.display = "none";
		}
	}
}

function formatDateForBanxico(dateStr: string): string {
	// Convert YYYY-MM-DD to DD-MM-YYYY
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		const [year, month, day] = dateStr.split("-");
		return `${day}-${month}-${year}`;
	}
	return dateStr;
}

function openBanxicoPage(): void {
	const formData = getFormData();
	const validationError = validateForm(formData);

	if (validationError) {
		state.error = validationError;
		updateUI();
		return;
	}

	state.error = null;
	updateUI();

	// Create a hidden form and submit via POST
	const form = document.createElement("form");
	form.method = "POST";
	form.action = "https://www.banxico.org.mx/cep/valida.do";
	form.target = "_blank";
	form.style.display = "none";

	const params: Record<string, string> = {
		tipoCriterio: "T",
		captcha: "c",
		tipoConsulta: "1",
		fecha: formatDateForBanxico(formData.fecha),
		criterio: formData.claveRastreo,
		emisor: formData.emisor,
		receptor: formData.receptor,
		cuenta: formData.cuenta,
		monto: formData.monto,
		receptorParticipante: "0",
	};

	for (const [name, value] of Object.entries(params)) {
		const input = document.createElement("input");
		input.type = "hidden";
		input.name = name;
		input.value = value;
		form.appendChild(input);
	}

	document.body.appendChild(form);
	form.submit();
	document.body.removeChild(form);
}

function clearFormInputs(): void {
	const claveInput = document.getElementById("cep-clave-rastreo") as HTMLInputElement;
	const fechaInput = document.getElementById("cep-fecha") as HTMLInputElement;
	const montoInput = document.getElementById("cep-monto") as HTMLInputElement;
	const emisorSelect = document.getElementById("cep-emisor") as HTMLSelectElement;
	const receptorSelect = document.getElementById("cep-receptor") as HTMLSelectElement;
	const cuentaInput = document.getElementById("cep-cuenta") as HTMLInputElement;

	if (claveInput) claveInput.value = "";
	if (fechaInput) fechaInput.value = new Date().toISOString().split("T")[0];
	if (montoInput) montoInput.value = "";
	if (emisorSelect) emisorSelect.value = "";
	if (receptorSelect) receptorSelect.value = "";
	if (cuentaInput) cuentaInput.value = "";
}

function findValueAfterLabel(labelText: string): string | null {
	const allParagraphs = document.querySelectorAll("p");

	for (const p of allParagraphs) {
		if (p.textContent?.trim() === labelText || p.textContent?.trim() === `${labelText}*`) {
			const parentDiv = p.closest('div[style*="width: 40%"]');
			if (parentDiv) {
				const valueDiv = parentDiv.nextElementSibling;
				if (valueDiv) {
					const valueP = valueDiv.querySelector("p");
					if (valueP) {
						return valueP.textContent?.trim() || null;
					}
				}
			}
		}
	}
	return null;
}

function findBankName(): string | null {
	const bankImages = document.querySelectorAll('img[alt="bankLogo"]');
	for (const img of bankImages) {
		const nextP = img.parentElement?.nextElementSibling;
		if (nextP?.tagName === "P") {
			return nextP.textContent?.trim() || null;
		}
	}
	return null;
}

function parseDate(dateStr: string): string {
	// Convert DD/MM/YYYY to YYYY-MM-DD
	const parts = dateStr.split("/");
	if (parts.length === 3) {
		const [day, month, year] = parts;
		return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
	}
	return dateStr;
}

function parseMonto(montoStr: string): string {
	return montoStr.replace(/[$,]/g, "").trim();
}

function tryExtractTransactionData(): void {
	try {
		console.log("Extracting transaction data from Payana page...");

		// Extract Clave de rastreo
		const claveRastreo = findValueAfterLabel("Clave de rastreo");
		if (claveRastreo) {
			const claveInput = document.getElementById("cep-clave-rastreo") as HTMLInputElement;
			if (claveInput && !claveInput.value) {
				claveInput.value = claveRastreo;
				console.log("Extracted clave de rastreo:", claveRastreo);
			}
		}

		// Extract Fecha de procesamiento
		const fecha = findValueAfterLabel("Fecha de procesamiento");
		if (fecha) {
			const fechaInput = document.getElementById("cep-fecha") as HTMLInputElement;
			if (fechaInput) {
				fechaInput.value = parseDate(fecha);
				console.log("Extracted fecha:", fecha);
			}
		}

		// Extract Monto
		const monto = findValueAfterLabel("Monto");
		if (monto) {
			const montoInput = document.getElementById("cep-monto") as HTMLInputElement;
			if (montoInput && !montoInput.value) {
				montoInput.value = parseMonto(monto);
				console.log("Extracted monto:", monto);
			}
		}

		// Extract CLABE (cuenta beneficiario)
		const clabe = findValueAfterLabel("CLABE");
		if (clabe) {
			const cuentaInput = document.getElementById("cep-cuenta") as HTMLInputElement;
			if (cuentaInput && !cuentaInput.value) {
				cuentaInput.value = clabe;
				console.log("Extracted CLABE:", clabe);
			}
		}

		// Set Banco Emisor to STP (90646) - always STP for Payana
		const emisorSelect = document.getElementById("cep-emisor") as HTMLSelectElement;
		if (emisorSelect && !emisorSelect.value) {
			emisorSelect.value = "90646";
			console.log("Set emisor to STP (90646)");
		}

		// Extract Banco Receptor from page
		const bankName = findBankName();
		if (bankName) {
			const bankCode = getBankCode(bankName);
			if (bankCode) {
				const receptorSelect = document.getElementById("cep-receptor") as HTMLSelectElement;
				if (receptorSelect && !receptorSelect.value) {
					receptorSelect.value = bankCode;
					console.log("Set receptor from page:", bankName, "->", bankCode);
				}
			}
		}

		// Fallback: try regex extraction from page text
		const pageText = document.body.innerText;

		if (!claveRastreo) {
			const claveMatch = pageText.match(/Clave de rastreo[*]?\s*[\n\r]+\s*(\d{20,30})/i);
			if (claveMatch) {
				const claveInput = document.getElementById("cep-clave-rastreo") as HTMLInputElement;
				if (claveInput && !claveInput.value) {
					claveInput.value = claveMatch[1];
					console.log("Extracted clave (regex):", claveMatch[1]);
				}
			}
		}
	} catch (error) {
		console.log("Error extracting transaction data:", error);
	}
}

function openModal(): void {
	const modal = document.getElementById("cep-modal");
	if (modal) {
		state.isPanelOpen = true;
		state.error = null;
		modal.classList.add("open");
		clearFormInputs();
		tryExtractTransactionData();
	}
}

function closeModal(): void {
	const modal = document.getElementById("cep-modal");
	if (modal) {
		state.isPanelOpen = false;
		modal.classList.remove("open");
	}
}

function findAndInjectButton(): boolean {
	// Find the "Descargar" button in Payana's UI (not "Descargar extractos" or similar)
	const buttons = document.querySelectorAll("button");
	let descargarBtn: HTMLButtonElement | null = null;

	for (const btn of buttons) {
		const text = btn.textContent?.trim();
		// Match exactly "Descargar" - not "Descargar extractos" etc.
		if (text === "Descargar") {
			descargarBtn = btn;
			break;
		}
	}

	if (!descargarBtn) {
		return false;
	}

	// Check if we already injected the button
	if (document.getElementById("cep-inline-btn")) {
		return true;
	}

	// Create the inline CEP button
	const cepButton = createInlineButton();
	cepButton.style.marginRight = "12px";

	// Insert before the Descargar button
	descargarBtn.parentElement?.insertBefore(cepButton, descargarBtn);

	// Add click handler
	cepButton.addEventListener("click", openModal);

	console.log("CEP button injected next to Descargar");
	return true;
}

async function initExtension(): Promise<void> {
	// Check if already initialized
	if (document.getElementById("payana-cep-extension")) return;

	// Create and append the modal UI
	const ui = createExtensionUI();
	document.body.appendChild(ui);

	// Try to inject button, retry if page not fully loaded
	if (!findAndInjectButton()) {
		const retryDelays = [500, 1000, 2000, 3000, 5000];
		for (const delay of retryDelays) {
			await new Promise((resolve) => setTimeout(resolve, delay));
			if (findAndInjectButton()) break;
		}
	}

	// Observe DOM changes in case the button container loads later
	const observer = new MutationObserver(() => {
		if (!document.getElementById("cep-inline-btn")) {
			findAndInjectButton();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });

	// Watch for URL changes (SPA navigation)
	let lastUrl = location.href;
	const urlObserver = new MutationObserver(() => {
		if (location.href !== lastUrl) {
			lastUrl = location.href;
			console.log("URL changed, re-injecting button...");
			document.getElementById("cep-inline-btn")?.remove();
			setTimeout(() => findAndInjectButton(), 500);
		}
	});
	urlObserver.observe(document.body, { childList: true, subtree: true });

	// Close button
	const closeBtn = document.getElementById("cep-close-btn");
	closeBtn?.addEventListener("click", closeModal);

	// Close modal when clicking overlay
	const modal = document.getElementById("cep-modal");
	modal?.addEventListener("click", (e) => {
		if (e.target === modal) {
			closeModal();
		}
	});

	// Close on Escape key
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && state.isPanelOpen) {
			closeModal();
		}
	});

	// Search button - open Banxico page
	const searchBtn = document.getElementById("cep-search-btn");
	searchBtn?.addEventListener("click", openBanxicoPage);

	// Set today's date as default
	const fechaInput = document.getElementById("cep-fecha") as HTMLInputElement;
	if (fechaInput) {
		fechaInput.value = new Date().toISOString().split("T")[0];
	}

	console.log("Payana CEP Extension initialized (direct Banxico mode)");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initExtension);
} else {
	initExtension();
}
