/**
 * Early client boot: mute known browser-extension console noise before React
 * hydrates. Dev-only — keeps production main-thread work minimal for Lighthouse.
 */
const RUNTIME_GUARD = `(function(){try{var o=console.error.bind(console),w=console.warn.bind(console),m=["runtime.lastError","message port closed","extension context invalidated","receiving end does not exist","can only be used in server components"];function s(a){try{var t=Array.prototype.slice.call(a).map(String).join(" ");for(var i=0;i<m.length;i++)if(t.indexOf(m[i])!==-1)return true}catch(e){}return false}console.error=function(){if(s(arguments))return;return o.apply(console,arguments)};console.warn=function(){if(s(arguments))return;return w.apply(console,arguments)}}catch(e){}})();`;

export function RuntimeGuardScript() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <script
      id="relune-runtime-guard"
      dangerouslySetInnerHTML={{ __html: RUNTIME_GUARD }}
    />
  );
}
