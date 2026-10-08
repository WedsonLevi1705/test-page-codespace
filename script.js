const formulario = document.querySelector("#formulario-fatorial");
const campoNumero = document.querySelector("#numero");
const campoResultado = document.querySelector("#resultado");
const mensagem = document.querySelector("#mensagem");

formulario.addEventListener("submit", (evento) => {
	evento.preventDefault();
	mensagem.textContent = "";

	const valor = campoNumero.value;
	const numero = Number(valor);

	if (valor === "" || !Number.isSafeInteger(numero) || numero < 0) {
		campoResultado.value = "";
		mensagem.textContent = "Digite um número inteiro não negativo.";
		return;
	}

	let fatorial = 1n;
	const fatores = [];

	for (let atual = numero; atual > 1; atual -= 1) {
		fatorial *= BigInt(atual);
		fatores.push(atual);
	}

	if (numero > 1) {
		fatores.push(1);
	}

	const expressao = fatores.length > 0 ? fatores.join(" x ") : "1";
	campoResultado.value = `${numero}! = ${expressao} = ${fatorial}`;
});
