/** Inline script to avoid theme flash before hydration */
export function ThemeScript() {
  const code = `
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )bodiqo_theme=([^;]*)/);
    var mode = m ? decodeURIComponent(m[1]) : (localStorage.getItem('bodiqo_theme') || 'dark');
    var resolved = mode;
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    if (resolved !== 'light' && resolved !== 'dark') resolved = 'dark';
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-mode', mode);
    var lm = document.cookie.match(/(?:^|; )bodiqo_locale=([^;]*)/);
    if (lm) {
      var loc = decodeURIComponent(lm[1]);
      document.documentElement.lang = loc;
      if (loc === 'ar' || loc === 'he') document.documentElement.dir = 'rtl';
    }
  } catch (e) {}
})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
      suppressHydrationWarning
    />
  );
}
