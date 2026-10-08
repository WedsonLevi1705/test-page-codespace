const elements = {
    calculator: document.querySelector("#calculadora"),
    form: document.querySelector("#factorial-form"),
    input: document.querySelector("#number-input"),
    inputError: document.querySelector("#number-error"),
    status: document.querySelector("#calculation-status"),
    resultPanel: document.querySelector("#result-panel"),
    resultFactorial: document.querySelector("#result-factorial"),
    resultNumber: document.querySelector("#result-number"),
    resultDigits: document.querySelector("#result-digits"),
    copyButton: document.querySelector("#copy-button"),
    copyFeedback: document.querySelector("#copy-feedback"),
    expression: document.querySelector("#expression-output"),
    expressionMeta: document.querySelector("#expression-meta"),
    expressionNote: document.querySelector("#expression-note"),
    constructionSteps: document.querySelector("#construction-steps"),
    constructionPlaceholder: document.querySelector("#construction-placeholder"),
    constructionSummary: document.querySelector("#construction-summary"),
    constructionSummaryExpression: document.querySelector("#construction-summary-expression"),
    constructionSummaryNote: document.querySelector("#construction-summary-note"),
    growthList: document.querySelector("#growth-list"),
};

const factorialCache = new Map([
    [0, 1n],
    [1, 1n],
]);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeCalculation = 0;
let latestResult = null;
let copyFeedbackTimer = 0;

function formatCount(value) {
    return new Intl.NumberFormat("pt-BR").format(value);
}

