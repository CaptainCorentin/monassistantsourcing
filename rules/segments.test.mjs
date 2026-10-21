import test from "node:test";
import assert from "node:assert/strict";
import { inSegments, matchesSegment } from "../lib/segments.ts";

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
