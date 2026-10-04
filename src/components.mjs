export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function AdSlot(ads, slot) {
  if (!ads.enabled || !/^ca-pub-\d{16}$/.test(ads.publisherId) || !/^\d+$/.test(slot)) return '';
  return '<aside class="ad-unit" aria-label="광고"><span>광고</span><ins class="adsbygoogle" style="display:block" data-ad-client="'+esc(ads.publisherId)+'" data-ad-slot="'+esc(slot)+'" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(window.adsbygoogle=window.adsbygoogle||[]).push({});</script></aside>';
}
export function adHead(ads) {
  if (!ads.enabled || !/^ca-pub-\d{16}$/.test(ads.publisherId) || !/^\d+$/.test(ads.articleSlot)) return '';
  return '<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+esc(ads.publisherId)+'"></script>';
}
