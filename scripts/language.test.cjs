const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { Subject } = require('rxjs');

function fixture(savedLanguage) {
  const stored = new Map(savedLanguage ? [['grocery-language', savedLanguage]] : []);
  const alerts = [];
  const timers = [];
  const charts = [];
  const element = () => ({
    style: {}, children: [], addEventListener() {}, remove() {},
    appendChild(child) { this.children.push(child); }
  });
  const document = {
    documentElement: {}, title: '', body: element(),
    createElement: element,
    getElementById: () => ({ getContext: () => ({}) })
  };
  class Chart {
    static register() {}
    constructor(context, config) { this.config = config; charts.push(config); }
    destroy() {}
  }
  const cache = new Map();
  function load(file) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (cache.has(fullPath)) return cache.get(fullPath);
    const compiled = ts.transpileModule(fs.readFileSync(fullPath, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true
      }
    }).outputText;
    const context = {
      exports: {}, document, console: { log() {}, error() {} },
      localStorage: {
        getItem: key => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: key => stored.delete(key)
      },
      alert: message => alerts.push(message),
      confirm: message => { alerts.push(message); return true; },
      setTimeout: callback => timers.push(callback),
      window: { location: {} },
      FileReader: class {
        readAsText(file) { this.onload({ target: { result: file.contents } }); }
      },
      require: name => {
        if (name === '@angular/core') return {
          Component: () => () => {}, Injectable: () => () => {}, ViewChild: () => () => {}
        };
        if (name === 'chart.js') return { Chart, registerables: [] };
        if (name.startsWith('@angular/')) return {};
        if (name.startsWith('.')) return load(path.resolve(path.dirname(fullPath), name + '.ts'));
        return require(name);
      }
    };
    vm.runInNewContext(compiled, context);
    cache.set(fullPath, context.exports);
    return context.exports;
  }
  const { LanguageService, FRENCH_TEXT } = load('src\\app\\services\\language.service.ts');
  const language = new LanguageService();
  const { AppComponent } = load('src\\app\\app.component.ts');
  const app = new AppComponent(
    {}, { events: new Subject(), url: '/', navigate() {} },
    { isSignedIn: () => false }, { detectChanges() {} },
    { onStable: new Subject() }, language
  );
  return { load, language, app, stored, document, alerts, charts, FRENCH_TEXT, LanguageService };
}

test('selection is shared, remembered, and sets document language and title', () => {
  const { language, app, stored, document, LanguageService } = fixture();
  assert.equal(language.currentLanguage, 'en');
  language.toggle();
  assert.equal(app.currentLanguage, 'fr');
  assert.equal(stored.get('grocery-language'), 'fr');
  assert.equal(document.documentElement.lang, 'fr');
  assert.equal(document.title, 'Gestionnaire d’épicerie');
  assert.equal(new LanguageService().currentLanguage, 'fr');
  language.toggle();
  assert.equal(app.currentLanguage, 'en');
  assert.equal(document.title, 'Grocery Manager');
  app.ngOnDestroy();
  assert.equal(fixture('unexpected').language.currentLanguage, 'en');
});

test('all translations preserve placeholders and substitute values safely', () => {
  const { language, FRENCH_TEXT } = fixture();
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [english, french] of Object.entries(FRENCH_TEXT)) {
    assert.deepEqual(placeholders(english), placeholders(french), english);
    assert.ok(french.trim().length > 0, english);
    const params = Object.fromEntries(placeholders(english).map(name => [name, 'test']));
    assert.equal(language.text(english, params), english.replace(/\{\w+\}/g, 'test'));
  }
  language.toggle();
  assert.equal(language.text('Hello {name}', { name: '{customer}' }), 'Bonjour {customer}');
  assert.throws(() => language.text('Hello {name}'), /Missing translation parameter/);
});

test('Canadian currency and report dates follow the selected locale', () => {
  const { language } = fixture();
  for (const locale of ['en-CA', 'fr-CA']) {
    assert.equal(language.locale, locale);
    assert.equal(language.currency(1234.5),
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(1234.5));
    assert.equal(language.date('2026-10-07'),
      new Intl.DateTimeFormat(locale).format(new Date(2026, 9, 7)));
    language.toggle();
  }
});

test('category translation on reload, import normalization, and toggles preserves filters and data', () => {
  const { language, app, stored } = fixture('fr');
  stored.set('customerId', 'test');
  app.categoryData = [{ id: 'dairy', en: 'Dairy', fr: 'Produits laitiers' }];
  app.refreshCategoryLabels();
  const item = {
    customer_id: 'test', Category: 'Dairy', 'Product Name': 'Milk',
    Brand: 'Brand', 'Size / Details': '1L', Quantity: 2, 'Price (CAD)': 3, 'Picked Up': false
  };
  app.processJsonData([item, { ...item, 'Product Name': 'Eggs', 'Picked Up': true }]);
  assert.equal(app.groceryData[0].Category, 'Produits laitiers');
  app.searchTerm = 'Milk';
  app.showOnlyUnpicked = true;
  app.onSearch();
  language.toggle();
  assert.equal(app.groceryData[0].Category, 'Dairy');
  assert.equal(app.filteredData.length, 1);
  assert.equal(app.filteredData[0]['Product Name'], 'Milk');
  language.toggle();
  assert.equal(app.categories[0], 'Produits laitiers');
  assert.equal(app.filteredData.length, 1);
  assert.equal(app.groceryData[0].Brand, 'Brand');
  assert.equal(app.groceryData[0]['Price (CAD)'], 3);
  assert.equal(app.searchTerm, 'Milk');
  assert.equal(app.showOnlyUnpicked, true);
  app.groceryData = [{ ...item, Category: 'Custom category' }];
  app.normalizeCategories();
  assert.equal(app.groceryData[0].Category, 'Custom category');
});

