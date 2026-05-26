import type { NamecheckResult } from "@/lib/namecheck/types";

export type TrademarkSourceId = "prv" | "tmview";

export type TrademarkMatch = {
  name: string;
  owner?: string | null;
  status?: string | null;
  applicationNumber?: string | null;
  url?: string | null;
};

export type TrademarkSourceResult = {
  source: TrademarkSourceId;
  label: string;
  status: "checked" | "not_configured" | "error";
  message: string;
  matches: TrademarkMatch[];
};

export type TrademarkCheckResult = {
  query: string;
  status: "checked" | "not_configured" | "error";
  checkedAt: string;
  sources: TrademarkSourceResult[];
};

export type TrademarkNamecheckResult = NamecheckResult & {
  category: "trademark_check";
};
