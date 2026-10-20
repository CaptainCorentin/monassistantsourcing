"use client";

import { useEffect, useState } from "react";
import type { Campaign } from "@/lib/campaigns";
import { DEFAULT_BLOCKS, type Block } from "@/lib/messages";
import CampaignsScreen from "./campaigns";
import Session, { type FlagKind } from "./session";
import BlocksEditor from "./bank";
import { DAY, api } from "./shared";

type Flag = { kind: FlagKind; until?: number };

// Deux écrans : les campagnes (ciblage + message), puis la session candidat par candidat.
export default function Sourcing() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsError, setCampaignsError] = useState("");
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_BLOCKS);
  const [blocksError, setBlocksError] = useState("");
  const [flags, setFlags] = useState<Map<string, Flag>>(new Map());
  const [running, setRunning] = useState<Campaign | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api<Campaign[]>("/api/campaigns")
      .then(setCampaigns)
      .catch((e: Error) => setCampaignsError(e.message));
    api<Block[]>("/api/blocks")
      .then(rows => rows.length ? setBlocks(rows) : setBlocksError("Banque vide dans Supabase : textes par défaut affichés."))
      .catch((e: Error) => setBlocksError(`${e.message} Textes par défaut affichés, non modifiables.`));
    api<{ boondId: string; kind: FlagKind; until: string | null }[]>("/api/flags")
      .then(rows => setFlags(new Map(rows.map(r => [r.boondId, { kind: r.kind, until: r.until ? Date.parse(r.until) : undefined }]))))
      .catch(() => notify("Impossible de charger les candidats reportés ou sortis."));
  }, []);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(t => (t === msg ? "" : t)), 2600);
  }

  const isFlagged = (id: string) => {
    const f = flags.get(id);
    return !!f && (f.kind === "masque" || (f.until ?? 0) > Date.now());
  };

  async function recordFlag(id: string, kind: FlagKind, days?: number) {
    setFlags(prev => new Map(prev).set(id, { kind, until: days ? Date.now() + days * DAY : undefined }));
    try {
      await api("/api/flags", "POST", { boondId: id, kind, days });
    } catch (e) {
      notify((e as Error).message);
      throw e;
    }
  }

  async function logout() {
    await api("/api/logout", "POST", {}).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Vivier Boond</h1>
          {!running && <p className="muted" style={{ margin: "4px 0 0" }}>Choisis une campagne : ciblage Boond, message unique, puis un candidat à la fois.</p>}
        </div>
        <div className="header-actions">
          <button className="btn small" type="button" onClick={logout}>Se déconnecter</button>
        </div>
      </header>

      {running ? (
        <Session campaign={running} campaigns={campaigns} blocks={blocks} isFlagged={isFlagged}
          recordFlag={recordFlag} onExit={() => setRunning(null)} notify={notify} />
      ) : (
        <>
          <CampaignsScreen campaigns={campaigns} setCampaigns={setCampaigns} blocks={blocks}
            onLaunch={setRunning} notify={notify} error={campaignsError} />
          <BlocksEditor blocks={blocks} setBlocks={setBlocks} notify={notify} error={blocksError} />
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
