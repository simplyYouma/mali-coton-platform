/**
 * Hierarchie administrative Mali — Region → Cercle → Commune → Quartier.
 * Couverture etendue : toutes les regions principales du Mali avec leurs
 * cercles, leurs communes pilotes et quelques quartiers de reference.
 *
 * Note : la nomenclature inclut le decoupage classique (avant 2023) qui
 * reste le plus largement utilise dans les referentiels nationaux. Les
 * nouvelles regions (Bougouni, Koutiala, San, Dioila, Nioro, Kita, Nara,
 * Bandiagara, Douentza) sont egalement listees.
 */

export interface MockRegion {
  id: string;
  nom: string;
  code: string;
}

export interface MockCercle {
  id: string;
  nom: string;
  code: string;
  regionId: string;
}

export interface MockCommune {
  id: string;
  nom: string;
  code: string;
  cercleId: string;
}

export interface MockQuartier {
  id: string;
  nom: string;
  code: string;
  communeId: string;
}

export const mockRegions: MockRegion[] = [
  { id: 'reg-bamako', nom: 'District de Bamako', code: 'BKO' },
  { id: 'reg-kayes', nom: 'Région de Kayes', code: 'KYS' },
  { id: 'reg-koulikoro', nom: 'Région de Koulikoro', code: 'KLK' },
  { id: 'reg-sikasso', nom: 'Région de Sikasso', code: 'SKS' },
  { id: 'reg-segou', nom: 'Région de Ségou', code: 'SGU' },
  { id: 'reg-mopti', nom: 'Région de Mopti', code: 'MPT' },
  { id: 'reg-tombouctou', nom: 'Région de Tombouctou', code: 'TBT' },
  { id: 'reg-gao', nom: 'Région de Gao', code: 'GAO' },
  { id: 'reg-kidal', nom: 'Région de Kidal', code: 'KDL' },
  { id: 'reg-taoudenit', nom: 'Région de Taoudénit', code: 'TDN' },
  { id: 'reg-menaka', nom: 'Région de Ménaka', code: 'MNK' },
  { id: 'reg-nioro', nom: 'Région de Nioro', code: 'NRO' },
  { id: 'reg-kita', nom: 'Région de Kita', code: 'KTA' },
  { id: 'reg-dioila', nom: 'Région de Dioïla', code: 'DIL' },
  { id: 'reg-nara', nom: 'Région de Nara', code: 'NRA' },
  { id: 'reg-bougouni', nom: 'Région de Bougouni', code: 'BGN' },
  { id: 'reg-koutiala', nom: 'Région de Koutiala', code: 'KTL' },
  { id: 'reg-san', nom: 'Région de San', code: 'SAN' },
  { id: 'reg-bandiagara', nom: 'Région de Bandiagara', code: 'BDG' },
  { id: 'reg-douentza', nom: 'Région de Douentza', code: 'DZA' },
];

