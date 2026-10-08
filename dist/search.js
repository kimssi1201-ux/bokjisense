const form = document.querySelector('#search-form');
const input = document.querySelector('#query');
const status = document.querySelector('#search-status');
const results = document.querySelector('#search-results');
let indexPromise;
let revision = 0;
const normal = text => text.normalize('NFKC').toLocaleLowerCase('ko').trim();
async function search() {
  const current = ++revision;
  const query = input.value.trim().slice(0,100);
  const url = new URL(location.href);
  query ? url.searchParams.set('q',query) : url.searchParams.delete('q');
  history.replaceState(null,'',url);
  results.replaceChildren();
  if (!query) { status.textContent = '제목, 카테고리 또는 궁금한 내용으로 검색해 보세요.'; return; }
  status.textContent = '검색 중입니다.';
  try {
    indexPromise ??= fetch('/search-index.json').then(r => {if (!r.ok) throw new Error(); return r.json();});
    const index = await indexPromise;
    if (current !== revision) return;
    const tokens = normal(query).split(/\s+/);
    const hits = index.filter(p => tokens.every(t => normal(p.title+' '+p.category+' '+p.text+' '+p.tags.join(' ')).includes(t)));
    status.textContent = hits.length ? '“'+query+'” 검색 결과 '+hits.length+'개' : '일치하는 정보가 없습니다. 다른 검색어를 입력해 주세요.';
    for (const p of hits.slice(0,100)) {
      const li = document.createElement('li'); li.className = 'post-item';
      const meta = document.createElement('div'); meta.className = 'post-meta'; meta.textContent=p.category+(p.sample?' · SAMPLE':'');
      const heading=document.createElement('h2'); const a=document.createElement('a'); a.href=p.url; a.textContent=p.title; heading.append(a);
      const desc=document.createElement('p'); desc.textContent=p.description;
      const time=document.createElement('time'); time.dateTime=p.date; time.textContent=p.date.replaceAll('-','.');
      li.append(meta,heading,desc,time); results.append(li);
    }
  } catch { if(current !== revision) return; indexPromise=undefined; status.textContent='검색 정보를 불러오지 못했습니다. 잠시 후 다시 검색해 주세요.'; }
}
form.addEventListener('submit',e=>{e.preventDefault();search();});
input.value=new URL(location.href).searchParams.get('q')?.slice(0,100)||'';
search();
