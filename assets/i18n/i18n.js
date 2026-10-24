/* ORAQUI i18n. Only explicit application-owned keys are translated.
 * No DOM text scanning, network translation, Auth writes or IndexedDB access. */
(function (global) {
  'use strict';
  const catalogs = global.ORAQUI_CATALOGS || {};
  const DEFAULT = 'pt-BR', DEVICE = 'oraqui:locale:device', USER = 'oraqui:locale:user:';
  const bindings = new Map();
  const subscribers = new Set();
  let userId = null;
  const supported = value => value === 'it-IT' || value === DEFAULT;
  function read(key) { try { return global.localStorage.getItem(key); } catch { return null; } }
  function write(key, value) { try { global.localStorage.setItem(key, value); } catch { /* Session still works in private mode. */ } }
  let locale = supported(read(DEVICE)) ? read(DEVICE) : DEFAULT;
  function t(key, values) {
    const own = dictionary => dictionary && Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
    let result = own(catalogs[locale]) ?? own(catalogs[DEFAULT]) ?? key;
    return String(result).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) =>
      values && Object.hasOwn(values, name) ? String(values[name]) : match);
  }
  function ui(key, values) {
    return Object.freeze({oraquiKey:key, values, toString() { return t(key, values); }});
  }
  function renderValue(value) { return value && typeof value === 'object' && typeof value.oraquiKey === 'string' ? t(value.oraquiKey, value.values) : String(value ?? ''); }
  function bind(element, attribute, value) {
    if (!element) return;
    let slots = bindings.get(element);
    if (!slots) { slots = new Map(); bindings.set(element, slots); }
    slots.set(attribute, value);
    if (attribute === 'textContent') element.textContent = renderValue(value);
    else element.setAttribute(attribute, renderValue(value));
  }
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      if (!bindings.get(el)?.has('textContent')) bind(el, 'textContent', ui(el.dataset.i18n));
    });
    for (const attribute of ['placeholder', 'aria-label', 'title', 'alt']) {
      root.querySelectorAll('[data-i18n-' + attribute + ']').forEach(el =>
        { if (!bindings.get(el)?.has(attribute)) bind(el, attribute, ui(el.getAttribute('data-i18n-' + attribute))); });
    }
  }
  function refresh() {
    document.documentElement.lang = locale;
    for (const [element, slots] of bindings) {
      if (!element.isConnected) { bindings.delete(element); continue; }
      for (const [attribute, value] of slots) {
        if (attribute === 'textContent') element.textContent = renderValue(value);
        else element.setAttribute(attribute, renderValue(value));
      }
    }
    document.querySelectorAll('[data-oraqui-locale]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.oraquiLocale === locale));
    });
    for (const listener of subscribers) listener(locale);
    global.dispatchEvent(new CustomEvent('oraqui:languagechange', {detail:{locale}}));
  }
  function setLocale(next) {
    if (!supported(next)) return false;
    locale = next;
    write(DEVICE, locale);
    if (userId) write(USER + userId, locale);
    refresh();
    return true;
  }
  function setUser(id) {
    userId = id ? String(id) : null;
    const preference = userId && read(USER + userId);
    if (supported(preference)) setLocale(preference);
    else if (userId) write(USER + userId, locale);
  }
  // Codes, not arbitrary server message text. Unknown errors use the caller's safe key.
  const errorKeys = Object.freeze({
    invalid_credentials: 'E-mail ou senha da conta online não conferem. O PIN do aparelho é usado somente em ACESSAR ORAQUI OFFLINE.',
    email_not_confirmed: 'Este e-mail ainda não foi confirmado.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    over_email_send_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    weak_password: 'A senha não atende aos requisitos mínimos de segurança.',
    same_password: 'Escolha uma senha diferente da senha atual.'
  });
  function serverError(error, fallback) { return ui(Object.hasOwn(errorKeys, error?.code) ? errorKeys[error.code] : fallback); }
  function date(value, options = {}) {
    // No timezone is imposed: callers must pass the post's timezone when known.
    return new Intl.DateTimeFormat(locale, options).format(value instanceof Date ? value : new Date(value));
  }
  global.I18n = Object.freeze({t, ui, apply, setLocale, setUser, serverError, date,
    get locale() { return locale; },
    bindText:(element, value) => bind(element, 'textContent', value),
    bindAttribute:(element, attribute, value) => bind(element, attribute, value),
    error(key) { const error = new Error(t(key)); error.i18nKey = key; return error; },
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); }
  });
  global.addEventListener('storage', event => {
    if (event.key === DEVICE && supported(event.newValue)) { locale = event.newValue; refresh(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const selector = document.createElement('nav');
    selector.className = 'oraqui-languages';
    selector.setAttribute('aria-label', 'Idioma / Lingua');
    for (const [value, label, name] of [['pt-BR','PT 🇧🇷','Português (Brasil)'],['it-IT','IT 🇮🇹','Italiano']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.dataset.oraquiLocale = value;
      button.lang = value; button.setAttribute('aria-label', name);
      button.addEventListener('click', () => setLocale(value));
      selector.appendChild(button);
    }
    const host = document.querySelector('[data-i18n-selector]') || document.querySelector('main') || document.body;
    host.prepend(selector);
    refresh();
  });
})(globalThis);