export const mockCercles: MockCercle[] = [
  /* District de Bamako — 6 communes ont rang de cercle */
  { id: 'cer-bamako', nom: 'Cercle de Bamako', code: 'CER-BKO', regionId: 'reg-bamako' },

  /* Kayes */
  { id: 'cer-kayes', nom: 'Cercle de Kayes', code: 'CER-KYS', regionId: 'reg-kayes' },
  { id: 'cer-bafoulabe', nom: 'Cercle de Bafoulabé', code: 'CER-BFL', regionId: 'reg-kayes' },
  { id: 'cer-diema', nom: 'Cercle de Diéma', code: 'CER-DMA', regionId: 'reg-kayes' },
  { id: 'cer-kenieba', nom: 'Cercle de Kéniéba', code: 'CER-KNB', regionId: 'reg-kayes' },
  { id: 'cer-yelimane', nom: 'Cercle de Yélimané', code: 'CER-YLM', regionId: 'reg-kayes' },

  /* Koulikoro */
  { id: 'cer-koulikoro', nom: 'Cercle de Koulikoro', code: 'CER-KLK', regionId: 'reg-koulikoro' },
  { id: 'cer-banamba', nom: 'Cercle de Banamba', code: 'CER-BNB', regionId: 'reg-koulikoro' },
  { id: 'cer-kangaba', nom: 'Cercle de Kangaba', code: 'CER-KGB', regionId: 'reg-koulikoro' },
  { id: 'cer-kati', nom: 'Cercle de Kati', code: 'CER-KTI', regionId: 'reg-koulikoro' },
  { id: 'cer-kolokani', nom: 'Cercle de Kolokani', code: 'CER-KLN', regionId: 'reg-koulikoro' },

  /* Sikasso */
  { id: 'cer-sikasso', nom: 'Cercle de Sikasso', code: 'CER-SKS', regionId: 'reg-sikasso' },
  { id: 'cer-kadiolo', nom: 'Cercle de Kadiolo', code: 'CER-KDO', regionId: 'reg-sikasso' },
  { id: 'cer-kolondieba', nom: 'Cercle de Kolondiéba', code: 'CER-KDB', regionId: 'reg-sikasso' },
  { id: 'cer-yorosso', nom: 'Cercle de Yorosso', code: 'CER-YRS', regionId: 'reg-sikasso' },

  /* Ségou */
  { id: 'cer-segou', nom: 'Cercle de Ségou', code: 'CER-SGU', regionId: 'reg-segou' },
  { id: 'cer-baroueli', nom: 'Cercle de Baraouéli', code: 'CER-BRL', regionId: 'reg-segou' },
  { id: 'cer-bla', nom: 'Cercle de Bla', code: 'CER-BLA', regionId: 'reg-segou' },
  { id: 'cer-macina', nom: 'Cercle de Macina', code: 'CER-MCN', regionId: 'reg-segou' },
  { id: 'cer-niono', nom: 'Cercle de Niono', code: 'CER-NNO', regionId: 'reg-segou' },
  { id: 'cer-tominian', nom: 'Cercle de Tominian', code: 'CER-TMN', regionId: 'reg-segou' },

  /* Mopti */
  { id: 'cer-mopti', nom: 'Cercle de Mopti', code: 'CER-MPT', regionId: 'reg-mopti' },
  { id: 'cer-djenne', nom: 'Cercle de Djenné', code: 'CER-DJN', regionId: 'reg-mopti' },
  { id: 'cer-tenenkou', nom: 'Cercle de Ténenkou', code: 'CER-TNK', regionId: 'reg-mopti' },
  { id: 'cer-youwarou', nom: 'Cercle de Youwarou', code: 'CER-YWR', regionId: 'reg-mopti' },

  /* Tombouctou */
  { id: 'cer-tombouctou', nom: 'Cercle de Tombouctou', code: 'CER-TBT', regionId: 'reg-tombouctou' },
  { id: 'cer-dire', nom: 'Cercle de Diré', code: 'CER-DRE', regionId: 'reg-tombouctou' },
  { id: 'cer-goundam', nom: 'Cercle de Goundam', code: 'CER-GDM', regionId: 'reg-tombouctou' },
  { id: 'cer-niafunke', nom: 'Cercle de Niafunké', code: 'CER-NFK', regionId: 'reg-tombouctou' },

  /* Gao */
  { id: 'cer-gao', nom: 'Cercle de Gao', code: 'CER-GAO', regionId: 'reg-gao' },
  { id: 'cer-ansongo', nom: 'Cercle d\'Ansongo', code: 'CER-ANS', regionId: 'reg-gao' },
  { id: 'cer-bourem', nom: 'Cercle de Bourem', code: 'CER-BRM', regionId: 'reg-gao' },

  /* Kidal */
  { id: 'cer-kidal', nom: 'Cercle de Kidal', code: 'CER-KDL', regionId: 'reg-kidal' },
  { id: 'cer-abeibara', nom: 'Cercle d\'Abeïbara', code: 'CER-ABA', regionId: 'reg-kidal' },
  { id: 'cer-tessalit', nom: 'Cercle de Tessalit', code: 'CER-TSL', regionId: 'reg-kidal' },
  { id: 'cer-tin-essako', nom: 'Cercle de Tin-Essako', code: 'CER-TES', regionId: 'reg-kidal' },

  /* Taoudénit / Ménaka */
  { id: 'cer-taoudenit', nom: 'Cercle de Taoudénit', code: 'CER-TDN', regionId: 'reg-taoudenit' },
  { id: 'cer-menaka', nom: 'Cercle de Ménaka', code: 'CER-MNK', regionId: 'reg-menaka' },

  /* Nouvelles regions (chefs-lieux) */
  { id: 'cer-nioro', nom: 'Cercle de Nioro du Sahel', code: 'CER-NRO', regionId: 'reg-nioro' },
  { id: 'cer-kita', nom: 'Cercle de Kita', code: 'CER-KTA', regionId: 'reg-kita' },
  { id: 'cer-dioila', nom: 'Cercle de Dioïla', code: 'CER-DIL', regionId: 'reg-dioila' },
  { id: 'cer-nara', nom: 'Cercle de Nara', code: 'CER-NRA', regionId: 'reg-nara' },
  { id: 'cer-bougouni', nom: 'Cercle de Bougouni', code: 'CER-BGN', regionId: 'reg-bougouni' },
  { id: 'cer-koutiala', nom: 'Cercle de Koutiala', code: 'CER-KTL', regionId: 'reg-koutiala' },
  { id: 'cer-san', nom: 'Cercle de San', code: 'CER-SAN', regionId: 'reg-san' },
  { id: 'cer-bandiagara', nom: 'Cercle de Bandiagara', code: 'CER-BDG', regionId: 'reg-bandiagara' },
  { id: 'cer-douentza', nom: 'Cercle de Douentza', code: 'CER-DZA', regionId: 'reg-douentza' },
];

