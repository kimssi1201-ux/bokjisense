import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {Marked} from 'marked';
import config, {categories} from '../src/site.config.mjs';
import {esc, AdSlot, adHead} from '../src/components.mjs';

const root=process.cwd(), out=path.join(root,'dist');
if (path.basename(out)!=='dist' || path.dirname(out)!==root) throw new Error('Unsafe output directory');
const absolute=p=>new URL(p,config.url).href;
if (!/^https:\/\//.test(config.url)) throw new Error('Site URL must use HTTPS');
if (!Number.isInteger(config.pageSize)||config.pageSize<1) throw new Error('Invalid pageSize');
if (config.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail)) throw new Error('Invalid contact email');
const adsActive = config.ads.enabled && /^ca-pub-\d{16}$/.test(config.ads.publisherId) && /^\d+$/.test(config.ads.articleSlot);
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
fs.cpSync('public',out,{recursive:true});
const write=(p,s)=>{const dest=path.join(out,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s);};
const json=v=>JSON.stringify(v).replace(/</g,'\\u003c');
const date=s=>s.replaceAll('-','.');
const clean=s=>String(s).replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,' ');
const validDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
const all=fs.readdirSync('content/posts').filter(f=>f.endsWith('.md')).map(file=>{
  const {data,content}=matter(fs.readFileSync('content/posts/'+file,'utf8'));
  if(data.draft===true) return null;
  const slug=file.slice(0,-3);
  if(!/^[a-z0-9-]+$/.test(slug)) throw new Error('Use lowercase URL-safe filenames: '+file);
  for(const key of ['title','description','category']) if(typeof data[key]!=='string'||!data[key].trim()) throw new Error(file+': missing '+key);
  if(!categories.some(c=>c.slug===data.category)) throw new Error(file+': invalid category');
  if(!validDate(data.date)||!validDate(data.updated)||data.updated<data.date) throw new Error(file+': invalid dates');
  if(data.sample!==undefined && typeof data.sample!=='boolean') throw new Error(file+': sample must be boolean');
  if(data.draft!==undefined && typeof data.draft!=='boolean') throw new Error(file+': draft must be boolean');
  const sample=data.sample===true;
  if(!sample && /SAMPLE/i.test(data.title)) throw new Error(file+': remove SAMPLE title before publishing');
  const sources=data.sources||[], faq=data.faq||[], tags=data.tags||[];
  if(!Array.isArray(data.summary)||!data.summary.length||data.summary.some(x=>typeof x!=='string'||!x.trim())) throw new Error(file+': summary required');
  if(!Array.isArray(tags)||tags.some(x=>typeof x!=='string')) throw new Error(file+': invalid tags');
  if(!Array.isArray(sources)||sources.some(s=>!s.name||!/^https:\/\//.test(s.url)||!validDate(s.checked))) throw new Error(file+': invalid sources');
  if(!sample && ['government','welfare','finance','jobs'].includes(data.category) && !sources.length) throw new Error(file+': verified official sources required');
  if(!Array.isArray(faq)||faq.some(q=>!q.question||!q.answer)) throw new Error(file+': invalid FAQ');
  return {...data,sample,sources,faq,tags,slug,content,url:'/posts/'+slug+'/'};
}).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));

