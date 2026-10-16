import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import cspPolicy from './csp-policy.json' with { type: 'json' };

/** security-design.md の指定どおりの CSP の文字列（指定を「; 」でつなぐ）。 */
export const CSP_CONTENT = cspPolicy.directives.join('; ');

/**
 * ビルドのときだけ index.html の head に CSP の meta 要素を足す。
 * 開発中の起動（vite dev）は、変更を画面へ反映する仕組みが手元の通信を使うため入れない（NFR3.1）。
 */
function cspMetaPlugin(): Plugin {
  return {
    name: 'budget-app-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_CONTENT },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

// preview のポートはここに書かない。利用は package.json の serve（4173）、
// テストは playwright.config.ts の webServer（4174）で渡す（インフラ設計 R-03）。
export default defineConfig({
  plugins: [react(), cspMetaPlugin()],
  build: {
    // CSP は data: を許さないため、画像や書体を data: の URL として埋め込まない。
    assetsInlineLimit: 0,
  },
});
