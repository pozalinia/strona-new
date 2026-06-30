const GOOGLE_SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWKQFq5K4oAH8vFXeXxjZl4ym6rapVWN05oDhx7tykewL3A_FGQZcnk05XG0Va_e_cHWORpfqPs13m/pub?gid=0&single=true&output=tsv';

export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);
    const url = new URL(request.url);

    // Sprawdzamy, czy użytkownik wchodzi na stronę "O nas"
    if (url.pathname.endsWith('/o-nas/')) {
      try {
        // Pobieramy dane z Google Sheets (keszowanie w Cloudflare na 5 minut)
        const sheetResponse = await fetch(GOOGLE_SHEET_TSV_URL, {
          cf: { cacheTtl: 300 }
        });
        const text = await sheetResponse.text();
        
        // Parsowanie formatu TSV
        const bios = {};
        const lines = text.split('\n');
        for (let line of lines) {
          const [id, bio] = line.split('\t');
          if (id && bio) {
            bios[id.trim()] = bio.trim();
          }
        }

        // Użycie HTMLRewriter do wstrzyknięcia opisów w locie
        let rewriter = new HTMLRewriter();

        for (const [id, bio] of Object.entries(bios)) {
          rewriter.on(`[data-bio="${id}"]`, {
            element(element) {
              element.setInnerContent(bio);
            }
          });
        }

        return rewriter.transform(response);
      } catch (err) {
        // Jeśli Google Sheets padnie, Worker przepuści oryginalną stronę z Publii
        return response;
      }
    }

    return response;
  },
};