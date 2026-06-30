const GOOGLE_SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWKQFq5K4oAH8vFXeXxjZl4ym6rapVWN05oDhx7tykewL3A_FGQZcnk05XG0Va_e_cHWORpfqPs13m/pub?gid=0&single=true&output=tsv';

export default {
  async fetch(request, env, ctx) {
    // 1. Pobieramy oryginalny plik statyczny z Publii
    let response = await env.ASSETS.fetch(request);

    const url = new URL(request.url);
    
    // Sprawdzamy, czy to podstrona "O nas"
    if (url.pathname.endsWith('/o-nas/')) {
      
      // BEZPIECZNIK 1: Jeśli przeglądarka ma skeszowaną stronę (304), zwracamy ją bez zmian
      if (response.status === 304) {
        return response;
      }
      
      // BEZPIECZNIK 2: Upewniamy się, że modyfikujemy plik tekstowy/HTML
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return response;
      }

      try {
        const sheetResponse = await fetch(GOOGLE_SHEET_TSV_URL, { cf: { cacheTtl: 300 } });
        if (!sheetResponse.ok) return response;
        
        const text = await sheetResponse.text();
        
        const bios = {};
        const lines = text.split('\n');
        for (let line of lines) {
          const [id, bio] = line.split('\t');
          if (id && bio) bios[id.trim()] = bio.trim();
        }

        let rewriter = new HTMLRewriter();
        for (const [id, bio] of Object.entries(bios)) {
          rewriter.on(`[data-bio="${id}"]`, {
            element(element) { element.setInnerContent(bio); }
          });
        }

        // Bezpiecznie zwracamy przetworzony strumień
        return rewriter.transform(response);
      } catch (err) {
        // Awaryjne wyjście – w razie problemów z Google Sheets, ładuje się zwykła strona
        return response;
      }
    }

    return response;
  },
};