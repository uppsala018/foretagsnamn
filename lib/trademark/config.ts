import "server-only";

export function getPrvConfig() {
  return {
    searchUrl: process.env.PRV_TRADEMARK_SEARCH_URL?.trim() || "",
    apiKey: process.env.PRV_API_KEY?.trim() || "",
  };
}

export function getTmviewConfig() {
  return {
    searchUrl: process.env.TMVIEW_TRADEMARK_SEARCH_URL?.trim() || "",
    apiKey: process.env.TMVIEW_API_KEY?.trim() || process.env.EUIPO_API_KEY?.trim() || "",
  };
}

export function hasTrademarkSourceConfig(): boolean {
  const prv = getPrvConfig();
  const tmview = getTmviewConfig();
  return Boolean((prv.searchUrl && prv.apiKey) || (tmview.searchUrl && tmview.apiKey));
}
