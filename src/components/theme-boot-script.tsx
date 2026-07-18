/**
 * Inline before paint so theme/locale/a11y from localStorage apply without a flash
 * and without a root `auth()` + Prisma round-trip.
 */
export function ThemeBootScript() {
  const code = `(function(){try{var t=localStorage.getItem("relune.theme");var l=localStorage.getItem("relune.locale");var root=document.documentElement;if(l){root.lang=l;root.dir=/^(ar|he|fa|ur)/.test(l)?"rtl":"ltr";}var dark=t==="DARK"||(t!=="LIGHT"&&window.matchMedia("(prefers-color-scheme: dark)").matches);root.dataset.theme=dark?"dark":"light";var hc=localStorage.getItem("relune.a11y.contrast");var lt=localStorage.getItem("relune.a11y.largeText");var rm=localStorage.getItem("relune.a11y.reduceMotion");root.dataset.contrast=(hc==="1"||hc==="true")?"high":"";root.dataset.text=(lt==="1"||lt==="true")?"large":"";var reduce=rm==="1"||rm==="true"||window.matchMedia("(prefers-reduced-motion: reduce)").matches;root.dataset.motion=reduce?"reduce":"";}catch(e){}})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
      // Runs before hydration; no need for next/script.
    />
  );
}
