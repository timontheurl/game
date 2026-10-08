import LogoMark from "./LogoMark";

// Beim ersten Öffnen der Seite: das Logo entsteht als Passkette, dann blendet der Vorhang aus.
// Läuft nur einmal pro Sitzung (siehe Skript in app/layout.tsx) und reiner CSS-Ablauf –
// ohne JavaScript verschwindet er genauso von selbst.
export const INTRO_SCRIPT = `try{var s=sessionStorage;if(s.getItem("pa-intro")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("no-intro")}else{s.setItem("pa-intro","1")}}catch(e){document.documentElement.classList.add("no-intro")}`;

export default function IntroSplash() {
  return (
    <div className="intro-splash" aria-hidden="true">
      <div className="intro-splash-inner">
        <LogoMark play />
        <span className="wordmark intro-splash-word">
          Pre<span>Assists</span>
        </span>
      </div>
    </div>
  );
}
