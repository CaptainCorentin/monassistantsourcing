// Exécute les nœuds Code du workflow N8N (n8n/src) hors de N8N, avec des réponses Boond simulées.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = f => readFileSync(new URL(`../n8n/src/${f}`, import.meta.url), "utf8");
const rules = readFileSync(new URL("./contactability.js", import.meta.url), "utf8");
// Un nœud Code = le corps d'une fonction qui reçoit $, $json et $input.
const run = (code, { $json = {}, input = [], nodes = {} }) =>
  new Function("$", "$json", "$input", "module", code)(
    name => ({ first: () => nodes[name][0], all: () => nodes[name] }),
    $json, { all: () => input }, undefined);

// Préparer la recherche, puis Préparer la lecture des fiches à partir de mes actions simulées.
const myAction = (candId, daysAgo, typeOf = 131) => ({ attributes: { typeOf, startDate: new Date(Date.now() - daysAgo * 864e5).toISOString() },
  relationships: { dependsOn: { data: { id: String(candId), type: "candidate" } }, mainManager: { data: { id: "15675" } } } });
const prepareAll = (body, actions = []) => {
  const prepared = run(src("prepare.js"), { $json: { body } });
  const pages = prepared.map((_, i) => ({ json: { data: i === 0 ? actions : [] } }));
  const fiches = run(src("fiches.js"), { input: pages, nodes: { "Préparer la recherche": prepared } });
  return { prepared, fiches, nodes: { "Préparer la recherche": prepared, "Préparer la lecture des fiches": fiches } };
};

const cand = (id, title, extra = {}) => ({
  id: String(id), attributes: { firstName: "Léa", lastName: "M", title, town: "Paris", state: 11, phone1: "", socialNetworks: [], ...extra },
  relationships: { mainManager: { data: { id: "15675" } } }
});

test("préparer : mes actions de contact, puis recherche paginée et fiches ajoutées", () => {
  const prepared = run(src("prepare.js"), { $json: { body: { states: [11], titlePrefixes: ["PO2", "X1", "NONE"], requirePhone: true, extraIds: ["12", "12", "abc", "34"] } } });
  assert.equal(prepared.length, 10);
  assert.match(decodeURIComponent(prepared[0].json.url), /api\/actions\?maxResults=100&page=1&perimeterManagers\[\]=15675&actionTypes\[\]=131&actionTypes\[\]=15&actionTypes\[\]=16$/);
  assert.deepEqual(prepared[0].json.params.titlePrefixes, ["PO2", "NONE"]);
  assert.deepEqual(prepared[0].json.params.extraIds, ["12", "34"]);
  const { fiches } = prepareAll({ states: [11], extraIds: ["12", "34"] });
  assert.equal(fiches.length, 5);
  assert.match(fiches[0].json.url, /maxResults=500&page=1&sort=updateDate/);
  assert.match(fiches[3].json.url, /page=4/);
  assert.equal(fiches[4].json.source, "extra");
  assert.match(fiches[4].json.url, /keywords=CAND12%20CAND34$/);
  const ev = prepareAll({ evaluations: ["A/B", "A", "Z/Z"] }).fiches[0].json;
  assert.deepEqual(ev.params.evaluations, ["A/B", "A"]);
  assert.match(ev.url, /evaluations%5B%5D=A%2FB&evaluations%5B%5D=A$/);
});

test("mes relances : les fiches viennent de mes contacts des 6 derniers mois", () => {
  const { fiches } = prepareAll({ states: [0, 11], segments: ["mes_relances"] }, [myAction(5, 10), myAction(5, 40), myAction(6, 100, 15), myAction(7, 200)]);
  assert.equal(fiches.length, 1);
  assert.match(decodeURIComponent(fiches[0].json.url), /keywords=CAND5 CAND6&candidateStates\[\]=0&candidateStates\[\]=11$/);
  assert.equal(fiches[0].json.params.relances, true);
  const none = prepareAll({ segments: ["mes_relances"] }).fiches;
  assert.deepEqual(none.map(f => f.json.source), ["none"]);
  const { nodes } = prepareAll({ segments: ["mes_relances"] });
  const empty = run(src("list.js"), { input: [{ json: { data: [cand(1, "PO2 - x")] } }], nodes })[0].json;
  assert.equal(empty.empty, true, "la requête vide ne ramène rien");
});

