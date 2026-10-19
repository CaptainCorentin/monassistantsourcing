import test from "node:test";
import assert from "node:assert/strict";
import { assemble, detectDiscipline, detectHook, detectSeniority, defaultMessageKind, DEFAULT_BLOCKS } from "../lib/messages.ts";

const titles = [
  ["Product Owner", "PO2", false, "DIGITAL", false],
  ["Senior Product Manager Data", "PO3", true, "DATA", true],
  ["Lead PO IA générative", "PO3", true, "IA", true],
  ["Product Owner Junior", "PO1", true, "DIGITAL", false],
  ["Ingénieur Qualité logicielle", "QA", true, "QA", true],
  ["QA Engineer", "QA", true, "QA", true],
  ["Product Builder / No-code", "PO2", false, "BUILD", true],
  ["Head of Product", "PO3", true, "DIGITAL", false],
  ["Product Manager Data & IA", "PO2", false, "DATA", true],
  ["Chef de projet SAID", "PO2", false, "DIGITAL", false],
  ["Product Owner Leader", "PO2", false, "DIGITAL", false]
];
for (const [title, sen, senSure, dis, disSure] of titles) {
  test(`titre « ${title} »`, () => {
    assert.deepEqual(detectSeniority(title), { value: sen, sure: senSure });
    assert.deepEqual(detectDiscipline(title), { value: dis, sure: disSure });
  });
}

test("accroche selon l'historique", () => {
  const c = (state, reason, extra = {}) => ({ state, reasons: [reason], ...extra });
  assert.equal(detectHook(c(0, "jamais_contacte")), "A1");
  assert.equal(detectHook(c(0, "contacte_par_autre_ancien")), "A2");
  assert.equal(detectHook(c(5, "nouvelle_campagne")), "A3");
  // LN+ / Vivier +++ : échanges déjà eus, l'auteur du dernier process décide
  assert.equal(detectHook(c(11, "jamais_contacte", { pastProcessDate: "2024-03-01T10:00:00+0100", pastProcessByMe: true })), "A4");
  assert.equal(detectHook(c(13, "nouvelle_campagne", { pastProcessDate: "2024-03-01T10:00:00+0100", pastProcessByMe: false })), "A5");
  assert.equal(detectHook(c(11, "contacte_par_autre_ancien")), "A5");
  // Process tracé hors LN+ / Vivier +++ : même logique
  assert.equal(detectHook(c(0, "jamais_contacte", { pastProcessDate: "2023-01-01T10:00:00+0100", pastProcessByMe: true })), "A4");
});

test("type de message par défaut", () => {
  assert.equal(defaultMessageKind("a_contacter", 131), "premier");
  assert.equal(defaultMessageKind("a_relancer", 15), "R1");
  assert.equal(defaultMessageKind("a_relancer", 16), "R2");
});

const vars = { prenom: "Léa", nom: "Martin", titre: "Product Owner", ville: "Paris", entreprise: "", anciennete: "", annee_process: "" };

test("1er message : repli A1 si entreprise inconnue, blocs dans l'ordre", () => {
  const r = assemble({ kind: "premier", hook: "A1", seniority: "PO2", discipline: "DATA" }, DEFAULT_BLOCKS, vars);
  assert.deepEqual(r.missing, []);
  assert.match(r.text, /^Bonjour Léa,\n\nTon parcours de Product Owner a retenu mon attention\.\n\nChez WeFiiT, on ne fait que du Product Management/);
  assert.match(r.text, /Data as a Product\. Et si demain/);
  assert.match(r.text, /approfondir la discovery/);
  assert.match(r.text, /Passe une excellente journée$/);
});

test("1er message : A1 avec entreprise et ancienneté", () => {
  const r = assemble({ kind: "premier", hook: "A1", seniority: "PO3", discipline: "IA" }, DEFAULT_BLOCKS, { ...vars, entreprise: "Decathlon", anciennete: "3 ans" });
  assert.match(r.text, /3 ans chez Decathlon, c'est peut-être/);
  assert.match(r.text, /futurs leaders/);
});

test("A4 et A5 : accroches sans variable", () => {
  for (const hook of ["A4", "A5"]) {
    const r = assemble({ kind: "premier", hook, seniority: "QA", discipline: "QA" }, DEFAULT_BLOCKS, vars);
    assert.deepEqual(r.missing, []);
  }
  assert.match(assemble({ kind: "premier", hook: "A5", seniority: "PO2", discipline: "DIGITAL" }, DEFAULT_BLOCKS, vars).text, /^Bonjour Léa,\n\nTu avais marqué positivement WeFiiT/);
});

test("relance 2 et invitation : argument de la discipline, invitation sous 300 caractères", () => {
  const r2 = assemble({ kind: "R2", hook: "A1", seniority: "PO2", discipline: "BUILD" }, DEFAULT_BLOCKS, vars);
  assert.match(r2.text, /🎯 des PM qui buildent/);
  for (const d of ["DIGITAL", "DATA", "IA", "BUILD", "QA"]) {
    const inv = assemble({ kind: "invitation", hook: "A1", seniority: "PO2", discipline: d }, DEFAULT_BLOCKS, { ...vars, prenom: "Jean-Christophe" });
    assert.ok([...inv.text].length <= 300, `${d} : ${[...inv.text].length}`);
  }
});

test("un bloc modifié dans Supabase remplace le texte par défaut", () => {
  const blocks = DEFAULT_BLOCKS.map(b => (b.code === "R1" ? { ...b, body: "Coucou {{prenom}}" } : b));
  assert.equal(assemble({ kind: "R1", hook: "A1", seniority: "PO2", discipline: "DIGITAL" }, blocks, vars).text, "Coucou Léa");
});
