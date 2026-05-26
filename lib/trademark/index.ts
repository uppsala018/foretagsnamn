import "server-only";

import { checkPrv, checkTmview } from "./adapters";
import type { TrademarkCheckResult, TrademarkNamecheckResult } from "./types";

export async function checkTrademarks(query: string): Promise<TrademarkCheckResult> {
  const [prv, tmview] = await Promise.all([
    checkPrv(query),
    checkTmview(query),
  ]);
  const sources = [prv, tmview];
  const checked = sources.some((source) => source.status === "checked");
  const error = sources.some((source) => source.status === "error");

  return {
    query,
    status: checked ? "checked" : error ? "error" : "not_configured",
    checkedAt: new Date().toISOString(),
    sources,
  };
}

export async function createTrademarkNamecheckResult(query: string): Promise<TrademarkNamecheckResult> {
  const trademarkCheck = await checkTrademarks(query);
  const matchCount = trademarkCheck.sources.reduce((sum, source) => sum + source.matches.length, 0);

  return {
    category: "trademark_check",
    label: "Varumärkeskoll",
    value: query,
    status: trademarkCheck.status === "checked"
      ? matchCount > 0 ? "taken" : "available"
      : trademarkCheck.status === "error" ? "error" : "not_checked",
    summary: trademarkCheck.status === "checked"
      ? matchCount > 0
        ? `${matchCount} möjlig(a) träff(ar) hittades i externa varumärkeskällor.`
        : "Inga varumärkesträffar hittades i konfigurerade externa källor."
      : "Extern varumärkeskoll är inte konfigurerad.",
    details: "Resultatet är en teknisk sökning, inte juridisk rådgivning eller en officiell bedömning.",
    checkLabel: "Varumärkeskoll",
    source: "external_trademark_check",
    metadata: {
      trademarkCheck,
    },
  };
}