test("lister : fiches traitées et mes contacts récents écartés avant l'historique", () => {
  const body = { target: "a_contacter", excludeIds: ["2"] };
  const { nodes } = prepareAll(body, [myAction(3, 20), myAction(4, 120)]);
  const search = { meta: { totals: { rows: 4 } }, data: [cand(1, "PO2 - a"), cand(2, "PO2 - b"), cand(3, "PO2 - c"), cand(4, "PO2 - d")] };
  const rows = run(src("list.js"), { input: [{ json: search }, { json: { data: [] } }, { json: { data: [] } }, { json: { data: [] } }], nodes }).map(r => r.json);
  assert.deepEqual(rows.map(r => r.id), ["1", "4"]);
  assert.equal(rows[0].excludedCounts.deja_traite, 1);
  assert.equal(rows[0].excludedCounts.mon_contact_recent, 1);
  assert.equal(rows[0].meta.searchTotal, 4);
  // Campagne qui vise aussi les relances : mes contacts récents restent.
  const tous = prepareAll({ target: "tous" }, [myAction(3, 20)]).nodes;
  assert.deepEqual(run(src("list.js"), { input: [{ json: search }], nodes: tous }).map(r => r.json.id), ["1", "2", "3", "4"]);
});

test("lister : PAD / TR, préfixe ciblé, téléphone requis, fiches ajoutées sans filtre", () => {
  const { nodes } = prepareAll({ titlePrefixes: ["PO2"], requirePhone: true, extraIds: ["9"] });
  const search = { meta: { totals: { rows: 4 } }, data: [
    cand(1, "PO2 - Product Owner", { phone1: "06 00 00 00 00" }),
    cand(2, "PAD1 - Sales"),
    cand(3, "PO3 - Lead PM", { phone1: "06" }),
    cand(4, "PO2 - PO sans tel")
  ] };
  const extra = { data: [cand(9, "TR - ajouté à la main", { phone1: "07 11 22 33 44" })] };
  const empty = { json: { data: [] } };
  const rows = run(src("list.js"), { input: [{ json: search }, empty, empty, empty, { json: extra }], nodes }).map(r => r.json);
  assert.deepEqual(rows.map(r => r.id), ["9", "1"]);
  assert.equal(rows[0].addedToCampaign, true);
  assert.equal(rows[1].phone, "06 00 00 00 00");
  assert.deepEqual(rows[0].excludedCounts, { profil_pad_tr: 1, hors_cible: 1, sans_telephone: 1, hors_entreprise: 0, deja_traite: 0, mon_contact_recent: 0 });
});

test("classer : historique lisible, auteur, motifs écartés", () => {
  const prepared = run(src("prepare.js"), { $json: { body: {} } });
  const listed = [{ json: { id: "1", state: 11, title: "PO2", excludedCounts: { profil_pad_tr: 2, hors_cible: 0 }, meta: { searchTotal: 1, read: 3 } } }];
  const history = { data: [
    { attributes: { typeOf: 40, startDate: "2024-01-10T10:00:00+0100", text: "<p>Entretien <strong>top</strong></p><p>GO&nbsp;!</p>" }, relationships: { mainManager: { data: { id: "6678" } } } },
    { attributes: { typeOf: 131, startDate: "2024-01-02T10:00:00+0100", text: "<div>MSG LK</div>" }, relationships: { mainManager: { data: { id: "15675" } } } }
  ], included: [{ id: "6678", type: "resource", attributes: { firstName: "Hermine", lastName: "MERVEILLEUX DU VIGNAUX" } }] };
  const out = run(rules + src("classify_tail.js"), {
    input: [{ json: history }],
    nodes: { "Préparer la recherche": prepared, "Boond · Rechercher les candidats": [{ json: { meta: { totals: { rows: 1 } } } }], "Lister les candidats à vérifier": listed }
  })[0].json;
  assert.deepEqual(out.excluded, { profil_pad_tr: 2 });
  const final = run(src("respond.js"), { input: [{ json: out }], nodes: { "Lister les candidats à vérifier": listed } })[0].json;
  assert.equal(final.searchTotal, 1);
  assert.equal(final.read, 3);
  assert.equal(final.params.excludeIds, undefined);
  assert.equal(final.candidates[0].meta, undefined);
  const c = out.candidates[0];
  assert.equal(c.excludedCounts, undefined);
  assert.equal(c.history[0].author, "Hermine Merveilleux Du Vignaux");
  assert.equal(c.history[0].text, "Entretien top\nGO !");
  assert.equal(c.history[1].byMe, true);
  assert.equal(c.pastProcessByMe, false);
});

