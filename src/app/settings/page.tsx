import { getDb } from "@/db/client";
import { PRICES_LAST_CHECKED, PROVIDERS } from "@/lib/providers";
import { getSettings } from "@/lib/settings";
import { ModelsForm } from "./models-form";
import { ProviderKeyCard } from "./provider-key-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Keys are masked inside getSettings; the raw values never reach the browser.
  const settings = await getSettings(await getDb());

  return (
    <>
      <h1>Settings</h1>
      <p className="muted">
        Foothold uses your own API keys. They are stored in a local database file on this machine
        and are only ever sent to the provider they belong to.
      </p>

      {settings.warnings.map((w) => (
        <div key={w} className="notice warn">
          {w}
        </div>
      ))}

      <h2>API keys</h2>
      {settings.providers.map((p) => (
        <ProviderKeyCard
          key={p.id}
          provider={p.id}
          label={p.label}
          keyUrl={PROVIDERS[p.id].keyUrl}
          maskedKey={p.maskedKey}
          updatedAt={p.keyUpdatedAt?.toISOString() ?? null}
        />
      ))}

      <h2>Models</h2>
      <ModelsForm
        providers={Object.values(PROVIDERS)}
        current={{
          mainProvider: settings.main.provider,
          models: Object.fromEntries(settings.providers.map((p) => [p.id, p.model])),
          judge:
            settings.judge.source === "chosen"
              ? `${settings.judge.provider}::${settings.judge.model}`
              : "auto",
        }}
        resolvedJudge={`${PROVIDERS[settings.judge.provider].label} · ${settings.judge.model}`}
      />
      <p className="muted">
        Prices per million tokens ({PRICES_LAST_CHECKED}). Check them against each provider&apos;s
        pricing page.
      </p>
    </>
  );
}