export const mockCommunes: MockCommune[] = [
  /* Bamako — 6 communes urbaines */
  { id: 'com-bamako-1', nom: 'Commune I', code: 'BKO-C1', cercleId: 'cer-bamako' },
  { id: 'com-bamako-2', nom: 'Commune II', code: 'BKO-C2', cercleId: 'cer-bamako' },
  { id: 'com-bamako-3', nom: 'Commune III', code: 'BKO-C3', cercleId: 'cer-bamako' },
  { id: 'com-bamako-4', nom: 'Commune IV', code: 'BKO-C4', cercleId: 'cer-bamako' },
  { id: 'com-bamako-5', nom: 'Commune V', code: 'BKO-C5', cercleId: 'cer-bamako' },
  { id: 'com-bamako-6', nom: 'Commune VI', code: 'BKO-C6', cercleId: 'cer-bamako' },

  /* Kayes — quelques communes */
  { id: 'com-kayes', nom: 'Kayes (urbain)', code: 'KYS-C1', cercleId: 'cer-kayes' },
  { id: 'com-liberte-dembaya', nom: 'Liberté-Dembaya', code: 'KYS-C2', cercleId: 'cer-kayes' },
  { id: 'com-kenieba', nom: 'Kéniéba', code: 'KNB-C1', cercleId: 'cer-kenieba' },

  /* Koulikoro */
  { id: 'com-koulikoro', nom: 'Koulikoro', code: 'KLK-C1', cercleId: 'cer-koulikoro' },
  { id: 'com-kati', nom: 'Kati', code: 'KTI-C1', cercleId: 'cer-kati' },
  { id: 'com-baguineda', nom: 'Baguinéda-Camp', code: 'KTI-C2', cercleId: 'cer-kati' },
  { id: 'com-kalabancoro', nom: 'Kalabancoro', code: 'KTI-C3', cercleId: 'cer-kati' },
  { id: 'com-mande', nom: 'Mandé', code: 'KTI-C4', cercleId: 'cer-kati' },

  /* Sikasso */
  { id: 'com-sikasso', nom: 'Sikasso (urbain)', code: 'SKS-C1', cercleId: 'cer-sikasso' },
  { id: 'com-kadiolo', nom: 'Kadiolo', code: 'KDO-C1', cercleId: 'cer-kadiolo' },

  /* Ségou */
  { id: 'com-segou', nom: 'Ségou', code: 'SGU-C1', cercleId: 'cer-segou' },
  { id: 'com-pelengana', nom: 'Pelengana', code: 'SGU-C2', cercleId: 'cer-segou' },
  { id: 'com-niono', nom: 'Niono', code: 'NNO-C1', cercleId: 'cer-niono' },
  { id: 'com-macina', nom: 'Macina', code: 'MCN-C1', cercleId: 'cer-macina' },

  /* Mopti */
  { id: 'com-mopti', nom: 'Mopti', code: 'MPT-C1', cercleId: 'cer-mopti' },
  { id: 'com-sevare', nom: 'Sévaré', code: 'MPT-C2', cercleId: 'cer-mopti' },
  { id: 'com-djenne', nom: 'Djenné', code: 'DJN-C1', cercleId: 'cer-djenne' },

  /* Tombouctou / Gao / Kidal */
  { id: 'com-tombouctou', nom: 'Tombouctou', code: 'TBT-C1', cercleId: 'cer-tombouctou' },
  { id: 'com-gao', nom: 'Gao', code: 'GAO-C1', cercleId: 'cer-gao' },
  { id: 'com-kidal', nom: 'Kidal', code: 'KDL-C1', cercleId: 'cer-kidal' },

  /* Nouvelles regions — chefs-lieux */
  { id: 'com-nioro', nom: 'Nioro du Sahel', code: 'NRO-C1', cercleId: 'cer-nioro' },
  { id: 'com-kita', nom: 'Kita', code: 'KTA-C1', cercleId: 'cer-kita' },
  { id: 'com-dioila', nom: 'Dioïla', code: 'DIL-C1', cercleId: 'cer-dioila' },
  { id: 'com-nara', nom: 'Nara', code: 'NRA-C1', cercleId: 'cer-nara' },
  { id: 'com-bougouni', nom: 'Bougouni', code: 'BGN-C1', cercleId: 'cer-bougouni' },
  { id: 'com-koutiala', nom: 'Koutiala', code: 'KTL-C1', cercleId: 'cer-koutiala' },
  { id: 'com-san', nom: 'San', code: 'SAN-C1', cercleId: 'cer-san' },
  { id: 'com-bandiagara', nom: 'Bandiagara', code: 'BDG-C1', cercleId: 'cer-bandiagara' },
  { id: 'com-douentza', nom: 'Douentza', code: 'DZA-C1', cercleId: 'cer-douentza' },
];

