"""Assemble le workflow N8N "VIVIER BOOND - Webapp sourcing" à partir des fichiers de n8n/src
et de rules/contactability.js. Sortie : code SDK N8N (n8n/vivier-webapp.sdk.js)."""
import json, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "n8n" / "src"
key_hash = sys.argv[1]

rules = (root / "rules" / "contactability.js").read_text()
classify = rules + (src / "classify_tail.js").read_text()
prepare = (src / "prepare.js").read_text()
listing = (src / "list.js").read_text()

boond = "{ httpBasicAuth: { id: '79iDzvM4hlzHzZqS', name: 'BOOND AUTH CORENTIN' } }"
cond_opts = "{ caseSensitive: true, leftValue: '', typeValidation: 'strict' }"

code = f"""import {{ workflow, node, trigger, ifElse, sticky, expr }} from '@n8n/workflow-sdk';

// 1. Entrée : la webapp appelle ce webhook avec sa clé dans l'en-tête X-Vivier-Key.
const webhook = trigger({{
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: {{ name: 'Webapp · Demande de recherche', parameters: {{
    httpMethod: 'POST', path: 'vivier-boond-search', responseMode: 'responseNode', options: {{}}
  }} }}
}});

const hashKey = node({{
  type: 'n8n-nodes-base.crypto', version: 2,
  config: {{ name: 'Calculer l\\'empreinte de la clé', parameters: {{
    action: 'hash', type: 'SHA256', encoding: 'hex', dataPropertyName: 'keyHash',
    value: expr("{{{{ $json.headers['x-vivier-key'] || '' }}}}")
  }} }}
}});

const keyOk = ifElse({{
  version: 2.2,
  config: {{ name: 'Clé valide ?', parameters: {{ conditions: {{
    options: {cond_opts},
    conditions: [{{ leftValue: expr('{{{{ $json.keyHash }}}}'), operator: {{ type: 'string', operation: 'equals' }}, rightValue: '{key_hash}' }}],
    combinator: 'and'
  }} }} }}
}});

const deny = node({{
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: {{ name: 'Refuser (401)', parameters: {{
    respondWith: 'json', responseBody: '{{ "error": "Accès refusé." }}', options: {{ responseCode: 401 }}
  }} }}
}});

// 2. Recherche Boond : une seule requête, filtrée sur le périmètre et les états.
const prepare = node({{
  type: 'n8n-nodes-base.code', version: 2,
  config: {{ name: 'Préparer la recherche', parameters: {{ mode: 'runOnceForAllItems', jsCode: {json.dumps(prepare)} }} }}
}});

const search = node({{
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {{ name: 'Boond · Rechercher les candidats', parameters: {{
    method: 'GET', url: expr('{{{{ $json.url }}}}'),
    authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth', options: {{}}
  }}, credentials: {boond} }}
}});

const list = node({{
  type: 'n8n-nodes-base.code', version: 2,
  config: {{ name: 'Lister les candidats à vérifier', parameters: {{ mode: 'runOnceForAllItems', jsCode: {json.dumps(listing)} }} }}
}});

const hasCandidates = ifElse({{
  version: 2.2,
  config: {{ name: 'Des candidats à vérifier ?', parameters: {{ conditions: {{
    options: {cond_opts},
    conditions: [{{ leftValue: expr('{{{{ $json.empty !== true }}}}'), operator: {{ type: 'boolean', operation: 'true', singleValue: true }} }}],
    combinator: 'and'
  }} }} }}
}});

const respondEmpty = node({{
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: {{ name: 'Répondre (aucun candidat)', parameters: {{
    respondWith: 'json',
    responseBody: expr('{{{{ JSON.stringify({{ example: false, searchTotal: $json.searchTotal, checked: 0, contactables: 0, byCategory: {{ a_contacter: 0, a_relancer: 0, vivier: 0 }}, excluded: {{}}, params: $(\\'Préparer la recherche\\').first().json.params, candidates: [], boondError: $json.boondError }}) }}}}'),
    options: {{}}
  }} }}
}});

// 3. Vérification : un appel par candidat pour lire son historique d'actions (lecture seule).
const history = node({{
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {{ name: 'Boond · Historique des actions', onError: 'continueRegularOutput', parameters: {{
    method: 'GET', url: expr('https://ui.boondmanager.com/api/candidates/{{{{ $json.id }}}}/actions?maxResults=500'),
    authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth',
    options: {{ batching: {{ batch: {{ batchSize: 5, batchInterval: 150 }} }} }}
  }}, credentials: {boond} }}
}});

// 4. Classement avec les règles de rules/contactability.js, puis réponse à la webapp.
const classify = node({{
  type: 'n8n-nodes-base.code', version: 2,
  config: {{ name: 'Classer selon les règles de contactabilité', parameters: {{ mode: 'runOnceForAllItems', jsCode: {json.dumps(classify)} }} }}
}});

const respond = node({{
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: {{ name: 'Répondre à la webapp', parameters: {{ respondWith: 'firstIncomingItem', options: {{}} }} }}
}});

const noteEntry = sticky('## 1. Entrée sécurisée\\nLa webapp (Vercel) envoie sa clé dans l\\'en-tête `X-Vivier-Key`. Seule l\\'empreinte SHA-256 de la clé est stockée ici. Mauvaise clé : réponse 401, rien n\\'est lu dans Boond.', [webhook, hashKey, keyOk, deny], {{ color: 7 }});
const noteSearch = sticky('## 2. Recherche Boond (1 appel)\\nPérimètre : responsable principal = Corentin (15675) par défaut. États par défaut : LN+ (11) et Vivier +++ (13). 300 candidats maximum.', [prepare, search, list, hasCandidates, respondEmpty], {{ color: 4 }});
const noteCheck = sticky('## 3. Vérification et classement\\nUn appel Boond par candidat (historique d\\'actions, par lots de 5). Les règles sont la copie de `rules/contactability.js` (repo monassistantsourcing) : ne pas les modifier ici, modifier le fichier puis régénérer le workflow. **Aucune écriture dans Boond.**', [history, classify, respond], {{ color: 5 }});

export default workflow('vivier-boond-webapp', 'VIVIER BOOND - Webapp sourcing')
  .add(webhook).to(hashKey).to(keyOk
    .onTrue(prepare.to(search).to(list).to(hasCandidates
      .onTrue(history.to(classify).to(respond))
      .onFalse(respondEmpty)))
    .onFalse(deny))
  .add(noteEntry).add(noteSearch).add(noteCheck);
"""
(root / "n8n" / "vivier-webapp.sdk.js").write_text(code)
print(len(code))
