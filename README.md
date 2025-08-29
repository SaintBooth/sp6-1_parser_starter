# sp6-1_parser_starter

Для запуска откройте `index.html` и выполняйте работе в файле parser.js.

По готовности или сразу раскомментируйте вызов makeTests();

Вот обновлённый README с корректной структурой проекта и без упоминаний тестового файла. Можно копировать как есть.

---

# Парсер страницы продукта (JS)

Небольшой JavaScript-парсер, который разбирает HTML страницы товара и возвращает структурированный JSON с метаданными, карточкой продукта, рекомендованными товарами и отзывами. Написан на чистом JS, работает напрямую с DOM.

## Цель

Реализовать надёжную функцию `parsePage`, которая:

* извлекает **мета-данные** (title, description, keywords, OpenGraph);
* парсит **продукт** (id, название, цена, скидка, изображения, описание и т. д.);
* собирает **рекомендации** и **отзывы**;
* строго следует ожидаемому формату и типам данных.

## Структура проекта

```
sp6-1_parser_starter/
├─ assets/               # изображения и прочие статические ресурсы
├─ fonts/
│  └─ ys-display/        # файлы шрифтов для демо-страницы
├─ index.html            # демо-страница с разметкой продукта
├─ main.js               # пример использования parsePage на странице
├─ parser.js             # основная функция парсинга и утилиты
├─ README.md             # этот файл
└─ style.css             # базовые стили демо-страницы
```

## Быстрый старт

Подключите парсер на страницу и вызовите функцию:

```html
<!-- index.html -->
<script src="parser.js"></script>
<script>
  const result = parsePage(document);       // { meta, product, suggested, reviews }
  console.log(result);
</script>
```

Либо используйте отдельно файл с примером:

```html
<!-- index.html -->
<script src="parser.js"></script>
<script src="main.js"></script>
```

В `main.js` можно включить отладку:

```js
// main.js
const result = parsePage(document, true);   // печатает отладочные сообщения
console.log(result);
```

## API

```ts
function parsePage(root: Document | Element = document, debug = false): {
  meta: {
    language: string;
    title: string;
    description: string;
    keywords: string[];
    opengraph: {
      title: string;
      image?: string;
      type?: string;
    };
  };
  product: {
    id?: string;
    name: string;
    price?: number | string;
    discount?: number | string;
    images?: string[];
    description?: string; // нормализованный компактный HTML
    // ...и другие поля, зависящие от разметки
  };
  suggested: Array<{
    id?: string;
    title: string;
    price: string; // строка без символа валюты
    // ...доп. поля
  }>;
  reviews: Array<{
    author: string;
    date: string; // DD.MM.YYYY
    text: string;
    // ...доп. поля
  }>;
}
```

## Ключевые решения и нюансы реализации

**OpenGraph title**
Встречается формат `About Vite — Modern Development Tool`. Чтобы получить «краткий» заголовок, строка обрезается по первому длинному тире:

```js
const ogTitle = (getMetaContent('og:title') || '').split('—').shift().trim();
```

**Цена в рекомендациях как строка**
Для строгости формата `suggested[].price` хранится **строкой**:

```js
price: String(parsed.amount);
```

**Компактный HTML описания продукта**
Чтобы убрать атрибуты и переносы, используется клонирование узла и очистка атрибутов через DOM:

```js
const stripAllAttrs = element => {
  if (!element) return '';
  const clone = element.cloneNode(true);
  clone.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => el.removeAttribute(a.name));
  });
  return clone.innerHTML.trim();
};
```

Также описание берётся из блока `.about .description`, если он присутствует в разметке.

**Тихая консоль по умолчанию**
Все `console.log` обёрнуты в `if (debug) { ... }`.

## Технические детали

* **Язык:** чистый JavaScript (ES6+)
* **Зависимости:** нет (нативный DOM API)
* **Основные селекторы:**

  * Метаданные: `<meta>`, `<title>`, `<html lang>`
  * Продукт: `.product`, `.about .description`, `.about .properties`, `.product .price`, `.product .tags`
  * Рекомендации: `.suggested .items article`
  * Отзывы: `.reviews .items article`
* **Поведение и формат:**

  * Аккуратная обработка отсутствующих элементов (разумные значения по умолчанию)
  * Нормализация HTML в `product.description` через `cloneNode`
  * Поддержка символов валют (₽, \$, €)
  * Даты отзывов приводятся к формату `DD.MM.YYYY`

## Дорожная карта

* Обернуть критичные операции в `try/catch`
* Вынести `parsePrice`, `stripAllAttrs`, `getMetaContent` в отдельный модуль
* Добавить конфиг для выборочной отладки (например, только `meta`/`product`/`reviews`)
* Кэшировать часто используемые селекторы
* Покрыть edge-кейсы (пустые или «битые» разметки)

---

Коротко: парсер минималистичный, предсказуемый и легко расширяемый. Подходит как учебный пример и как база для продакшен-скрейпера в браузере.
