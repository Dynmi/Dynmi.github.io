#!/usr/bin/env node
// 新建文章：用 _templates/post.md 生成 _posts/<日期>-<slug>.md，无需安装任何依赖
//
// 用法：node tools/new-post.mjs "文章标题" [--slug my-post] [--lang zh|en] [--date YYYY-MM-DD]
//   · slug 决定网址 /年/月/日/<slug>/；英文标题会自动生成，纯中文标题请用 --slug 指定
//   · lang 默认 zh；英文文章加 --lang en
//   · 日期按 UTC 写（与 GitHub Actions 构建时区一致）：文章不会被当成“未来”而漏发，
//     网址里的日期也和文件名一致
//   · 组件写法（提示框、数据条、对比栏、Mermaid、公式…）见 _templates/components.md
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const slugArg = option('slug');
const lang = option('lang') || 'zh';
const dateArg = option('date');
const title = args.join(' ').trim();

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
if (!title) fail('用法: node tools/new-post.mjs "文章标题" [--slug my-post] [--lang zh|en] [--date YYYY-MM-DD]');
if (dateArg && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) fail('--date 格式应为 YYYY-MM-DD');

const slug = (slugArg || title.toLowerCase())
  .normalize('NFKD')
  .replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
if (!slug) fail('标题里没有能用作网址的英文字符，请用 --slug 指定，例如 --slug llm-agents');

const now = new Date().toISOString(); // UTC
const day = dateArg || now.slice(0, 10);
const date = dateArg ? `${dateArg} 00:00:00` : `${day} ${now.slice(11, 19)}`;

const root = new URL('../', import.meta.url);
const target = new URL(`_posts/${day}-${slug}.md`, root);
if (existsSync(target)) fail(`已存在：_posts/${day}-${slug}.md`);

const template = readFileSync(new URL('_templates/post.md', root), 'utf8');
writeFileSync(
  target,
  template
    .replace('__TITLE__', title.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
    .replace('__DATE__', date)
    .replace('__LANG__', lang)
);
console.log(`已创建 _posts/${day}-${slug}.md\n发布后的网址：/${day.replace(/-/g, '/')}/${slug}/`);
