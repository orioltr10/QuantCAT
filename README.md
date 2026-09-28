# QuantCAT

Una aplicació web d'estimació inspirada en jocs d'estimaci�, dissenyada per a usuaris catalans.

## Estructura del Projecte

L'aplicació està construïda amb **Vanilla JavaScript**, **ES Modules**, i **Tailwind CSS**. Aquesta arquitectura fa que sigui fàcilment mantinguda sense necessitat d'entorns complexes com Node.js o processos de 'build', però manté un codi net i modular preparat per a producció.

* `index.html`: Punt d'entrada de l'aplicació i la UI base.
* `js/main.js`: Controlador principal i gestió d'estat de la UI (router/vistes).
* `js/utils/gameLogic.js`: Lògica de l'escala logarítmica, puntuacions i simulació de jugadors.
* `js/data/questions.js`: **Aquí és on has d'afegir les teves 200 preguntes**.

## Com Afegir les Teves Preguntes

1. Obre l'arxiu `js/data/questions.js`.
2. Veuràs l'array `questions` amb 3 exemples inicials.
3. Substitueix aquests exemples per les teves 200 preguntes seguint l'esquema proporcionat:

```javascript
{
    id: "identificador_unic",
    text: "Pregunta a fer...",
    answer: 1000000, // Número! Res de text
    unit: "habitants", // Unitat de mesura
    explanation: "Explicació opcional que surt a la solució.",
    category: "Tema",
    difficulty: "fàcil", // "fàcil", "mitjana", "difícil"
    sourceUrl: "https://url-de-la-font.com" // Opcional
}
```

## Com Executar-ho (Desenvolupament)

Com que utilitza ES Modules (`<script type="module">`), no pots obrir l'arxiu `index.html` directament fent doble clic des de l'explorador d'arxius, ja que els navegadors bloquegen per seguretat l'accés a arxius locals (CORS).

**Per provar-ho, has de fer servir un petit servidor local:**

* **Si utilitzes VS Code:** Instal·la l'extensió "Live Server", fes clic dret a l'`index.html` i selecciona "Open with Live Server".
* **Si tens Node.js instal·lat (opcional):** Pots executar `npx serve` a la carpeta del projecte.
* **Si tens Python instal·lat (opcional):** Pots executar `python -m http.server` i obrir `http://localhost:8000` al navegador.

## Funcionalitats Implementades
- Interfície UI moderna i minimalista amb Tailwind.
- Mecànica de joc basada en el sistema logarítmic de Fermi.
- Reconeixement flexible de números (1.000.000, 1e6, etc.).
- Visualització gràfica d'una distribució simulada respecte els altres jugadors.
- Persistència d'estadístiques a nivell local (`localStorage`).
