#!/usr/bin/env node
// 博客 post 构建器：markdown → 与既有文章同样式的独立 HTML（Jekyll layout:null 形态）
//
// 用法：node build-post.mjs <input.md> <output.html>
//   · output 已存在 → 重建模式：模板与 front matter 均取自 output 本身（样式冻结，
//     构建前后 style/script 逐字节一致，只替换正文）
//   · output 不存在 → 新建模式：模板取自 STYLE_REF 参考页（保证与既有文章样式一致），
//     <title> 换为新文章标题，front matter 生成骨架 —— 记得手动改 excerpt
//
// 依赖：本目录执行一次 npm install 即可（package.json 已声明 marked）
// 注意：正文里的 ```mermaid 码块会转为页面内 CDN 渲染，读者需联网
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { marked } from 'marked';

const STYLE_REF = new URL('../_posts/2026-07-17-claude-code-deep-dive.html', import.meta.url);

const [, , mdPath, outPath] = process.argv;
if (!mdPath || !outPath) {
  console.error('用法: node build-post.mjs <input.md> <output.html>');
  process.exit(1);
}

const splitDoc = (file) => {
  const t = readFileSync(file, 'utf8');
  const m = t.match(/^---\n[\s\S]*?\n---\n/);
  return { fm: m ? m[0] : '', body: m ? t.slice(m[0].length) : t };
};
const extractTemplate = (body) =>
  /<article id="content">[\s\S]*?<\/article>/.test(body)
    ? body.replace(/(<article id="content">)[\s\S]*?(<\/article>)/, '$1\n{{CONTENT}}\n  $2')
    : null;

const md = readFileSync(mdPath, 'utf8');
const title = (md.match(/^#\s+(.+)$/m) || [, basename(mdPath, '.md')])[1].trim();

let fm = '';
let template = null;
let mode;
if (existsSync(outPath)) {
  const cur = splitDoc(outPath);
  fm = cur.fm;
  template = extractTemplate(cur.body);
  mode = 'rebuild（样式与 front matter 取自输出文件本身，冻结不动）';
}
if (!template) {
  template = extractTemplate(splitDoc(STYLE_REF).body);
  if (!template) {
    console.error('参考页模板提取失败：' + STYLE_REF.pathname);
    process.exit(1);
  }
  template = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  mode = mode || 'new（模板取自参考页，front matter 已生成骨架 —— 记得改 excerpt）';
}
if (!fm) {
  const date = (basename(outPath).match(/^(\d{4}-\d{1,2}-\d{1,2})/) ||
    [, new Date().toISOString().slice(0, 10)])[1];
  fm = `---\nlayout: null\ntitle: "${title}"\ndate: ${date} 00:00:00\nexcerpt: "TODO: 一句话摘要"\n---\n`;
}

marked.setOptions({ gfm: true, breaks: false });
let html = marked.parse(md);
html = html.replace(
  /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
  '<div class="mermaid-block"><pre class="mermaid-src">$1</pre></div>'
);

writeFileSync(outPath, fm + template.replace('{{CONTENT}}', () => html));
const mermaidCount = (html.match(/class="mermaid-src"/g) || []).length;
console.log(`OK ${outPath}\nmode=${mode}\ntitle=${title} mermaid=${mermaidCount}`);
