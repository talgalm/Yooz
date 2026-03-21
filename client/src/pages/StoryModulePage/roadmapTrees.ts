export interface RoadmapDecoration {
  name: string;
  category: string;
  svg: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
}

export const ROADMAP_DECORATIONS: RoadmapDecoration[] = [
  {
    name: 'Gray stone',
    category: 'Rocks',
    viewBoxWidth: 70,
    viewBoxHeight: 50,
    svg: `<svg viewBox="0 0 70 50" xmlns="http://www.w3.org/2000/svg">
<path d="M10,42 Q4,36 6,28 Q10,18 20,14 Q30,10 42,10 Q54,12 62,18 Q68,26 66,34 Q62,42 52,44 Q40,46 26,45 Q16,44 10,42 Z" fill="#A0A898"/>
<path d="M20,14 Q30,10 42,10 Q54,12 62,18 Q52,15 42,14 Q30,14 22,18 Z" fill="#B8C0B0" opacity="0.6"/>
<path d="M30,15 Q38,13 48,15 Q42,19 34,20 Z" fill="#C8D0C0" opacity="0.4"/>
<path d="M14,36 Q18,32 24,34 Q18,38 14,36 Z" fill="#909888" opacity="0.3"/>
</svg>`,
  },
  {
    name: 'Dark bush cluster',
    category: 'Bushes',
    viewBoxWidth: 90,
    viewBoxHeight: 55,
    svg: `<svg viewBox="0 0 90 55" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="45" cy="48" rx="40" ry="6" fill="#2a5a2a" opacity="0.15"/>
<ellipse cx="25" cy="35" rx="22" ry="18" fill="#3A7A4A"/>
<ellipse cx="62" cy="33" rx="24" ry="20" fill="#3A7A4A"/>
<ellipse cx="44" cy="28" rx="26" ry="22" fill="#4A8E58"/>
<ellipse cx="32" cy="22" rx="18" ry="16" fill="#5AA268"/>
<ellipse cx="56" cy="20" rx="20" ry="17" fill="#5AA268"/>
<ellipse cx="44" cy="15" rx="16" ry="13" fill="#68B278"/>
<ellipse cx="38" cy="12" rx="10" ry="8" fill="#78C288" opacity="0.5"/>
<ellipse cx="52" cy="14" rx="8" ry="7" fill="#78C288" opacity="0.4"/>
</svg>`,
  },
  {
    name: 'Teal bush cluster',
    category: 'Bushes',
    viewBoxWidth: 80,
    viewBoxHeight: 50,
    svg: `<svg viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="40" cy="44" rx="35" ry="5" fill="#2a5a5a" opacity="0.12"/>
<ellipse cx="22" cy="32" rx="20" ry="16" fill="#3A8878"/>
<ellipse cx="58" cy="30" rx="20" ry="17" fill="#3A8878"/>
<ellipse cx="40" cy="26" rx="24" ry="20" fill="#4A9E8A"/>
<ellipse cx="30" cy="20" rx="16" ry="14" fill="#5AB49C"/>
<ellipse cx="50" cy="18" rx="18" ry="15" fill="#5AB49C"/>
<ellipse cx="40" cy="12" rx="14" ry="11" fill="#6AC8AE"/>
<ellipse cx="36" cy="10" rx="8" ry="6" fill="#7AD8BE" opacity="0.45"/>
</svg>`,
  },
  {
    name: 'Small grass tuft 1',
    category: 'Grass',
    viewBoxWidth: 50,
    viewBoxHeight: 40,
    svg: `<svg viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">
<path d="M14,38 Q12,28 8,18 Q10,22 14,26 Q13,18 10,8 Q14,16 17,24 Q16,16 18,6 Q19,16 20,24 Q22,16 25,8 Q24,18 22,26 Q26,20 30,14 Q27,22 24,30 Q28,24 34,18 Q30,26 26,34 Q30,30 36,26 Q32,32 26,38 Z" fill="#4A8858"/>
<path d="M16,36 Q14,26 12,16 Q15,22 17,28 Q16,20 18,10 Q19,20 20,28 Q22,18 24,12 Q23,22 22,30 Z" fill="#5AA268" opacity="0.6"/>
</svg>`,
  },
  {
    name: 'Small grass tuft 2',
    category: 'Grass',
    viewBoxWidth: 40,
    viewBoxHeight: 35,
    svg: `<svg viewBox="0 0 40 35" xmlns="http://www.w3.org/2000/svg">
<path d="M10,32 Q8,24 6,14 Q10,20 12,26 Q11,18 12,8 Q14,18 15,26 Q17,16 20,6 Q20,18 19,26 Q22,18 26,10 Q24,20 21,28 Q24,24 30,18 Q26,26 22,32 Z" fill="#3D7A4A"/>
<path d="M12,30 Q10,22 10,14 Q13,20 14,26 Q14,18 16,10 Q16,20 16,26 Q18,18 22,12 Q20,22 18,30 Z" fill="#4A8E58" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Wide grass patch',
    category: 'Grass',
    viewBoxWidth: 70,
    viewBoxHeight: 35,
    svg: `<svg viewBox="0 0 70 35" xmlns="http://www.w3.org/2000/svg">
<path d="M8,32 Q6,24 4,16 Q8,22 10,28 Q9,20 8,10 Q12,18 13,26 Q14,16 16,6 Q17,16 17,24 Q20,14 24,6 Q22,16 20,26 Q24,18 28,10 Q26,20 24,28 Q28,20 32,12 Q30,22 28,30 Z" fill="#4A8858"/>
<path d="M36,32 Q34,24 33,14 Q36,20 37,28 Q37,18 38,8 Q40,18 40,26 Q42,16 46,8 Q44,18 42,28 Q46,20 50,12 Q48,22 45,30 Q48,24 54,16 Q52,26 48,32 Q52,28 58,20 Q55,28 52,32 Z" fill="#3D7A4A"/>
<path d="M12,30 Q10,20 10,12 Q13,20 14,28 Q15,18 18,8 Q18,20 17,28 Z" fill="#5AA268" opacity="0.5"/>
<path d="M40,30 Q38,20 38,12 Q40,20 41,28 Q42,18 44,10 Q44,20 43,28 Z" fill="#4A8E58" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Cloud shape 1',
    category: 'Clouds',
    viewBoxWidth: 100,
    viewBoxHeight: 45,
    svg: `<svg viewBox="0 0 100 45" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="35" cy="28" rx="28" ry="14" fill="#C8D8A8" opacity="0.6"/>
<ellipse cx="65" cy="26" rx="30" ry="15" fill="#C8D8A8" opacity="0.6"/>
<ellipse cx="50" cy="22" rx="32" ry="16" fill="#D4E4B8" opacity="0.5"/>
<ellipse cx="42" cy="18" rx="20" ry="12" fill="#E0EEC8" opacity="0.4"/>
</svg>`,
  },
  {
    name: 'Cloud shape 2',
    category: 'Clouds',
    viewBoxWidth: 80,
    viewBoxHeight: 40,
    svg: `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="28" cy="24" rx="22" ry="12" fill="#B8C898" opacity="0.5"/>
<ellipse cx="52" cy="22" rx="24" ry="13" fill="#B8C898" opacity="0.5"/>
<ellipse cx="40" cy="18" rx="26" ry="14" fill="#C8D8A8" opacity="0.45"/>
<ellipse cx="36" cy="14" rx="16" ry="10" fill="#D8E8B8" opacity="0.35"/>
</svg>`,
  },
  {
    name: 'Terrain shadow 1',
    category: 'Shadows',
    viewBoxWidth: 120,
    viewBoxHeight: 60,
    svg: `<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
<path d="M5,50 Q0,40 8,30 Q18,20 35,15 Q55,10 78,12 Q95,16 110,24 Q118,32 115,42 Q110,52 90,55 Q65,58 40,56 Q18,54 5,50 Z" fill="#5A8038" opacity="0.35"/>
<path d="M18,20 Q35,15 55,10 Q78,12 95,16 Q80,14 60,14 Q40,16 25,22 Z" fill="#6A9048" opacity="0.2"/>
</svg>`,
  },
  {
    name: 'Terrain shadow 2',
    category: 'Shadows',
    viewBoxWidth: 100,
    viewBoxHeight: 50,
    svg: `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
<path d="M4,42 Q0,34 10,24 Q22,16 40,12 Q60,10 78,14 Q92,20 96,30 Q98,40 88,46 Q72,50 52,48 Q28,48 10,44 Z" fill="#4A7030" opacity="0.3"/>
<path d="M22,16 Q40,12 60,10 Q78,14 88,20 Q72,16 55,14 Q38,15 26,20 Z" fill="#5A8038" opacity="0.18"/>
</svg>`,
  },
  {
    name: 'Pond / water',
    category: 'Water',
    viewBoxWidth: 130,
    viewBoxHeight: 70,
    svg: `<svg viewBox="0 0 130 70" xmlns="http://www.w3.org/2000/svg">
<path d="M10,45 Q5,35 15,25 Q28,15 50,12 Q72,10 95,14 Q112,20 120,30 Q125,40 115,50 Q100,58 78,60 Q52,62 30,58 Q14,54 10,45 Z" fill="#7EC8E8"/>
<path d="M15,25 Q28,15 50,12 Q72,10 95,14 Q112,20 120,30 Q108,22 90,18 Q70,14 50,16 Q30,20 20,30 Z" fill="#A0DAFA" opacity="0.6"/>
<path d="M35,18 Q50,14 70,15 Q58,20 42,22 Z" fill="#B8E6FF" opacity="0.5"/>
<ellipse cx="60" cy="35" rx="30" ry="10" fill="#B8E6FF" opacity="0.25"/>
<path d="M45,40 Q55,38 70,40 Q60,44 45,40 Z" fill="#FFFFFF" opacity="0.2"/>
<path d="M70,32 Q80,30 92,33 Q82,36 70,32 Z" fill="#FFFFFF" opacity="0.15"/>
</svg>`,
  },
  {
    name: 'Round yellow-green tree',
    category: 'Trees',
    viewBoxWidth: 160,
    viewBoxHeight: 310,
    svg: `<svg viewBox="0 0 160 310" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="75" cy="295" rx="55" ry="10" fill="#3a6b2a" opacity="0.3"/>
<path d="M68,295 L65,230 Q60,210 58,195 L62,195 Q64,210 67,225 L70,180 Q72,170 74,165 L76,165 Q78,172 80,182 L82,225 Q84,210 87,195 L90,195 Q88,210 85,230 L82,295 Z" fill="#6B4F30"/>
<path d="M70,280 Q73,270 72,260" stroke="#5A3E22" stroke-width="0.8" fill="none"/>
<path d="M76,275 Q78,260 75,245" stroke="#5A3E22" stroke-width="0.8" fill="none"/>
<path d="M65,225 Q48,210 35,195" stroke="#6B4F30" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="M40,200 Q32,188 25,182" stroke="#6B4F30" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M82,220 Q98,205 110,198" stroke="#6B4F30" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M105,202 Q112,192 120,190" stroke="#6B4F30" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<ellipse cx="40" cy="160" rx="35" ry="30" fill="#7BA33A"/>
<ellipse cx="110" cy="155" rx="32" ry="28" fill="#7BA33A"/>
<ellipse cx="75" cy="140" rx="40" ry="35" fill="#7BA33A"/>
<ellipse cx="50" cy="145" rx="32" ry="28" fill="#8FBD42"/>
<ellipse cx="100" cy="142" rx="30" ry="26" fill="#8FBD42"/>
<ellipse cx="75" cy="125" rx="38" ry="32" fill="#8FBD42"/>
<ellipse cx="60" cy="130" rx="28" ry="24" fill="#A8D44E"/>
<ellipse cx="90" cy="128" rx="26" ry="22" fill="#A8D44E"/>
<ellipse cx="75" cy="112" rx="30" ry="26" fill="#B8E25A"/>
<ellipse cx="65" cy="115" rx="14" ry="12" fill="#C8EE6A" opacity="0.6"/>
<ellipse cx="85" cy="118" rx="12" ry="10" fill="#C8EE6A" opacity="0.5"/>
<ellipse cx="75" cy="100" rx="16" ry="12" fill="#D0F472" opacity="0.4"/>
<circle cx="38" cy="148" r="6" fill="#9CC840" opacity="0.7"/>
<circle cx="112" cy="145" r="5" fill="#9CC840" opacity="0.7"/>
</svg>`,
  },
  {
    name: 'Tall dark green tree',
    category: 'Trees',
    viewBoxWidth: 130,
    viewBoxHeight: 320,
    svg: `<svg viewBox="0 0 130 320" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="55" cy="305" rx="40" ry="8" fill="#2a5a3a" opacity="0.3"/>
<path d="M48,305 L46,240 Q44,220 42,200 L44,195 Q47,210 50,230 L52,170 Q54,155 55,145 L57,145 Q58,158 60,172 L62,230 Q65,215 67,200 L69,200 Q67,220 65,240 L63,305 Z" fill="#5A4028"/>
<ellipse cx="53" cy="260" rx="4" ry="3" fill="#4A3220" opacity="0.5"/>
<path d="M46,235 Q30,218 18,208" stroke="#5A4028" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M22,212 Q15,200 8,195" stroke="#5A4028" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M63,230 Q78,215 92,210" stroke="#5A4028" stroke-width="2.8" fill="none" stroke-linecap="round"/>
<path d="M50,195 Q38,178 28,170" stroke="#5A4028" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M60,190 Q72,175 82,168" stroke="#5A4028" stroke-width="2" fill="none" stroke-linecap="round"/>
<ellipse cx="20" cy="175" rx="25" ry="28" fill="#2D6B3F"/>
<ellipse cx="90" cy="172" rx="24" ry="26" fill="#2D6B3F"/>
<ellipse cx="55" cy="160" rx="30" ry="32" fill="#2D6B3F"/>
<ellipse cx="35" cy="155" rx="28" ry="30" fill="#3A7F4E"/>
<ellipse cx="75" cy="152" rx="26" ry="28" fill="#3A7F4E"/>
<ellipse cx="55" cy="138" rx="32" ry="30" fill="#3A7F4E"/>
<ellipse cx="42" cy="130" rx="24" ry="22" fill="#4A9360"/>
<ellipse cx="68" cy="128" rx="22" ry="20" fill="#4A9360"/>
<ellipse cx="55" cy="115" rx="26" ry="22" fill="#4A9360"/>
<ellipse cx="55" cy="98" rx="20" ry="18" fill="#5AA670"/>
<ellipse cx="48" cy="88" rx="14" ry="14" fill="#68B47E"/>
<ellipse cx="62" cy="92" rx="12" ry="12" fill="#68B47E"/>
<ellipse cx="50" cy="105" rx="10" ry="8" fill="#78C48E" opacity="0.5"/>
</svg>`,
  },
  {
    name: 'Orange blossom tree',
    category: 'Trees',
    viewBoxWidth: 160,
    viewBoxHeight: 310,
    svg: `<svg viewBox="0 0 160 310" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="75" cy="295" rx="55" ry="9" fill="#6a4a2a" opacity="0.2"/>
<path d="M68,295 Q65,270 62,245 Q58,225 55,210 Q52,195 55,185 L58,182 Q56,195 60,210 Q64,228 66,245 L68,180 Q70,165 72,155 L76,155 Q78,168 78,182 L80,245 Q84,228 88,212 Q92,198 90,185 L93,185 Q94,200 90,215 Q86,230 84,248 Q82,270 80,295 Z" fill="#6B4F30"/>
<path d="M58,210 Q42,195 28,185" stroke="#6B4F30" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<path d="M32,188 Q22,178 15,172" stroke="#6B4F30" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M88,208 Q102,195 115,188" stroke="#6B4F30" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M64,188 Q52,172 44,162" stroke="#6B4F30" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="M78,185 Q88,170 96,160" stroke="#6B4F30" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<ellipse cx="22" cy="152" rx="26" ry="24" fill="#D87A3A"/>
<ellipse cx="125" cy="150" rx="24" ry="22" fill="#D87A3A"/>
<ellipse cx="75" cy="145" rx="34" ry="30" fill="#D87A3A"/>
<ellipse cx="42" cy="140" rx="28" ry="24" fill="#E8924A"/>
<ellipse cx="108" cy="138" rx="26" ry="22" fill="#E8924A"/>
<ellipse cx="75" cy="128" rx="32" ry="26" fill="#E8924A"/>
<ellipse cx="58" cy="120" rx="24" ry="20" fill="#F0A85C"/>
<ellipse cx="92" cy="118" rx="22" ry="18" fill="#F0A85C"/>
<ellipse cx="75" cy="105" rx="28" ry="22" fill="#F4BE78"/>
<ellipse cx="68" cy="98" rx="14" ry="10" fill="#F8D7A0" opacity="0.6"/>
<circle cx="30" cy="145" r="3" fill="#FFF" opacity="0.5"/>
<circle cx="55" cy="100" r="2.5" fill="#FFF" opacity="0.5"/>
<circle cx="95" cy="108" r="2.5" fill="#FFF" opacity="0.45"/>
<circle cx="118" cy="142" r="2" fill="#FFF" opacity="0.4"/>
<circle cx="42" cy="115" r="2" fill="#FFF" opacity="0.5"/>
<circle cx="78" cy="92" r="2.5" fill="#FFF" opacity="0.4"/>
</svg>`,
  },
];
