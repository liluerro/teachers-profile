(function () {
  "use strict";

  var BUTTON_ID = "dom-walker-btn";
  var HIGHLIGHT_CLASS = "dom-walker-current";
  var running = false;

  /* ---------- 1. Стилі кнопки та підсвічування (додаються з JS) ---------- */
  function injectStyles() {
    var style = document.createElement("style");
    style.textContent =
      "#" +
      BUTTON_ID +
      "{position:fixed;right:16px;bottom:16px;z-index:10000;" +
      "padding:14px 22px;border:0;border-radius:10px;background:#7765c9;color:#fff;" +
      'font:700 16px/1 "DM Sans",Arial,sans-serif;cursor:pointer;' +
      "box-shadow:0 6px 18px rgba(0,0,0,.25);transition:background .2s,transform .2s}" +
      "#" +
      BUTTON_ID +
      ":hover{background:#182b3a;transform:translateY(-2px)}" +
      "#" +
      BUTTON_ID +
      "[disabled]{opacity:.6;cursor:default;transform:none}" +
      "." +
      HIGHLIGHT_CLASS +
      "{outline:4px solid #ff9800!important;outline-offset:3px!important;" +
      "background-color:rgba(255,152,0,.12)!important}";
    document.head.appendChild(style);
  }

  /* ---------- 2. Збір вузлів у порядку обходу в глибину ---------- */
  function collectNodes() {
    var all = document.documentElement.querySelectorAll("*");
    var list = [document.documentElement];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (
        el.tagName === "SCRIPT" ||
        el.id === BUTTON_ID ||
        (el.tagName === "STYLE" && el.textContent.indexOf(BUTTON_ID) !== -1)
      ) {
        continue; // службові елементи не входять до обходу
      }
      list.push(el);
    }
    return list;
  }

  /* ---------- 3. Допоміжні функції для опису вузла ---------- */
  function shorten(text, max) {
    text = (text || "").replace(/\s+/g, " ").trim();
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  function depthOf(el) {
    var d = 0;
    while (el.parentElement) {
      d++;
      el = el.parentElement;
    }
    return d;
  }

  function pathOf(el) {
    var parts = [];
    while (el) {
      var s = el.tagName.toLowerCase();
      if (el.id) s += "#" + el.id;
      parts.unshift(s);
      el = el.parentElement;
    }
    return parts.join(" > ");
  }

  function describe(el, index, total) {
    var attrs = [];
    if (el.id) attrs.push('id="' + el.id + '"');
    if (el.className && typeof el.className === "string")
      attrs.push('class="' + el.className + '"');

    return (
      "Вузол " +
      (index + 1) +
      " з " +
      total +
      "\n" +
      "Тег: <" +
      el.tagName.toLowerCase() +
      ">" +
      (attrs.length ? "  " + attrs.join(" ") : "") +
      "\n" +
      "Шлях: " +
      pathOf(el) +
      "\n" +
      "Рівень вкладеності: " +
      depthOf(el) +
      ", дочірніх елементів: " +
      el.children.length +
      "\n" +
      "Вміст: " +
      (shorten(el.textContent, 120) || "(порожньо)")
    );
  }

  /* ---------- 4. Підсвічування поточного вузла ---------- */
  function highlight(el) {
    var old = document.querySelector("." + HIGHLIGHT_CLASS);
    if (old) old.classList.remove(HIGHLIGHT_CLASS);
    if (el && el !== document.documentElement && el !== document.body) {
      el.classList.add(HIGHLIGHT_CLASS);
      if (el.scrollIntoView)
        el.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }

  function clearHighlight() {
    highlight(null);
  }

  /* ---------- 5. Діалог із функцією зворотного виклику ---------- */
  // ask(text, callback): показує confirm і передає відповідь (true/false) у callback.
  // Невеликий таймер дозволяє браузеру перемалювати підсвічування до блокування confirm.
  function ask(text, callback) {
    setTimeout(function () {
      callback(window.confirm(text));
    }, 60);
  }

  /* ---------- 6. Основний обхід (через callback-и) ---------- */
  function visit(nodes, index, onFinish) {
    var node = nodes[index];
    var isFirst = index === 0;
    var isLast = index === nodes.length - 1;
    var text = describe(node, index, nodes.length);

    highlight(node);

    // Колбеки дій користувача
    function goNext() {
      visit(nodes, index + 1, onFinish);
    }
    function goBack() {
      visit(nodes, index - 1, onFinish);
    }
    function exit() {
      onFinish();
    }

    if (isFirst) {
      // Перший вузол: OK — до наступного, Скасувати — завершити
      ask(
        text +
          "\n\nПерейти до наступного вузла?\n[OK] — далі   [Скасувати] — завершити роботу",
        function (yes) {
          yes ? goNext() : exit();
        },
      );
    } else if (isLast) {
      // Нижній вузол: OK — повернутись, Скасувати — вийти
      ask(
        text +
          "\n\nЦе останній вузол.\nПовернутися назад чи вийти?\n[OK] — назад   [Скасувати] — вийти",
        function (yes) {
          yes ? goBack() : exit();
        },
      );
    } else {
      // Проміжний вузол: OK — пройти далі, Скасувати — повернутися
      ask(
        text +
          "\n\nПройти далі чи повернутися?\n[OK] — далі   [Скасувати] — назад",
        function (yes) {
          yes ? goNext() : goBack();
        },
      );
    }
  }

  function startTraversal(button) {
    if (running) return;
    running = true;
    button.disabled = true;

    var nodes = collectNodes();
    visit(nodes, 0, function onFinish() {
      clearHighlight();
      running = false;
      button.disabled = false;
      setTimeout(function () {
        window.alert("Обхід DOM-дерева завершено.");
      }, 60);
    });
  }

  /* ---------- 7. Створення кнопки ---------- */
  function init() {
    injectStyles();
    var btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.textContent = "Обхід DOM-дерева";
    btn.addEventListener("click", function () {
      startTraversal(btn);
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
