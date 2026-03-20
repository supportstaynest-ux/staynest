import { defineConfig } from 'vite';
import { transformWithEsbuild } from 'vite';

export default defineConfig({
    plugins: [
        {
            name: 'handle-complex-templates',
            enforce: 'pre',
            async transform(code, id) {
                // Pre-transform vendor.js with esbuild before Rollup's import analysis
                // because Vite's es-module-lexer cannot handle deeply nested HTML template literals
                if (id.includes('src/js/pages/') || id.includes('src\\js\\pages\\')) {
                    const result = await transformWithEsbuild(code, id, {
                        loader: 'js',
                        target: 'esnext',
                    });
                    return {
                        code: result.code,
                        map: result.map,
                    };
                }
                return null;
            }
        }
    ],
    build: {
        target: 'esnext',
        rollupOptions: {
            // Increase warning suppression for large inline strings
            onwarn(warning, warn) {
                if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
                warn(warning);
            }
        }
    },
    esbuild: {
        target: 'esnext',
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3001'
        }
    }
});
