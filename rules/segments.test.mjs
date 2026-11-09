import test from "node:test";
import assert from "node:assert/strict";
import { inSegments, matchesSegment, relanceStep } from "../lib/segments.ts";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const ago = d => new Date(NOW - d * 86400000).toISOString();
const c = x => ({ category: "a_contacter", reasons: ["contacte_par_autre_ancien"], lastContact: null, pastProcessDate: null, ...x });

test("prise d'actu : collègue 3 à 12 mois, process de plus d'un an", () => {
  assert.equal(matchesSegment(c({ lastContact: { date: ago(120), byMe: false }, pastProcessDate: ago(500) }), "prise_actu", NOW), true);
  assert.equal(matchesSegment(c({ lastContact: { date: ago(60), byMe: false }, pastProcessDate: ago(500) }), "prise_actu", NOW), false, "contact trop récent");
  assert.equal(matchesSegment(c({ lastContact: { date: ago(400), byMe: false }, pastProcessDate: ago(500) }), "prise_actu", NOW), false, "contact trop ancien");
  assert.equal(matchesSegment(c({ lastContact: { date: ago(120), byMe: true }, pastProcessDate: ago(500) }), "prise_actu", NOW), false, "c'est moi");
  assert.equal(matchesSegment(c({ lastContact: { date: ago(120), byMe: false }, pastProcessDate: ago(200) }), "prise_actu", NOW), false, "process < 1 an");
  assert.equal(matchesSegment(c({ lastContact: { date: ago(120), byMe: false } }), "prise_actu", NOW), false, "pas de process");
});

test("jamais de process : contacté il y a plus de 3 mois, vivier accepté", () => {
  assert.equal(matchesSegment(c({ category: "vivier", reasons: ["relance_expiree"], lastContact: { date: ago(100), byMe: true } }), "sans_process_3_mois", NOW), true);
  assert.equal(matchesSegment(c({ lastContact: { date: ago(200), byMe: false } }), "sans_process_3_mois", NOW), true);
  assert.equal(matchesSegment(c({ lastContact: { date: ago(60), byMe: true } }), "sans_process_3_mois", NOW), false, "trop récent");
  assert.equal(matchesSegment(c({ lastContact: { date: ago(200), byMe: true }, pastProcessDate: ago(800) }), "sans_process_3_mois", NOW), false, "a eu un process");
  assert.equal(matchesSegment(c({ reasons: ["jamais_contacte"] }), "sans_process_3_mois", NOW), false, "jamais contacté");
});

test("segments historiques : par motif, vivier exclu", () => {
  assert.equal(matchesSegment(c({}), "contacte_par_autre_ancien", NOW), true);
  assert.equal(matchesSegment(c({ category: "vivier" }), "contacte_par_autre_ancien", NOW), false);
  assert.equal(inSegments(c({}), [], NOW), true);
  assert.equal(inSegments(c({ category: "vivier" }), [], NOW), true);
});

test("mes relances : mon 1er, 2e ou 3e contact il y a 7 j à 6 mois", () => {
  const mine = (typeOf, d, x = {}) => c({ category: "vivier", reasons: ["relance_expiree"], lastContact: { date: ago(d), byMe: true, typeOf }, ...x });
  assert.deepEqual(relanceStep(mine(131, 10, { category: "a_relancer", reasons: ["relance_due"] }), NOW), { kind: "R1", typeOf: 15 });
  assert.deepEqual(relanceStep(mine(15, 60), NOW), { kind: "R2", typeOf: 16 });
  assert.deepEqual(relanceStep(mine(16, 40, { reasons: ["sequence_terminee"], history: [{ typeOf: 16, byMe: true }, { typeOf: 15, byMe: true }] }), NOW), { kind: "R3", typeOf: 16 });
  assert.equal(relanceStep(mine(16, 40, { history: [{ typeOf: 16, byMe: true }, { typeOf: 16, byMe: true }] }), NOW), null, "R3 déjà envoyée");
  assert.equal(relanceStep(mine(131, 3), NOW), null, "moins de 7 j");
  assert.equal(relanceStep(mine(131, 200), NOW), null, "plus de 6 mois : nouvelle campagne");
  assert.equal(relanceStep(c({ lastContact: { date: ago(20), byMe: false, typeOf: 131 } }), NOW), null, "contact d'un collègue");
  assert.equal(relanceStep(mine(131, 20, { category: "bloque" }), NOW), null, "non contactable");
  assert.equal(matchesSegment(mine(15, 60), "mes_relances", NOW), true);
});