function formatInteger(value) {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function readInput() {
    return elements.input.value.trim();
}

function validateInput(value) {
    if (value === "") {
        return { valid: false, message: "Digite um número para continuar." };
    }

    if (!/^\d+$/.test(value)) {
        if (value.startsWith("-")) {
            return { valid: false, message: "O número precisa ser um inteiro entre 0 e 500." };
        }

        return { valid: false, message: "Use apenas um número inteiro, sem ponto ou vírgula." };
    }

    const normalizedValue = value.replace(/^0+(?=\d)/, "");

    if (normalizedValue.length > 3) {
        return { valid: false, message: "O limite desta experiência é 500." };
    }

    const inputAsBigInt = BigInt(normalizedValue);

    if (inputAsBigInt > 500n) {
        return { valid: false, message: "Digite um inteiro entre 0 e 500." };
    }

    return { valid: true, value: Number(inputAsBigInt) };
}

function setUIState(state, message) {
    elements.calculator.dataset.state = state;
    elements.calculator.setAttribute("aria-busy", String(state === "calculating"));

    const defaultMessages = {
        idle: "Aguardando um número.",
        calculating: "Construindo o cálculo...",
        result: "Cálculo concluído.",
        error: "Revise o número informado.",
    };

    elements.status.textContent = message || defaultMessages[state];
}

function showInputError(message) {
    elements.input.setAttribute("aria-invalid", "true");
    elements.inputError.textContent = message;
    elements.inputError.hidden = false;
    setUIState("error", message);
}

function clearInputError() {
    elements.input.removeAttribute("aria-invalid");
    elements.inputError.textContent = "";
    elements.inputError.hidden = true;
}

function calculateFactorial(number) {
    if (factorialCache.has(number)) {
        return factorialCache.get(number);
    }

    let highestCachedInput = 1;
    for (const cachedInput of factorialCache.keys()) {
        if (cachedInput < number && cachedInput > highestCachedInput) {
            highestCachedInput = cachedInput;
        }
    }

    let result = factorialCache.get(highestCachedInput);

    for (let factor = highestCachedInput + 1; factor <= number; factor += 1) {
        result *= BigInt(factor);
        factorialCache.set(factor, result);
    }

    return result;
}

function createResultModel(number) {
    const exactValue = calculateFactorial(number).toString();
    const multiplicationCount = Math.max(0, number - 1);
    let expression;

    if (number === 0) {
        expression = "0! = 1";
    } else if (number <= 12) {
        expression = Array.from({ length: number }, (_, index) => number - index).join(" × ");
    } else {
        expression = `${number} × ${number - 1} × ${number - 2} × … × 3 × 2 × 1`;
    }

    return {
        number,
        exactValue,
        displayValue: formatInteger(exactValue),
        digitCount: exactValue.length,
        multiplicationCount,
        expression,
        scale: number <= 12 ? "small" : number <= 30 ? "medium" : "large",
    };
}

function createDigitLabel(count) {
    return `${formatCount(count)} ${count === 1 ? "dígito" : "dígitos"}`;
}

function createMultiplicationLabel(count) {
    return `${formatCount(count)} ${count === 1 ? "multiplicação" : "multiplicações"}`;
}

function waitForAnimation(milliseconds) {
    if (reducedMotion.matches || milliseconds <= 0) {
        return Promise.resolve();
    }

    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function renderExpression(model, calculationId) {
    elements.expression.replaceChildren();
    elements.expression.classList.toggle("is-summary", model.number > 12);
    elements.expressionMeta.textContent = model.number === 0
        ? "CASO BASE"
        : `${formatCount(model.number)} ${model.number === 1 ? "FATOR" : "FATORES"}`;
    elements.expressionNote.textContent = model.number <= 12
        ? `${createMultiplicationLabel(model.multiplicationCount)} na sequência completa.`
        : `${createMultiplicationLabel(model.multiplicationCount)} · trecho central resumido.`;

    if (model.number > 12) {
        elements.expression.textContent = model.expression;
        await waitForAnimation(140);
        return calculationId === activeCalculation;
    }

    const factors = model.number === 0 ? ["0! = 1"] : Array.from(
        { length: model.number },
        (_, index) => String(model.number - index),
    );

    for (let index = 0; index < factors.length; index += 1) {
        if (index > 0) {
            elements.expression.append(document.createTextNode(" × "));
        }

        const term = document.createElement("span");
        term.className = "expression-term";
        term.textContent = factors[index];
        elements.expression.append(term);

        if (index < factors.length - 1) {
            await waitForAnimation(90);
            if (calculationId !== activeCalculation) {
                return false;
            }
        }
    }

    if (factors.length === 1) {
        await waitForAnimation(100);
    }

    return calculationId === activeCalculation;
}

function createConstructionStep(factor, previousProduct, nextProduct, index, detailText) {
    const item = document.createElement("li");
    item.className = "construction-step";

    const detailId = `step-detail-${index}`;
    const trigger = document.createElement("button");
    trigger.className = "step-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", detailId);
    const factorDescription = factor === 0 ? "caso base 0!" : `fator ${factor}`;
    trigger.setAttribute("aria-label", `Etapa ${index}: ${factorDescription}. Mostrar operação.`);

    const stepIndex = document.createElement("span");
    stepIndex.className = "step-index";
    stepIndex.textContent = String(index).padStart(2, "0");

    const stepTerm = document.createElement("span");
    stepTerm.className = "step-term";
    stepTerm.textContent = index === 1 ? String(factor) : `× ${factor}`;

    const stepHint = document.createElement("span");
    stepHint.className = "step-hint";
    stepHint.textContent = "VER OPERAÇÃO";

    trigger.append(stepIndex, stepTerm, stepHint);

    const detail = document.createElement("span");
    detail.className = "step-detail";
    detail.id = detailId;
    detail.hidden = true;
    detail.textContent = detailText || `${previousProduct.toString()} × ${factor} = ${nextProduct.toString()}`;

    item.append(trigger, detail);
    return item;
}

function renderConstruction(model) {
    elements.constructionSteps.replaceChildren();
    elements.constructionPlaceholder.hidden = true;

    if (model.number > 12) {
        elements.constructionSummary.hidden = false;
        elements.constructionSummaryExpression.textContent = model.expression;
        elements.constructionSummaryNote.textContent = `${formatCount(model.number)} fatores · ${createMultiplicationLabel(model.multiplicationCount)}. O trecho central fica resumido para manter a visualização leve.`;
        return;
    }

    elements.constructionSummary.hidden = true;

    if (model.number === 0) {
        elements.constructionSteps.append(createConstructionStep(0, 0n, 1n, 1, "0! = 1"));
        return;
    }

    let accumulatedProduct = 1n;

    for (let factor = model.number, index = 1; factor >= 1; factor -= 1, index += 1) {
        const previousProduct = accumulatedProduct;
        accumulatedProduct *= BigInt(factor);
        elements.constructionSteps.append(
            createConstructionStep(
                factor,
                previousProduct,
                accumulatedProduct,
                index,
                model.number === 1 ? "1! = 1" : undefined,
            ),
        );
    }
}

function animateResult() {
    elements.resultNumber.classList.remove("is-entering", "is-large-entering");
    void elements.resultNumber.offsetWidth;
    elements.resultNumber.classList.add("is-entering");

    if (elements.resultPanel.dataset.size === "large") {
        elements.resultNumber.classList.add("is-large-entering");
    }
}

function renderResult(model) {
    latestResult = model;
    elements.resultPanel.dataset.size = model.scale === "large" ? "large" : "small";
    elements.resultFactorial.textContent = `${model.number}!`;
    elements.resultNumber.textContent = model.displayValue;
    elements.resultNumber.setAttribute(
        "aria-label",
        `Valor exato de ${model.number} fatorial, com ${createDigitLabel(model.digitCount)}`,
    );
    elements.resultDigits.textContent = createDigitLabel(model.digitCount);
    elements.copyButton.hidden = false;
    elements.copyFeedback.textContent = "";
    animateResult();
}

function clearResult() {
    latestResult = null;
    elements.resultPanel.dataset.size = "small";
    elements.resultFactorial.textContent = "n!";
    elements.resultNumber.textContent = "Aguardando entrada";
    elements.resultNumber.setAttribute("aria-label", "Resultado exato do fatorial");
    elements.resultNumber.classList.remove("is-entering", "is-large-entering");
    elements.resultDigits.textContent = "—";
    elements.copyButton.hidden = true;
    elements.copyFeedback.textContent = "";
}

function createCompletionMessage(model) {
    if (model.number <= 12) {
        return `${model.number}! calculado: ${model.displayValue}. ${createDigitLabel(model.digitCount)}.`;
    }

    return `${model.number}! calculado. Resultado exato com ${createDigitLabel(model.digitCount)}.`;
}

async function handleSubmit(event) {
    event.preventDefault();
    const calculationId = ++activeCalculation;
    const validation = validateInput(readInput());

    if (!validation.valid) {
        clearResult();
        elements.expression.textContent = "A sequência aparece aqui.";
        elements.expressionMeta.textContent = "0 TERMOS";
        elements.expressionNote.textContent = "Cada fator leva o resultado um passo adiante.";
        elements.constructionSteps.replaceChildren();
        elements.constructionPlaceholder.hidden = false;
        elements.constructionSummary.hidden = true;
        showInputError(validation.message);
        return;
    }

    clearInputError();
    clearResult();
    elements.constructionSteps.replaceChildren();
    elements.constructionPlaceholder.hidden = true;
    elements.constructionSummary.hidden = true;
    setUIState("calculating", `Calculando ${validation.value}!`);

    const model = createResultModel(validation.value);
    const expressionReady = await renderExpression(model, calculationId);

    if (!expressionReady) {
        return;
    }

    renderConstruction(model);
    renderResult(model);
    setUIState("result", createCompletionMessage(model));
}

function renderGrowth() {
    const sampleInputs = [5, 10, 20, 50, 100, 500];
    const maximumDigits = calculateFactorial(500).toString().length;
    const fragment = document.createDocumentFragment();

    for (const number of sampleInputs) {
        const digitCount = calculateFactorial(number).toString().length;
        const row = document.createElement("div");
        row.className = "growth-row";
        row.setAttribute("role", "listitem");
        row.setAttribute("aria-label", `${number}! tem ${createDigitLabel(digitCount)}`);

        const label = document.createElement("p");
        label.className = "growth-label";
        label.textContent = `${number}!`;

        const track = document.createElement("div");
        track.className = "growth-track";
        track.setAttribute("aria-hidden", "true");

        const bar = document.createElement("span");
        bar.className = "growth-bar";
        const width = Math.max(3, (Math.log10(digitCount) / Math.log10(maximumDigits)) * 100);
        bar.style.setProperty("--bar-width", `${width}%`);
        track.append(bar);

        const count = document.createElement("p");
        count.className = "growth-count";
        count.textContent = createDigitLabel(digitCount);

        row.append(label, track, count);
        fragment.append(row);
    }

    elements.growthList.setAttribute("role", "list");
    elements.growthList.append(fragment);
}

function toggleConstructionDetail(event) {
    const trigger = event.target.closest(".step-trigger");

    if (!trigger || !elements.constructionSteps.contains(trigger)) {
        return;
    }

    const isExpanded = trigger.getAttribute("aria-expanded") === "true";
    const detail = document.getElementById(trigger.getAttribute("aria-controls"));
    const hint = trigger.querySelector(".step-hint");

    trigger.setAttribute("aria-expanded", String(!isExpanded));
    trigger.setAttribute(
        "aria-label",
        trigger.getAttribute("aria-label").replace(
            isExpanded ? "Ocultar" : "Mostrar",
            isExpanded ? "Mostrar" : "Ocultar",
        ),
    );
    detail.hidden = isExpanded;
    hint.textContent = isExpanded ? "VER OPERAÇÃO" : "FECHAR";
}

function copyFallback(value) {
    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = value;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.setAttribute("aria-hidden", "true");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";
    temporaryInput.style.pointerEvents = "none";
    document.body.append(temporaryInput);
    temporaryInput.select();

    let copied = false;
    try {
        copied = document.execCommand("copy");
    } finally {
        temporaryInput.remove();
        elements.copyButton.focus();
    }

    return copied;
}

async function copyResult() {
    if (!latestResult) {
        return;
    }

    let copied = false;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(latestResult.exactValue);
            copied = true;
        } else {
            copied = copyFallback(latestResult.exactValue);
        }
    } catch {
        copied = copyFallback(latestResult.exactValue);
    }

    elements.copyFeedback.textContent = copied ? "Copiado!" : "Não foi possível copiar. Selecione o resultado para copiá-lo.";

    if (copyFeedbackTimer) {
        window.clearTimeout(copyFeedbackTimer);
    }

    if (copied) {
        copyFeedbackTimer = window.setTimeout(() => {
            elements.copyFeedback.textContent = "";
        }, 2400);
    }
}

elements.form.addEventListener("submit", handleSubmit);
elements.copyButton.addEventListener("click", copyResult);
elements.constructionSteps.addEventListener("click", toggleConstructionDetail);
elements.resultNumber.addEventListener("animationend", (event) => {
    if (event.animationName === "result-reveal") {
        elements.resultNumber.classList.remove("is-entering", "is-large-entering");
    }
});

renderGrowth();