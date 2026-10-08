# Fatorial Lab

Uma experiência estática para explorar o crescimento do fatorial, feita com HTML5, CSS3 e JavaScript moderno.

## Estrutura

- `index.html`: conteúdo semântico e acessível da página.
- `css/style.css`: design system, layout responsivo, estados visuais e animações.
- `js/script.js`: validação, cálculo BigInt, renderização, construção, crescimento e cópia.

## Como executar

Abra `index.html` diretamente no navegador ou use a extensão Live Server do VS Code. Não há dependências, etapa de build ou servidor de aplicação. O Google Fonts é opcional; fontes de fallback mantêm a página utilizável sem conexão.

## Experiência

- Entradas aceitas: inteiros de 0 a 500, validados novamente no JavaScript.
- O valor exato é calculado e mantido como `BigInt`; apenas a entrada validada e limitada é convertida para um índice de loop.
- A expressão completa e animada é reservada para 0–12. Acima disso, o meio da expressão é omitido.
- Resultados longos são agrupados para leitura e quebrados dentro de uma região com rolagem vertical controlada. O botão de cópia envia o inteiro sem separadores.
- A tabela de crescimento usa amostras até 500! e escala logarítmica nas barras.
- As animações respeitam `prefers-reduced-motion`.

## Verificações

Checagem de sintaxe do JavaScript:

```sh
node --check js/script.js
```

No navegador, confira os casos 0, 1, 2, 5, 7, 10, 12, 20, 30, 50, 100 e 500; entradas vazias, negativas, decimais, texto e acima de 500; envio com Enter; expansão das etapas; cópia; e larguras de 320 px a desktop.