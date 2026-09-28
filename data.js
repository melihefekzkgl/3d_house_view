export const PROJE_AYARLARI = {
    varsayilanDil: "en",
    baslik: {
        en: "Residential Design",
        tr: "Konut Tasarımı"
    },
    toplamAlan: {
        en: "52.2 m² (Net)",
        tr: "52.2 m² (Net)"
    },
    modelYolu: "./ev.glb",
    hdrYolu: "./ortam.hdr",
    fpsBoyYuksekligi: 2.80,
    maxBoyYuksekligi: 4.50,
    orbitFov: 50,
    fpsFov: 70,
    maxTextureBoyutu: 1024
};

export const DUVAR_ISIMLERI = ["wall", "duvar"];

export const ISIK_AYARLARI = {
    parlaklikExposure: 0.75,
    hdrYansimaGucu: 0.45,
    gunesIsigi: 0.90,
    ortamIsigi: 0.35,
    golgelerAktif: true
};

export const KAPI_ACILMA_ACILARI = {
    "bed_door": 90,
    "ext_door": 90,
    "ext_door2": 90,
    "living_door": 90,
    "main_door": 90,
    "toilet_door": 90
};

export const ODA_VERILERI = {
    "Ground.014": {
        ad: { en: "Apartment 10", tr: "Daire 10" },
        metrekare: "52.2 m²",
        uzunluklar: "-",
        yukseklik: "2.80m",
        zemin: { en: "Laminate Parquet", tr: "Laminat Parke" },
        not: { en: "Apartment 10 main living area.", tr: "Daire 10 genel yaşam alanı." }
    },
    "Ground.001": {
        ad: { en: "Living Room", tr: "Salon & Yaşam Alanı" },
        metrekare: "34.0 m²",
        uzunluklar: "6.00m × 5.65m",
        yukseklik: "2.80m",
        zemin: { en: "Natural Oak Parquet", tr: "Doğal Meşe Parke" },
        not: { en: "South-facing wide window opening and open kitchen connection.", tr: "Güney cephe geniş pencere açıklığı ve açık mutfak bağlantısı." }
    },
    "Ground.002": {
        ad: { en: "Kitchen", tr: "Mutfak" },
        metrekare: "16.5 m²",
        uzunluklar: "5.50m × 3.00m",
        yukseklik: "2.80m",
        zemin: { en: "60×120 Matte Ceramic", tr: "60×120 Mat Seramik" },
        not: { en: "Plumbing infrastructure suitable for island layout.", tr: "Ada tezgah yerleşimine uygun tesisat altyapısı." }
    },
    "Ground.003": {
        ad: { en: "Master Bedroom", tr: "Ebeveyn Yatak Odası" },
        metrekare: "24.0 m²",
        uzunluklar: "6.00m × 4.00m",
        yukseklik: "2.80m",
        zemin: { en: "Light Walnut Laminate", tr: "Açık Ceviz Laminat" },
        not: { en: "Built-in wardrobe niche and east-facing morning sun.", tr: "Gömme dolap nişi ve doğu cephe sabah güneşi." }
    }
};

export const MATERYAL_SECENEKLERI = [
    {
        id: "mese_parke",
        ad: { en: "Light Oak", tr: "Açık Meşe" },
        renk: "#b08968",
        textureUrl: "./assets/textures/parke_acik.jpg",
        repeat: 4,
        roughness: 0.4
    },
    {
        id: "koyu_ceviz",
        ad: { en: "Dark Walnut", tr: "Koyu Ceviz" },
        renk: "#4a3525",
        textureUrl: "./assets/textures/parke_koyu.jpg",
        repeat: 4,
        roughness: 0.35
    },
    {
        id: "mermer_seramik",
        ad: { en: "Marble", tr: "Mermer" },
        renk: "#e2e8f0",
        textureUrl: "./assets/textures/seramik_mermer.jpg",
        repeat: 3,
        roughness: 0.15
    },
    {
        id: "antrasit_beton",
        ad: { en: "Anthracite", tr: "Antrasit" },
        renk: "#3b4252",
        textureUrl: "",
        repeat: 2,
        roughness: 0.6
    }
];