test("action : validation de la demande", () => {
  const ok = run(src("action_validate.js"), { $json: { body: { candidateId: "18571", typeOf: 15, text: "  Hello\u0007 Léa\n  " } } })[0].json;
  assert.deepEqual(ok, { valid: true, candidateId: "18571", typeOf: 15, text: "Hello  Léa", dryRun: false });
  assert.equal(run(src("action_validate.js"), { $json: { body: { candidateId: "18571", typeOf: 40, text: "x" } } })[0].json.valid, false);
  assert.equal(run(src("action_validate.js"), { $json: { body: { candidateId: "1; drop", typeOf: 131, text: "x" } } })[0].json.valid, false);
  assert.equal(run(src("action_validate.js"), { $json: { body: { candidateId: "1", typeOf: 131, text: "   " } } })[0].json.valid, false);
});

test("action : format de l'extension, anti-doublon 24 h, mode test", () => {
  const req = { valid: true, candidateId: "18571", typeOf: 131, text: "Bonjour Léa", dryRun: false };
  const nodes = { "Valider la demande": [{ json: req }] };
  const old = { data: [{ attributes: { typeOf: 131, startDate: "2025-01-01T10:00:00+0100" }, relationships: { mainManager: { data: { id: "15675" } } } }] };
  const out = run(src("action_prepare.js"), { $json: old, nodes })[0].json;
  assert.equal(out.create, true);
  assert.equal(out.body.data.attributes.typeOf, 131);
  assert.match(out.body.data.attributes.startDate, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+0000$/);
  assert.deepEqual(out.body.data.relationships.dependsOn.data, { id: "18571", type: "candidate" });
  assert.deepEqual(out.body.data.relationships.mainManager.data, { id: "15675", type: "resource" });
  const fresh = { data: [{ attributes: { typeOf: 131, startDate: new Date(Date.now() - 3600e3).toISOString() }, relationships: { mainManager: { data: { id: "15675" } } } }] };
  const dup = run(src("action_prepare.js"), { $json: fresh, nodes })[0].json;
  assert.equal(dup.create, false);
  assert.equal(dup.duplicate, true);
  const colleague = { data: [{ attributes: { typeOf: 131, startDate: new Date().toISOString() }, relationships: { mainManager: { data: { id: "6678" } } } }] };
  assert.equal(run(src("action_prepare.js"), { $json: colleague, nodes })[0].json.create, true);
  const dry = run(src("action_prepare.js"), { $json: old, nodes: { "Valider la demande": [{ json: { ...req, dryRun: true } }] } })[0].json;
  assert.equal(dry.create, false);
  assert.equal(dry.dryRun, true);
  assert.equal(run(src("action_prepare.js"), { $json: { error: { message: "x" } }, nodes })[0].json.create, false);
});

test("entreprises : mots-clés Boond en OU, nom confirmé dans la fiche", () => {
  const { fiches, nodes } = prepareAll({ keywords: "ignoré", companies: ["Wavestone", "BAcceptance", "TestIT", "Monsieur Guiz", "<script>"] });
  const prepared = fiches;
  const q = decodeURIComponent(fiches[0].json.url);
  assert.match(q, /keywords=wavestone bacceptance b-acceptance testit test-it monsieurguiz monsieur-guiz(&|$)/);
  assert.deepEqual(prepared[0].json.params.companies, ["Wavestone", "BAcceptance", "TestIT", "Monsieur Guiz"]);
  const search = { data: [
    cand(1, "PO2 - Product Owner @Wavestone"),
    cand(2, "QA1 - Testeur", { references: [{ company: "B Acceptance", title: "QA", description: "" }] }),
    cand(3, "QA2 - Test Lead", { skills: "latest items, tests d'acceptance" }),
    cand(4, "QA1 - QA", { references: [{ company: "Test IT", title: "", description: "" }] }),
    cand(5, "PO1 - PO", { skills: "Ex consultant chez Monsieur Guiz" })
  ] };
  const rows = run(src("list.js"), { input: [{ json: search }], nodes }).map(r => r.json);
  assert.deepEqual(rows.map(r => [r.id, r.company, r.companyInTitle]), [["1", "Wavestone", true], ["2", "BAcceptance", false], ["4", "TestIT", false], ["5", "Monsieur Guiz", false]]);
  assert.equal(rows[0].excludedCounts.hors_entreprise, 1);
});

test("cold call : seuls les numéros composables (8 chiffres et plus) comptent", () => {
  const { nodes } = prepareAll({ requirePhone: true });
  const search = { data: [
    cand(1, "PO2 - A", { phone1: "nc" }),
    cand(2, "PO2 - B", { phone1: "-", phone2: "+41 79 123 45 67" }),
    cand(3, "PO2 - C", { phone1: "06 12" })
  ] };
  const rows = run(src("list.js"), { input: [{ json: search }], nodes }).map(r => r.json);
  assert.deepEqual(rows.map(r => [r.id, r.phone]), [["2", "+41 79 123 45 67"]]);
  assert.equal(rows[0].excludedCounts.sans_telephone, 2);
});
