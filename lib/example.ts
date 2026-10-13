import type { Candidate, Category, LastContact, SearchResult, Template } from "./types";

// Données d'exemple (jalon 2) : noms et profils fictifs.
const DAY = 86400000;

export function exampleResult(limit: number): SearchResult {
  const now = Date.now();
  const ago = (d: number) => new Date(now - d * DAY).toISOString();
  const rows: [string, string, string, string, number, Category, string, number | null, LastContact | null][] = [
    ["Léonie", "Vasseur", "Product Owner Data", "Lyon", 0, "a_contacter", "jamais_contacte", 131, null],
    ["Malik", "Brandt", "Product Manager B2B SaaS", "Paris", 0, "a_contacter", "jamais_contacte", 131, null],
    ["Inès", "Carvalho", "QA Lead", "Nantes", 11, "a_contacter", "contacte_par_autre_ancien", 131, { typeOf: 131, date: ago(140), byMe: false }],
    ["Romain", "Ternier", "Product Owner", "Paris", 13, "a_contacter", "jamais_contacte", 131, null],
    ["Sacha", "Morel", "", "Bordeaux", 0, "a_contacter", "jamais_contacte", 131, null],
    ["Yasmine", "Okafor", "Head of Product", "Paris", 5, "a_contacter", "nouvelle_campagne", 131, { typeOf: 16, date: ago(210), byMe: true }],
    ["Thibault", "Lenoir", "Product Owner Mobile", "Lille", 0, "a_contacter", "jamais_contacte", 131, null],
    ["Camille", "Arnaud", "Test Engineer", "Toulouse", 0, "a_contacter", "jamais_contacte", 131, null],
    ["Hugo", "Delmas", "Product Owner", "Paris", 0, "a_relancer", "relance_due", 15, { typeOf: 131, date: ago(12), byMe: true }],
    ["Nora", "Belkacem", "Product Manager", "Lyon", 11, "a_relancer", "relance_due", 16, { typeOf: 15, date: ago(9), byMe: true }],
    ["Jules", "Fabre", "Data Product Owner", "Paris", 0, "a_relancer", "relance_due", 15, { typeOf: 131, date: ago(24), byMe: true }],
    ["Clara", "Nguyen", "QA Analyst", "Rennes", 13, "vivier", "sequence_terminee", null, { typeOf: 16, date: ago(45), byMe: true }],
    ["Élise", "Mercier", "Product Owner", "Paris", 0, "vivier", "relance_expiree", null, { typeOf: 131, date: ago(64), byMe: true }],
    ["Bastien", "Roy", "Product Ops", "Marseille", 5, "vivier", "relance_expiree", null, { typeOf: 15, date: ago(97), byMe: true }]
  ];
  const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const candidates: Candidate[] = rows.map((r, i) => ({
    id: String(90001 + i),
    firstName: r[0], lastName: r[1], title: r[2], town: r[3], state: r[4],
    linkedinUrl: `https://www.linkedin.com/in/exemple-${slug(r[0])}-${slug(r[1])}`,
    category: r[5], reasons: [r[6]], nextContactTypeOf: r[7], lastContact: r[8],
    eligibleFrom: r[5] === "vivier" ? new Date(now + 120 * DAY).toISOString() : null
  }));
  const excluded = { contacte_par_autre_60j: 21, process_180j: 17, pas_interesse_90j: 12, fin_process_365j: 9, contacte_recemment: 6, rappel_programme: 4 };
  const excludedTotal = Object.values(excluded).reduce((a, b) => a + b, 0);
  return { example: true, searchTotal: 214, checked: Math.min(limit, candidates.length + excludedTotal), candidates, excluded };
}

// Messages d'exemple, remplacés par ceux de Supabase au jalon 3.
export const exampleTemplates: Template[] = [
  {
    id: "ex-invitation",
    name: "1er contact, note d'invitation",
    category: "a_contacter",
    channel: "invitation",
    body: "Hello {{prenom}}, ton parcours de {{titre}} m'a tapé dans l'œil. Je recrute des consultants Product chez WeFiiT, un des cabinets de référence du Product Management en France. Partant(e) pour un échange de 15 min ?"
  },
  {
    id: "ex-relance",
    name: "Relance courte",
    category: "a_relancer",
    channel: "message",
    body: "Hello {{prenom}}, je me permets de revenir vers toi suite à mon message. Est-ce que tu aurais 15 minutes cette semaine pour qu'on échange sur tes envies de {{titre}} ?"
  }
];
