import "server-only";

export function getPrvConfig() {
  return {
    searchUrl: process.env.PRV_TRADEMARK_SEARCH_URL?.trim() || "",
    apiKey: process.env.PRV_API_KEY?.trim() || "",
  };
}

export function getTmviewConfig() {
  return {
    searchUrl:
      process.env.TMVIEW_TRADEMARK_SEARCH_URL?.trim()
      || "https://api.euipo.europa.eu/trademark-search/trademarks",
    apiKey: process.env.TMVIEW_API_KEY?.trim() || process.env.EUIPO_API_KEY?.trim() || "",
    clientId: process.env.TMVIEW_CLIENT_ID?.trim() || process.env.EUIPO_CLIENT_ID?.trim() || "",
    clientSecret: process.env.TMVIEW_CLIENT_SECRET?.trim() || process.env.EUIPO_CLIENT_SECRET?.trim() || "",
    tokenUrl:
      process.env.TMVIEW_TOKEN_URL?.trim()
      || process.env.EUIPO_TOKEN_URL?.trim()
      || "https://euipo.europa.eu/cas-server-webapp/oidc/accessToken",
  };
}

export function hasTrademarkSourceConfig(): boolean {
  const prv = getPrvConfig();
  const tmview = getTmviewConfig();
  return Boolean((prv.searchUrl && prv.apiKey) || (tmview.searchUrl && ((tmview.clientId && tmview.clientSecret) || tmview.apiKey)));
}
