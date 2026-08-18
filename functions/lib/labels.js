"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specieLabel = specieLabel;
exports.zonaLabel = zonaLabel;
exports.categoriaLabel = categoriaLabel;
exports.titoloNotifica = titoloNotifica;
exports.statoLabel = statoLabel;
// ─── Etichette leggibili per le notifiche ────────────────────────────────────
// Senza la specie la notifica è ambigua: "MASCHI DI PRIMA CLASSE" esiste sia nel
// capriolo sia nel camoscio. E nel camoscio le 12 categorie sono duplicate nelle
// due subzone (prefissi cam1_ / cam2_) con lo stesso nome, quindi serve anche la zona.
const SPECIE_FALLBACK = {
    cervo: 'Cervo',
    capriolo: 'Capriolo',
    camoscio: 'Camoscio',
};
function specieLabel(specieId, specieData) {
    const nome = specieData?.nome;
    if (typeof nome === 'string' && nome.trim())
        return nome.trim();
    return SPECIE_FALLBACK[specieId] ?? specieId;
}
function zonaLabel(specieId, specieData, catId) {
    if (specieId !== 'camoscio')
        return null;
    const zones = specieData?.subZone;
    const list = Array.isArray(zones) ? zones : [];
    if (catId.startsWith('cam1_'))
        return list[0]?.nome ?? 'Zona 1';
    if (catId.startsWith('cam2_'))
        return list[1]?.nome ?? 'Zona 2';
    return null;
}
function categoriaLabel(specieId, specieData, cat) {
    const zona = zonaLabel(specieId, specieData, cat.id);
    return zona ? `${cat.nome} (${zona})` : cat.nome;
}
// Titolo della notifica: la specie, più la zona quando la specie ne ha
// (solo il camoscio). È la riga in evidenza sulla schermata di blocco.
function titoloNotifica(specieId, specieData, cat) {
    const specie = specieLabel(specieId, specieData);
    const zona = zonaLabel(specieId, specieData, cat.id);
    return zona ? `${specie} — ${zona}` : specie;
}
// Accordo di genere: le categorie reali iniziano tutte per FEMMINE, MASCHI o
// PICCOLI. "FEMMINE DI TERZA CLASSE CHIUSE" ma "MASCHI PALCUTI CHIUSI".
function statoLabel(nomeCategoria, stato) {
    const femminile = nomeCategoria.trim().toUpperCase().startsWith('FEMMINE');
    if (stato === 'chiuso')
        return femminile ? 'CHIUSE' : 'CHIUSI';
    return femminile ? 'SOSPESE' : 'SOSPESI';
}
//# sourceMappingURL=labels.js.map