/* Quartiers — selection representative par commune (Bamako + chefs-lieux). */
export const mockQuartiers: MockQuartier[] = [
  /* Bamako Commune I */
  { id: 'qua-banconi', nom: 'Banconi', code: 'Q-BCN', communeId: 'com-bamako-1' },
  { id: 'qua-djelibougou', nom: 'Djélibougou', code: 'Q-DJB', communeId: 'com-bamako-1' },
  { id: 'qua-boulkassoumbougou', nom: 'Boulkassoumbougou', code: 'Q-BLK', communeId: 'com-bamako-1' },
  { id: 'qua-korofina-nord', nom: 'Korofina Nord', code: 'Q-KFN', communeId: 'com-bamako-1' },
  /* Commune II */
  { id: 'qua-missira', nom: 'Missira', code: 'Q-MSR', communeId: 'com-bamako-2' },
  { id: 'qua-niarela', nom: 'Niaréla', code: 'Q-NRL', communeId: 'com-bamako-2' },
  { id: 'qua-bagadadji', nom: 'Bagadadji', code: 'Q-BGD', communeId: 'com-bamako-2' },
  { id: 'qua-medina-coura', nom: 'Médina-Coura', code: 'Q-MDC', communeId: 'com-bamako-2' },
  /* Commune III */
  { id: 'qua-bamako-coura', nom: 'Bamako-Coura', code: 'Q-BKC', communeId: 'com-bamako-3' },
  { id: 'qua-darsalam', nom: 'Darsalam', code: 'Q-DRS', communeId: 'com-bamako-3' },
  { id: 'qua-dravela', nom: 'Dravela', code: 'Q-DRV', communeId: 'com-bamako-3' },
  { id: 'qua-koulouba', nom: 'Koulouba', code: 'Q-KLB', communeId: 'com-bamako-3' },
  /* Commune IV */
  { id: 'qua-djicoroni-para', nom: 'Djicoroni Para', code: 'Q-DJP', communeId: 'com-bamako-4' },
  { id: 'qua-lafiabougou', nom: 'Lafiabougou', code: 'Q-LFB', communeId: 'com-bamako-4' },
  { id: 'qua-hamdallaye', nom: 'Hamdallaye', code: 'Q-HMD', communeId: 'com-bamako-4' },
  { id: 'qua-sebenikoro', nom: 'Sébénikoro', code: 'Q-SBN', communeId: 'com-bamako-4' },
  /* Commune V */
  { id: 'qua-badalabougou', nom: 'Badalabougou', code: 'Q-BDL', communeId: 'com-bamako-5' },
  { id: 'qua-quartier-mali', nom: 'Quartier Mali', code: 'Q-QML', communeId: 'com-bamako-5' },
  { id: 'qua-torokorobougou', nom: 'Torokorobougou', code: 'Q-TKB', communeId: 'com-bamako-5' },
  { id: 'qua-sabalibougou', nom: 'Sabalibougou', code: 'Q-SBB', communeId: 'com-bamako-5' },
  /* Commune VI */
  { id: 'qua-magnambougou', nom: 'Magnambougou', code: 'Q-MGB', communeId: 'com-bamako-6' },
  { id: 'qua-faladie', nom: 'Faladié', code: 'Q-FLD', communeId: 'com-bamako-6' },
  { id: 'qua-niamakoro', nom: 'Niamakoro', code: 'Q-NMK', communeId: 'com-bamako-6' },
  { id: 'qua-yirimadio', nom: 'Yirimadio', code: 'Q-YRM', communeId: 'com-bamako-6' },
  { id: 'qua-sogoniko', nom: 'Sogoniko', code: 'Q-SGK', communeId: 'com-bamako-6' },

  /* Kati */
  { id: 'qua-kati-koko', nom: 'Kati Koko', code: 'Q-KKK', communeId: 'com-kati' },
  { id: 'qua-kati-malibougou', nom: 'Malibougou', code: 'Q-KMB', communeId: 'com-kati' },

  /* Kalabancoro */
  { id: 'qua-kalaban-coura', nom: 'Kalaban-Coura', code: 'Q-KBC', communeId: 'com-kalabancoro' },
  { id: 'qua-kabala', nom: 'Kabala', code: 'Q-KBL', communeId: 'com-kalabancoro' },

  /* Ségou */
  { id: 'qua-segou-coura', nom: 'Ségou-Coura', code: 'Q-SGC', communeId: 'com-segou' },
  { id: 'qua-bougoufie', nom: 'Bougoufié', code: 'Q-BGF', communeId: 'com-segou' },
  { id: 'qua-mission', nom: 'Mission', code: 'Q-MSN', communeId: 'com-segou' },

  /* Mopti / Sévaré */
  { id: 'qua-komoguel', nom: 'Komoguel', code: 'Q-KMG', communeId: 'com-mopti' },
  { id: 'qua-medina', nom: 'Médina', code: 'Q-MDN', communeId: 'com-mopti' },
  { id: 'qua-sevare-secteur', nom: 'Sévaré-Secteur', code: 'Q-SVS', communeId: 'com-sevare' },

  /* Sikasso */
  { id: 'qua-wayerma', nom: 'Wayerma', code: 'Q-WYM', communeId: 'com-sikasso' },
  { id: 'qua-hamdallaye-sks', nom: 'Hamdallaye', code: 'Q-HMS', communeId: 'com-sikasso' },

  /* Kayes */
  { id: 'qua-kayes-ndi', nom: 'Kayes N\'Di', code: 'Q-KND', communeId: 'com-kayes' },
  { id: 'qua-plateau', nom: 'Plateau', code: 'Q-PLT', communeId: 'com-kayes' },
];
