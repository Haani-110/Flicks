import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyConfigChange,
  DEFAULT_CONFIG,
  MARQUEE_STORAGE_KEY,
  readStoredConfig,
  serializeConfig,
  writeStoredConfig,
  type MarqueeConfig,
} from "./config";

export type MarqueeConfigStore = {
  config: MarqueeConfig;
  /** Applies a partial change, normalising anything out of range. */
  update: (change: Partial<MarqueeConfig>) => void;
  /** Back to the shipped defaults, and forgets what was stored. */
  reset: () => void;
  /** True when the current config differs from the defaults. */
  dirty: boolean;
};

/**
 * Config state for the marquee, persisted under `flicks-marquee`.
 *
 * Storage is best-effort: a reader in private mode still gets a working
 * configurator, it just does not survive a reload.
 */
export function useMarqueeConfig(): MarqueeConfigStore {
  const [config, setConfig] = useState<MarqueeConfig>(() => readStoredConfig());

  useEffect(() => {
    writeStoredConfig(config);
  }, [config]);

  const update = useCallback((change: Partial<MarqueeConfig>) => {
    setConfig((current) => applyConfigChange(current, change));
  }, []);

  const reset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG });
  }, []);

  const dirty = useMemo(
    () => serializeConfig(config) !== serializeConfig(DEFAULT_CONFIG),
    [config],
  );

  return { config, update, reset, dirty };
}

export { MARQUEE_STORAGE_KEY };