test('login errors, loading messages, chart labels, and notifications switch languages', () => {
  const { load, language, app, alerts, charts } = fixture();
  const { LoginComponent } = load('src\\app\\login.component.ts');
  const login = new LoginComponent({}, {}, language);
  login.loginErrorKey = 'Failed to load authentication data.';
  app.setDriveMessage('Loaded {count} items from Drive', { count: 3 });
  app.grocerySummaries = [{ date: '2026-10-07', store: 'Maxi', estimatedCost: 10, actualCost: 12 }];
  app.showStatisticsModal = true;
  app.createStatisticsChart();
  assert.equal(charts.at(-1).data.datasets[0].label, 'Maxi - Estimated');
  language.toggle();
  assert.equal(login.loginError, 'Impossible de charger les données de connexion.');
  assert.equal(app.driveOperationMessage, '3 articles chargés depuis Drive');
  const chart = charts.at(-1);
  assert.equal(chart.data.datasets[0].label, 'Maxi - Estimé');
  assert.equal(chart.data.datasets[1].label, 'Maxi - Réel');
  assert.equal(chart.options.scales.y.title.text, 'Coût (CAD)');
  assert.equal(chart.options.plugins.tooltip.callbacks.label({
    dataset: { label: 'Maxi - Réel' }, parsed: { y: 12 }
  }), 'Maxi - Réel: ' + language.currency(12));
  app.saveToExcel();
  assert.equal(alerts.at(-1), 'Données enregistrées dans le navigateur !');
  app.deleteRow({});
  assert.equal(alerts.at(-1), 'Voulez-vous vraiment supprimer cet article ?');
});

test('JSON upload and Drive load normalize categories into the selected language', async () => {
  const { language, app, alerts } = fixture('fr');
  app.categoryData = [{ id: 'dairy', en: 'Dairy', fr: 'Produits laitiers' }];
  const data = [{
    Category: 'Dairy', 'Product Name': 'Milk', Quantity: 1,
    'Price (CAD)': 3, 'Picked Up': false, 'Size / Details': '1L'
  }];
  const event = { target: {
    files: [{ name: 'backup.json', contents: JSON.stringify(data) }],
    value: 'backup.json'
  } };
  app.onUploadGroceryData(event);
  assert.equal(app.displayedData[0].Category, 'Produits laitiers');
  assert.equal(alerts.at(-1), '1 articles importés depuis backup.json');
  assert.equal(event.target.value, '');
  app.isGoogleSignedIn = true;
  app.driveService = {
    openFilePicker: async () => [{ id: 'test' }],
    downloadJsonFile: async () => data
  };
  await app.loadGroceryDataFromDrive();
  assert.equal(app.displayedData[0].Category, 'Produits laitiers');
  assert.equal(app.driveOperationMessage, '1 articles chargés depuis Drive');
  language.toggle();
  assert.equal(app.driveOperationMessage, 'Loaded 1 items from Drive');
});

test('fallback help and about overlays follow language changes', () => {
  const { language, app } = fixture();
  app.createTemporaryHelpOverlay();
  app.createTemporaryAboutOverlay();
  assert.ok(app.tempHelpOverlay.children[0].children[1].innerHTML.includes('Menu Options'));
  language.toggle();
  const help = app.tempHelpOverlay.children[0];
  assert.equal(help.children[0].children[0].textContent, 'Guide d’aide de Grocery Manager');
  assert.ok(help.children[1].innerHTML.includes('Options du menu'));
  assert.ok(!help.children[1].innerHTML.includes('Menu Options'));
  const about = app.tempAboutOverlay.children[0];
  assert.equal(about.children[0].children[0].textContent, 'À propos');
  assert.ok(about.children[1].children[0].textContent.includes('développé'));
});

test('main and login templates have no untranslated interface text outside language-specific help', () => {
  const { FRENCH_TEXT } = fixture();
  for (const file of ['app.component.html', 'login.component.html']) {
    let html = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', file), 'utf8');
    html = html.replace(/<!-- Help Modal -->[\s\S]*?<!-- About Solution Modal -->/, '');
    html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\{\{[\s\S]*?\}\}/g, '');
    const literalText = [...html.matchAll(/>([^<>]+)</g)]
      .map(match => match[1].trim()).filter(text => /[a-zA-Z]/.test(text));
    assert.deepEqual(literalText, [], file);
    assert.ok(!/\s(?:placeholder|title|aria-label)="[^"]*[A-Za-z]/.test(html), file);
    const keys = [...html.matchAll(/(?:t|buttonLabel)\('([^']+)'/g)].map(match => match[1]);
    for (const key of keys) assert.ok(key in FRENCH_TEXT, key);
  }
});