function markdown(content,images={}) {
  const headings=[], counts=new Map([['main',1],['summary',1],['faq',1],['sources',1]]);
  const renderer={
    heading({tokens,depth}) {
      if(depth===1) throw new Error('Use H2/H3 in Markdown; H1 comes from title');
      const text=this.parser.parseInline(tokens);
      const base=clean(text).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';
      const n=(counts.get(base)||0)+1;counts.set(base,n);
      const id=base+(n>1?'-'+n:'');
      if(depth===2||depth===3) headings.push({id,text:clean(text),depth});
      return '<h'+depth+' id="'+esc(id)+'">'+text+'</h'+depth+'>';
    },
    html({text}) {return esc(text);},
    image({href,text,title}) {
      const dimensions=images[href];
      if(!text||!dimensions||!Number.isFinite(dimensions.width)||!Number.isFinite(dimensions.height)||dimensions.width<=0||dimensions.height<=0) throw new Error('Images need alt and width/height in frontmatter images: '+href);
      if(!/^https:\/\//.test(href)&&!href.startsWith('/images/')) throw new Error('Invalid image path');
      return '<img src="'+esc(href)+'" alt="'+esc(text)+'" width="'+dimensions.width+'" height="'+dimensions.height+'" loading="lazy" decoding="async"'+(title?' title="'+esc(title)+'"':'')+'>';
    },
    link({href,title,tokens}) {
      if(!/^(https?:\/\/|mailto:|\/|#)/.test(href)||href.startsWith('//')) throw new Error('Unsafe or relative link: '+href);
      return '<a href="'+esc(href)+'"'+(title?' title="'+esc(title)+'"':'')+'>'+this.parser.parseInline(tokens)+'</a>';
    }
  };
  const html=new Marked({renderer}).parse(content).replace(/<table>/g,'<div class="table-scroll" role="region" aria-label="정보 표" tabindex="0"><table>').replace(/<\/table>/g,'</table></div>');
  return {html,headings};
}
const category=p=>categories.find(c=>c.slug===p.category);
const item=(p,level=2)=>'<li class="post-item"><div class="post-meta"><span>'+esc(category(p).name)+'</span>'+(p.sample?'<span class="label">SAMPLE</span>':'')+'</div><h'+level+'><a href="'+p.url+'">'+esc(p.title)+'</a></h'+level+'><p>'+esc(p.description)+'</p><time datetime="'+p.date+'">'+date(p.date)+'</time></li>';
const list=(posts,level=2)=>posts.length?'<ul class="post-list">'+posts.map(p=>item(p,level)).join('')+'</ul>':'<p class="empty">확인된 정보를 준비하고 있습니다.</p>';
const crumb=(pairs)=>'<nav class="breadcrumb" aria-label="현재 위치"><a href="/">홈</a>'+pairs.map((p,i)=>'<span aria-hidden="true">/</span>'+(i===pairs.length-1?'<span aria-current="page">'+esc(p[0])+'</span>':'<a href="'+p[1]+'">'+esc(p[0])+'</a>')).join('')+'</nav>';
const nav=active=>categories.map(c=>'<a href="/'+c.slug+'/"'+(active===c.slug?' aria-current="page"':'')+'>'+c.name+'</a>').join('');
const indexed=[];
function page({url,title,description,body,active='',noindex=false,schemas=[],breadcrumbs=[],search=false,article=null}) {
  if(!noindex) indexed.push({url,modified:article?.updated});
  if(breadcrumbs.length) schemas.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['홈','/'],...breadcrumbs].map((x,i)=>({'@type':'ListItem',position:i+1,name:x[0],item:absolute(x[1])}))});
  const full=title+' | '+config.name;
  const html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(full)+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(absolute(url))+'"><meta name="robots" content="'+(noindex?'noindex,follow':'index,follow')+'"><meta property="og:locale" content="ko_KR"><meta property="og:type" content="'+(article?'article':'website')+'"><meta property="og:site_name" content="'+config.name+'"><meta property="og:title" content="'+esc(full)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(absolute(url))+'"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="'+esc(full)+'"><meta name="twitter:description" content="'+esc(description)+'"><meta name="theme-color" content="#ffffff"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate" type="application/rss+xml" title="복지센스 RSS" href="/rss.xml"><link rel="stylesheet" href="/styles.css">'+(article?'<meta property="article:published_time" content="'+article.date+'T00:00:00+09:00"><meta property="article:modified_time" content="'+article.updated+'T00:00:00+09:00">':'')+schemas.map(s=>'<script type="application/ld+json">'+json(s)+'</script>').join('')+adHead(config.ads)+'</head><body><a class="skip" href="#main">본문으로 건너뛰기</a><header class="header"><div class="wrap header-inner"><a class="brand" href="/">복지센스</a><nav class="desktop-nav" aria-label="주요 메뉴">'+nav(active)+'</nav><a class="search-link" href="/search/" aria-label="사이트 검색"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m15 15 6 6" stroke="currentColor" stroke-width="1.5"/></svg><span>검색</span></a><details class="mobile-menu"><summary aria-label="메뉴 열기">☰</summary><nav aria-label="모바일 메뉴">'+nav(active)+'</nav></details></div></header><main id="main" class="wrap">'+body+'</main><footer class="footer"><div class="wrap"><div class="footer-top"><a class="brand" href="/">복지센스</a><nav aria-label="사이트 안내"><a href="/about/">사이트 소개</a><a href="/contact/">문의</a><a href="/privacy/">개인정보처리방침</a><a href="/terms/">이용약관</a><a href="/rss.xml">RSS</a></nav></div><p>복지센스는 정부기관이 운영하는 공식 사이트가 아닙니다.<br>신청 전에는 해당 기관의 최신 공고와 안내를 확인해 주세요.</p><p>© '+new Date().getFullYear()+' 복지센스</p></div></footer>'+(search?'<script type="module" src="/search.js"></script>':'')+'</body></html>';
  write(url==='/404.html'?'404.html':url.replace(/^\//,'')+'index.html',html);
}
const sampleNotice=all.some(p=>p.sample)?'<p class="notice"><strong>콘텐츠 준비 안내</strong><br>SAMPLE로 표시된 글은 작성 형식 예시이며 실제 정책 안내가 아닙니다.</p>':'';
const sidebar='<aside class="sidebar"><section class="category-nav"><h2>주제별로 찾아보기</h2><ul>'+categories.map(c=>'<li><a href="/'+c.slug+'/">'+c.name+'<span aria-hidden="true">→</span></a></li>').join('')+'</ul></section><section><h2>정보를 읽기 전에</h2><p>복지센스는 필요한 정보를 이해하기 쉽게 정리하는 독립적인 정보 사이트입니다.</p><p>실제 신청 조건과 일정은 해당 기관의 최신 공고를 확인해 주세요.</p><a href="/about/">정보 작성 원칙 보기</a></section></aside>';
page({url:'/',title:'지원금·복지·생활정보',description:config.description,body:'<section class="intro"><p class="eyebrow">일상에 도움이 되는 정보</p><h1>생활에 필요한 지원금과<br>복지 정보를 쉽게 정리합니다.</h1><p>필요한 내용을 차분하게 읽고, 공식 안내까지 확인하세요.</p></section><div class="home-grid"><section><div class="section-heading"><h2>최신 정보</h2><a href="/search/">정보 검색 →</a></div>'+sampleNotice+list(all.slice(0,8),3)+ '</section>'+sidebar+'</div><div class="categories-grid">'+categories.map(c=>'<section class="category-block"><div class="section-heading"><h2>'+c.name+'</h2><a class="more" href="/'+c.slug+'/">전체 보기</a></div>'+(all.some(p=>p.category===c.slug)?'<ul>'+all.filter(p=>p.category===c.slug).slice(0,3).map(p=>'<li><a href="'+p.url+'">'+esc(p.title)+'</a></li>').join('')+'</ul>':'<p class="empty">확인된 정보를 준비하고 있습니다.</p>')+'</section>').join('')+'</div>'});
for(const c of categories) {
  const posts=all.filter(p=>p.category===c.slug), count=Math.max(1,Math.ceil(posts.length/config.pageSize));
  const link=n=>'/'+c.slug+'/'+(n===1?'':'page/'+n+'/');
  for(let n=1;n<=count;n++) {
    const title=c.name+(n>1?' · '+n+'페이지':'');
    const pagination='<nav class="pagination" aria-label="페이지 이동">'+(n>1?'<a href="'+link(n-1)+'" rel="prev">이전</a>':'')+Array.from({length:count},(_,i)=>i+1).map(i=>i===n?'<span aria-current="page">'+i+'</span>':'<a href="'+link(i)+'" aria-label="'+i+'페이지">'+i+'</a>').join('')+(n<count?'<a href="'+link(n+1)+'" rel="next">다음</a>':'')+'</nav>';
    page({url:link(n),title,description:c.description+(n>1?' '+n+'페이지.':''),active:c.slug,breadcrumbs:[[title,link(n)]],body:'<div class="page">'+crumb([[title,link(n)]])+'<header class="page-heading"><h1>'+esc(title)+'</h1><p>'+c.description+'</p></header>'+list(posts.slice((n-1)*config.pageSize,n*config.pageSize))+pagination+'</div>'});
  }
}
for(const p of all) {
  const c=category(p), rendered=markdown(p.content,p.images), headings=[...rendered.headings];
  if(p.faq.length) headings.push({id:'faq',text:'자주 묻는 질문',depth:2});
  if(p.sources.length) headings.push({id:'sources',text:'공식 출처',depth:2});
  const toc=headings.length?'<nav class="toc" aria-label="이 글의 목차"><h2>목차</h2><ol>'+headings.map(h=>'<li class="level-'+h.depth+'"><a href="#'+esc(h.id)+'">'+esc(h.text)+'</a></li>').join('')+'</ol></nav>':'';
  const faq=p.faq.length?'<section aria-labelledby="faq"><h2 id="faq">자주 묻는 질문</h2>'+p.faq.map(q=>'<div class="faq-item"><h3>Q. '+esc(q.question)+'</h3><p>A. '+esc(q.answer)+'</p></div>').join('')+'</section>':'';
  const sources=p.sources.length?'<section aria-labelledby="sources"><h2 id="sources">공식 출처</h2><ul class="source-list">'+p.sources.map(s=>'<li><a href="'+esc(s.url)+'" rel="external">'+esc(s.name)+'</a> · 확인일 '+esc(s.checked)+'</li>').join('')+'</ul></section>':'';
  const related=all.filter(x=>x.slug!==p.slug&&(x.category===p.category||x.tags.some(t=>p.tags.includes(t)))).sort((a,b)=>Number(b.category===p.category)-Number(a.category===p.category)).slice(0,5);
  const schemas=[{'@context':'https://schema.org','@type':'Article',headline:p.title,description:p.description,datePublished:p.date+'T00:00:00+09:00',dateModified:p.updated+'T00:00:00+09:00',mainEntityOfPage:absolute(p.url),inLanguage:'ko-KR',articleSection:c.name,author:{'@type':'Organization',name:config.name,url:absolute('/about/')},publisher:{'@type':'Organization',name:config.name,url:config.url}}];
  if(config.faqSchema&&p.faq.length&&!p.sample) schemas.push({'@context':'https://schema.org','@type':'FAQPage',mainEntity:p.faq.map(q=>({'@type':'Question',name:q.question,acceptedAnswer:{'@type':'Answer',text:q.answer}}))});
  page({url:p.url,title:p.title,description:p.description,active:c.slug,noindex:p.sample,schemas,article:p,breadcrumbs:[[c.name,'/'+c.slug+'/'],[p.title,p.url]],body:'<div class="page article">'+crumb([[c.name,'/'+c.slug+'/'],[p.title,p.url]])+'<article><header class="article-header"><div class="post-meta"><a href="/'+c.slug+'/">'+c.name+'</a>'+(p.sample?'<span class="label">SAMPLE</span>':'')+'</div><h1>'+esc(p.title)+'</h1><div class="article-dates"><span>작성일 <time datetime="'+p.date+'">'+date(p.date)+'</time></span><span>수정일 <time datetime="'+p.updated+'">'+date(p.updated)+'</time></span><span>복지센스</span></div></header>'+(p.sample?'<p class="notice">SAMPLE · 이 글은 게시글 형식 예시입니다. 실제 정책의 금액, 자격, 신청 기간을 안내하지 않습니다.</p>':'')+'<section class="summary" aria-labelledby="summary"><h2 id="summary">핵심 요약</h2><ul>'+p.summary.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul></section>'+toc+'<div class="prose">'+rendered.html+faq+sources+'</div>'+AdSlot(config.ads,p.sample?'':config.ads.articleSlot)+'</article>'+(related.length?'<section class="related"><h2>같이 보면 좋은 정보</h2>'+list(related,3)+'</section>':'')+'</div>'});
}
for(const slug of ['about','contact','privacy','terms']) {
  const {data,content}=matter(fs.readFileSync('content/pages/'+slug+'.md','utf8'));
  const contact=config.contactEmail?'문의 이메일: ['+config.contactEmail+'](mailto:'+config.contactEmail+')':'**문의 연락처 준비 중**\n\n현재 운영자의 문의 이메일이 등록되지 않았습니다. 연락처가 공개되기 전에는 이 사이트에서 문의를 접수하지 않습니다.';
  const privacyContact='운영 주체: '+(config.operatorName||'미등록 · 운영자 정보 입력 예정')+'\n\n개인정보 관련 연락처: '+(config.contactEmail||'미등록 · 문의 창구 준비 중');
  const body=content.replace('{{CONTACT}}',contact).replace('{{PRIVACY_CONTACT}}',privacyContact).replace('{{PRIVACY_DATE}}',config.privacyUpdated).replace('{{ADS_NOTICE}}',adsActive?'**광고 설정이 활성화되었습니다. 운영자는 실제 광고 서비스에 맞게 위 처리 내용을 검토·갱신해야 합니다.**':'현재 광고는 비활성화되어 있습니다.');
  page({url:'/'+slug+'/',title:data.title,description:data.description,breadcrumbs:[[data.title,'/'+slug+'/']],body:'<div class="page fixed-copy">'+crumb([[data.title,'/'+slug+'/']])+'<header class="page-heading"><h1>'+data.title+'</h1></header><div class="prose">'+markdown(body).html+'</div></div>'});
}
page({url:'/search/',title:'사이트 검색',description:'복지센스의 지원금·복지·생활정보를 검색합니다.',noindex:true,search:true,breadcrumbs:[['검색','/search/']],body:'<div class="page fixed-copy">'+crumb([['검색','/search/']])+'<header class="page-heading"><h1>정보 검색</h1><p>궁금한 내용을 검색해 보세요.</p></header><form class="search-form" id="search-form" role="search"><label class="skip" for="query">검색어</label><input id="query" name="q" type="search" maxlength="100" placeholder="예: 서류, 신청 방법" autocomplete="off"><button type="submit">검색</button></form><noscript><p>검색하려면 JavaScript를 켜 주세요. 상단의 카테고리 메뉴에서도 글을 찾을 수 있습니다.</p></noscript><p id="search-status" class="search-status" role="status" aria-live="polite"></p><ul id="search-results" class="post-list"></ul></div>'});
page({url:'/404.html',title:'페이지를 찾을 수 없습니다',description:'주소를 확인하거나 복지센스 홈과 검색을 이용해 주세요.',noindex:true,body:'<section class="error-page"><p class="eyebrow">404</p><h1>페이지를 찾을 수 없습니다.</h1><p>주소가 변경되었거나 존재하지 않는 페이지입니다.</p><a href="/">홈으로 돌아가기</a> · <a href="/search/">정보 검색</a></section>'});
write('search-index.json',JSON.stringify(all.map(p=>({title:p.title,description:p.description,category:category(p).name,date:p.date,sample:p.sample,tags:p.tags,url:p.url,text:clean(markdown(p.content,p.images).html)+' '+p.faq.map(x=>x.question+' '+x.answer).join(' ')}))));
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+indexed.map(p=>'<url><loc>'+esc(absolute(p.url))+'</loc>'+(p.modified?'<lastmod>'+p.modified+'</lastmod>':'')+'</url>').join('')+'</urlset>');
write('robots.txt','User-agent: *\nAllow: /\n\nSitemap: '+absolute('/sitemap.xml')+'\n');
write('rss.xml','<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>복지센스</title><link>'+esc(config.url)+'</link><description>'+esc(config.description)+'</description><language>ko</language><atom:link href="'+esc(absolute('/rss.xml'))+'" rel="self" type="application/rss+xml"/>'+all.filter(p=>!p.sample).slice(0,30).map(p=>'<item><title>'+esc(p.title)+'</title><link>'+esc(absolute(p.url))+'</link><guid isPermaLink="true">'+esc(absolute(p.url))+'</guid><description>'+esc(p.description)+'</description><pubDate>'+new Date(p.date+'T00:00:00+09:00').toUTCString()+'</pubDate></item>').join('')+'</channel></rss>');
if(config.ads.adsTxtEnabled) {
 if(!/^ca-pub-\d{16}$/.test(config.ads.publisherId)) throw new Error('ads.txt requires a real publisher ID');
 write('ads.txt','google.com, '+config.ads.publisherId.replace(/^ca-/,'')+', DIRECT, f08c47fec0942fa0\n');
}
fs.appendFileSync(path.join(out,'_headers'), all.filter(p=>p.sample).map(p=>p.url+'\n  X-Robots-Tag: noindex, follow\n').join(''));
console.log('Built '+all.length+' articles, '+indexed.length+' indexed pages in dist/. SAMPLE excluded from sitemap and RSS.');
