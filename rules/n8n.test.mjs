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

const cand = (id, title, extra = {}) => ({
  id: String(id), attributes: { firstName: "Léa", lastName: "M", title, town: "Paris", state: 11, phone1: "", socialNetworks: [], ...extra },
  relationships: { mainManager: { data: { id: "15675" } } }
});

test("préparer : filtres de campagne et requête des fiches ajoutées", () => {
  const out = run(src("prepare.js"), { $json: { body: { states: [11], titlePrefixes: ["PO2", "X1", "NONE"], requirePhone: true, extraIds: ["12", "12", "abc", "34"] } } });
  assert.equal(out.length, 2);
  assert.deepEqual(out[0].json.params.titlePrefixes, ["PO2", "NONE"]);
  assert.deepEqual(out[0].json.params.extraIds, ["12", "34"]);
  assert.equal(out[1].json.source, "extra");
  assert.match(out[1].json.url, /keywords=CAND12%20CAND34$/);
  assert.equal(run(src("prepare.js"), { $json: { body: {} } }).length, 1);
  const ev = run(src("prepare.js"), { $json: { body: { evaluations: ["A/B", "A", "Z/Z"] } } })[0].json;
  assert.deepEqual(ev.params.evaluations, ["A/B", "A"]);
  assert.match(ev.url, /evaluations%5B%5D=A%2FB&evaluations%5B%5D=A$/);
});

test("lister : PAD / TR, préfixe ciblé, téléphone requis, fiches ajoutées sans filtre", () => {
  const prepared = run(src("prepare.js"), { $json: { body: { titlePrefixes: ["PO2"], requirePhone: true, extraIds: ["9"] } } });
  const search = { meta: { totals: { rows: 4 } }, data: [
    cand(1, "PO2 - Product Owner", { phone1: "06 00 00 00 00" }),
    cand(2, "PAD1 - Sales"),
    cand(3, "PO3 - Lead PM", { phone1: "06" }),
    cand(4, "PO2 - PO sans tel")
  ] };
  const extra = { data: [cand(9, "TR - ajouté à la main", { phone1: "07" })] };
  const rows = run(src("list.js"), { input: [{ json: search }, { json: extra }], nodes: { "Préparer la recherche": prepared } }).map(r => r.json);
  assert.deepEqual(rows.map(r => r.id), ["9", "1"]);
  assert.equal(rows[0].addedToCampaign, true);
  assert.equal(rows[1].phone, "06 00 00 00 00");
  assert.deepEqual(rows[0].excludedCounts, { profil_pad_tr: 1, hors_cible: 1, sans_telephone: 1 });
});

test("classer : historique lisible, auteur, motifs écartés", () => {
  const prepared = run(src("prepare.js"), { $json: { body: {} } });
  const listed = [{ json: { id: "1", state: 11, title: "PO2", excludedCounts: { profil_pad_tr: 2, hors_cible: 0 } } }];
  const history = { data: [
    { attributes: { typeOf: 40, startDate: "2024-01-10T10:00:00+0100", text: "<p>Entretien <strong>top</strong></p><p>GO&nbsp;!</p>" }, relationships: { mainManager: { data: { id: "6678" } } } },
    { attributes: { typeOf: 131, startDate: "2024-01-02T10:00:00+0100", text: "<div>MSG LK</div>" }, relationships: { mainManager: { data: { id: "15675" } } } }
  ], included: [{ id: "6678", type: "resource", attributes: { firstName: "Hermine", lastName: "MERVEILLEUX DU VIGNAUX" } }] };
  const out = run(rules + src("classify_tail.js"), {
    input: [{ json: history }],
    nodes: { "Préparer la recherche": prepared, "Boond · Rechercher les candidats": [{ json: { meta: { totals: { rows: 1 } } } }], "Lister les candidats à vérifier": listed }
  })[0].json;
  assert.deepEqual(out.excluded, { profil_pad_tr: 2 });
  const c = out.candidates[0];
  assert.equal(c.excludedCounts, undefined);
  assert.equal(c.history[0].author, "Hermine Merveilleux Du Vignaux");
  assert.equal(c.history[0].text, "Entretien top\nGO !");
  assert.equal(c.history[1].byMe, true);
  assert.equal(c.pastProcessByMe, false);
});
