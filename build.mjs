import * as esbuild from 'esbuild';
import fs from 'fs';

const result = await esbuild.build({
  entryPoints: ['src/app.ts'],
  bundle: true,
  minify: false,
  format: 'iife',
  write: false,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

const js = result.outputFiles[0].text;
const template = fs.readFileSync('template.html', 'utf-8');
const html = template.replace('/* __BUNDLE__ */', () => js);

fs.writeFileSync('index.html', html);
console.log('✅ Built index.html (' + Math.round(html.length / 1024) + ' KB)');
