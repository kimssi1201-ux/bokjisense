import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import config,{categories} from '../src/site.config.mjs';
import {AdSlot,adHead} from '../src/components.mjs';
const root=path.resolve('dist');
const files=fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.html'));
const titles=new Set(), canonicals=new Set();
let links=0;
for(const file of files) {
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const expected='/'+file.replaceAll('\\','/').replace(/index\.html$/,'');
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];
 assert(title&&!titles.has(title),'Unique title: '+file);titles.add(title);
 assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,'One H1: '+file);
 const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];
 assert.equal(canonical,new URL(expected,config.url).href,'Canonical '+file);
 assert(!canonicals.has(canonical),'Duplicate canonical');canonicals.add(canonical);
 for(const marker of ['name="description"','property="og:title"','property="og:description"','name="twitter:card"','lang="ko"']) assert(html.includes(marker),file+' '+marker);
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'Unique ids '+file);
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
   const target=m[1].replaceAll('&amp;','&');
   if(!target.startsWith('/')&&!target.startsWith('#'))continue;
   const url=new URL(target,canonical);
   const targetPath=decodeURIComponent(url.pathname);
   let dest=path.join(root,targetPath);
   if(fs.existsSync(dest)&&fs.statSync(dest).isDirectory())dest=path.join(dest,'index.html');
   assert(fs.existsSync(dest),'Broken internal link '+file+' → '+target);links++;
   if(url.hash&&dest.endsWith('.html')) {
     const destHtml=fs.readFileSync(dest,'utf8'), id=decodeURIComponent(url.hash.slice(1));
     assert(destHtml.includes('id="'+id+'"'),'Missing anchor '+target);
   }
 }
 for(const m of html.matchAll(/<img\s[^>]*>/g)) for(const attr of ['alt="','width="','height="','loading="lazy"'])assert(m[0].includes(attr),'Image '+attr);
 if(!config.ads.enabled)assert(!html.includes('adsbygoogle')&&!html.includes('class="ad-unit"'),'Disabled ads render nothing');
 if(file.replaceAll('\\','/').startsWith('posts/')) {
   assert(html.includes('"@type":"Article"')&&html.includes('"@type":"BreadcrumbList"'),'Article schemas');
 }
}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const feed=fs.readFileSync(path.join(root,'rss.xml'),'utf8');
assert(!sitemap.includes('/sample-')&&!sitemap.includes('/404.html')&&!sitemap.includes('/search/'),'Exclude noindex URLs');
assert(!feed.includes('/sample-'),'Exclude sample RSS');
for(const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)){
 const url=new URL(match[1]);assert.equal(url.origin,new URL(config.url).origin);
 const file=path.join(root,decodeURIComponent(url.pathname),'index.html');
 assert(fs.existsSync(file),'Sitemap destination exists');
 assert(!fs.readFileSync(file,'utf8').includes('content="noindex,follow"'));
}
for(const c of categories)assert(fs.existsSync(path.join(root,c.slug,'index.html')),'Category');
assert(fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes(config.url+'/sitemap.xml'));
assert(fs.existsSync(path.join(root,'404.html')));
const search=JSON.parse(fs.readFileSync(path.join(root,'search-index.json'),'utf8'));
assert(search.every(p=>fs.existsSync(path.join(root,p.url,'index.html'))),'Search links');
assert.equal(AdSlot({enabled:false,publisherId:'',articleSlot:''},''),'');
assert.equal(AdSlot({enabled:true,publisherId:'',articleSlot:''},''),'');
assert.equal(adHead({enabled:true,publisherId:'',articleSlot:''}),'');
if(!config.ads.adsTxtEnabled)assert(!fs.existsSync(path.join(root,'ads.txt')),'No invented ads.txt');
console.log('PASS: '+files.length+' HTML pages, '+links+' internal links/anchors; metadata, JSON-LD, sitemap, robots, search index, RSS and disabled advertising.');
