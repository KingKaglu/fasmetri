import { CategoryView, ProductView, ShopView } from "@/lib/catalog-types";

export const generatedCategoryFixtures = [
  {
    "id": "cmph6gkn30006o0dt3ndubccm",
    "slug": "audio",
    "nameKa": "áƒáƒ£áƒ“áƒ˜áƒ",
    "nameEn": "Audio",
    "productCount": 1,
    "dealCount": 0
  },
  {
    "id": "cmph6gkn00003o0dts1xzuj0f",
    "slug": "laptops",
    "nameKa": "áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ”áƒ‘áƒ˜",
    "nameEn": "Laptops",
    "productCount": 1,
    "dealCount": 0
  },
  {
    "id": "cmpfywl1o0001tkdtdtlwoksz",
    "slug": "mobiles",
    "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
    "nameEn": "Mobiles",
    "productCount": 33,
    "dealCount": 10
  },
  {
    "id": "cmpl1q7z6000ofcdtdfdk65nx",
    "slug": "tablets",
    "nameKa": "áƒ¢áƒáƒ‘áƒšáƒ”áƒ¢áƒ”áƒ‘áƒ˜",
    "nameEn": "Tablets",
    "productCount": 1,
    "dealCount": 0
  }
] satisfies CategoryView[];

export const generatedShopFixtures = [
  {
    "id": "cmpfywl27000dtkdtazz6h0ln",
    "slug": "alta",
    "name": "Alta",
    "baseUrl": "https://alta.ge",
    "logoUrl": null,
    "enabled": false,
    "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
    "needsConfiguration": true,
    "lastScrapedAt": "2026-05-21T20:53:26.174Z",
    "lastIngestedAt": null,
    "ingestionStatus": "NOT_STARTED",
    "createdAt": "2026-05-21T20:53:08.383Z",
    "updatedAt": "2026-05-22T17:29:40.436Z",
    "productCount": 0,
    "dealCount": 0
  },
  {
    "id": "cmpfywl2c000ftkdt3lcar8z4",
    "slug": "ee",
    "name": "Elite Electronics",
    "baseUrl": "https://ee.ge",
    "logoUrl": null,
    "enabled": true,
    "reliabilityLabel": null,
    "needsConfiguration": false,
    "lastScrapedAt": "2026-05-22T14:10:39.823Z",
    "lastIngestedAt": null,
    "ingestionStatus": "NOT_STARTED",
    "createdAt": "2026-05-21T20:53:08.388Z",
    "updatedAt": "2026-05-22T17:29:40.439Z",
    "productCount": 0,
    "dealCount": 0
  },
  {
    "id": "cmpfywl2g000htkdtr8o2ty0g",
    "slug": "extra",
    "name": "Extra",
    "baseUrl": "https://extra.ge",
    "logoUrl": null,
    "enabled": true,
    "reliabilityLabel": null,
    "needsConfiguration": false,
    "lastScrapedAt": "2026-05-22T14:14:11.307Z",
    "lastIngestedAt": null,
    "ingestionStatus": "NOT_STARTED",
    "createdAt": "2026-05-21T20:53:08.392Z",
    "updatedAt": "2026-05-22T17:29:40.441Z",
    "productCount": 0,
    "dealCount": 0
  },
  {
    "id": "cmpfywl2i000itkdtd31yavom",
    "slug": "pcshop",
    "name": "PCShop",
    "baseUrl": "https://pcshop.ge",
    "logoUrl": null,
    "enabled": true,
    "reliabilityLabel": null,
    "needsConfiguration": false,
    "lastScrapedAt": "2026-05-22T13:48:22.695Z",
    "lastIngestedAt": null,
    "ingestionStatus": "NOT_STARTED",
    "createdAt": "2026-05-21T20:53:08.394Z",
    "updatedAt": "2026-05-22T17:29:40.442Z",
    "productCount": 0,
    "dealCount": 0
  },
  {
    "id": "cmpfywl2e000gtkdtklwfrwn1",
    "slug": "veli",
    "name": "Veli",
    "baseUrl": "https://veli.store",
    "logoUrl": null,
    "enabled": false,
    "reliabilityLabel": null,
    "needsConfiguration": true,
    "lastScrapedAt": null,
    "lastIngestedAt": null,
    "ingestionStatus": "NOT_STARTED",
    "createdAt": "2026-05-21T20:53:08.390Z",
    "updatedAt": "2026-05-22T17:29:40.440Z",
    "productCount": 0,
    "dealCount": 0
  },
  {
    "id": "cmpfywl29000etkdt5s1743hq",
    "slug": "zoommer",
    "name": "Zoommer",
    "baseUrl": "https://zoommer.ge",
    "logoUrl": null,
    "enabled": true,
    "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
    "needsConfiguration": false,
    "lastScrapedAt": "2026-05-25T11:12:10.138Z",
    "lastIngestedAt": "2026-05-25T11:12:10.138Z",
    "ingestionStatus": "SUCCESS",
    "createdAt": "2026-05-21T20:53:08.385Z",
    "updatedAt": "2026-05-25T11:12:10.144Z",
    "productCount": 36,
    "dealCount": 10
  }
] as unknown as ShopView[];

export const generatedProductFixtures = [
  {
    "id": "cmpl2fz8a000vk8dtfnzdsfbu",
    "slug": "samsung-galaxy-a57-a576bd-5g-8-128gb-grey-dd8b3b9f",
    "name": "Samsung Galaxy A57 A576BD 5G 8/128GB Grey",
    "canonicalKey": "samsung|galaxy_a57|8gb|128gb|gray",
    "productIdentity": {
      "ram": "8gb",
      "sku": "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-grey-p52507",
      "brand": "samsung",
      "color": "gray",
      "model": "galaxy_a57",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "samsung",
        "color": "gray",
        "storage": [
          "128gb"
        ],
        "skuCodes": [
          "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-grey-p52507"
        ],
        "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey",
        "modelCodes": [
          "8/128gb",
          "a576bd",
          "mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-grey-p52507"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "a57",
          "a576bd",
          "5g",
          "128gb",
          "grey"
        ],
        "modelFamily": "galaxy_a57",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey"
      },
      "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_a57|8gb|128gb|gray",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey",
      "canonicalParentKey": "samsung|galaxy_a57|8gb|128gb",
      "canonicalVariantKey": "samsung|galaxy_a57|8gb|128gb|gray"
    },
    "brand": "samsung",
    "model": "galaxy_a57",
    "imageUrl": "https://s3.zoommer.ge/site/463e25c1-5a4b-48b1-8ac5-b3bd73ab47b0_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.080Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fz8i000wk8dtkpyn7pxu",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-grey-p52507",
        "title": "Samsung Galaxy A57 A576BD 5G 8/128GB Grey",
        "canonicalKey": "samsung|galaxy_a57|8gb|128gb|gray",
        "productIdentity": {
          "ram": "8gb",
          "sku": "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-grey-p52507",
          "brand": "samsung",
          "color": "gray",
          "model": "galaxy_a57",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "samsung",
            "color": "gray",
            "storage": [
              "128gb"
            ],
            "skuCodes": [
              "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-grey-p52507"
            ],
            "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey",
            "modelCodes": [
              "8/128gb",
              "a576bd",
              "mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-grey-p52507"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "a57",
              "a576bd",
              "5g",
              "128gb",
              "grey"
            ],
            "modelFamily": "galaxy_a57",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey"
          },
          "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_a57|8gb|128gb|gray",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb grey",
          "canonicalParentKey": "samsung|galaxy_a57|8gb|128gb",
          "canonicalVariantKey": "samsung|galaxy_a57|8gb|128gb|gray"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1199,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/463e25c1-5a4b-48b1-8ac5-b3bd73ab47b0_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.850Z"
      }
    ]
  },
  {
    "id": "cmpl2fz6y000lk8dt5ju1h9uf",
    "slug": "samsung-galaxy-a37-a376ed-5g-8-128gb-black-756ad9bc",
    "name": "Samsung Galaxy A37 A376ED 5G 8/128GB Black",
    "canonicalKey": "samsung|galaxy_a37|8gb|128gb|black",
    "productIdentity": {
      "ram": "8gb",
      "sku": "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-black-p52516",
      "brand": "samsung",
      "color": "black",
      "model": "galaxy_a37",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "samsung",
        "color": "black",
        "storage": [
          "128gb"
        ],
        "skuCodes": [
          "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-black-p52516"
        ],
        "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb black",
        "modelCodes": [
          "8/128gb",
          "a376ed",
          "mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-black-p52516"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "a37",
          "a376ed",
          "5g",
          "128gb"
        ],
        "modelFamily": "galaxy_a37",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb black"
      },
      "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_a37|8gb|128gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb black",
      "canonicalParentKey": "samsung|galaxy_a37|8gb|128gb",
      "canonicalVariantKey": "samsung|galaxy_a37|8gb|128gb|black"
    },
    "brand": "samsung",
    "model": "galaxy_a37",
    "imageUrl": "https://s3.zoommer.ge/site/4d034deb-f8cc-4c60-99f8-416896b4b4c3_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.041Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fz71000mk8dtmdtifysg",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-black-p52516",
        "title": "Samsung Galaxy A37 A376ED 5G 8/128GB Black",
        "canonicalKey": "samsung|galaxy_a37|8gb|128gb|black",
        "productIdentity": {
          "ram": "8gb",
          "sku": "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-black-p52516",
          "brand": "samsung",
          "color": "black",
          "model": "galaxy_a37",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "samsung",
            "color": "black",
            "storage": [
              "128gb"
            ],
            "skuCodes": [
              "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-black-p52516"
            ],
            "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb black",
            "modelCodes": [
              "8/128gb",
              "a376ed",
              "mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-black-p52516"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "a37",
              "a376ed",
              "5g",
              "128gb"
            ],
            "modelFamily": "galaxy_a37",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb black"
          },
          "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_a37|8gb|128gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb black",
          "canonicalParentKey": "samsung|galaxy_a37|8gb|128gb",
          "canonicalVariantKey": "samsung|galaxy_a37|8gb|128gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 999,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/4d034deb-f8cc-4c60-99f8-416896b4b4c3_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.816Z"
      }
    ]
  },
  {
    "id": "cmpl2fza20015k8dtxy9s7u2o",
    "slug": "samsung-galaxy-s26-ultra-s948-5g-12-256gb-cobalt-violet-381c3424",
    "name": "Samsung Galaxy S26 Ultra S948 5G 12/256GB Cobalt Violet",
    "canonicalKey": "samsung|galaxy_s26_ultra|12gb|256gb",
    "productIdentity": {
      "ram": "12gb",
      "sku": "12_256gb",
      "brand": "samsung",
      "model": "galaxy_s26_ultra",
      "storage": "256gb",
      "variant": "ultra",
      "modelCode": "12/256gb",
      "attributes": {
        "ram": [
          "12gb"
        ],
        "brand": "samsung",
        "storage": [
          "256gb"
        ],
        "variant": "ultra",
        "skuCodes": [
          "12_256gb",
          "mobiluri-telefonebi_samsung-galaxy-s26-ultra-s948-5g-12-256gb-cobalt-violet-p52094"
        ],
        "cleanTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet",
        "modelCodes": [
          "12/256gb",
          "mobiluri-telefonebi/samsung-galaxy-s26-ultra-s948-5g-12-256gb-cobalt-violet-p52094"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "s26",
          "ultra",
          "s948",
          "5g",
          "12",
          "256gb",
          "cobalt",
          "violet"
        ],
        "modelFamily": "galaxy_s26_ultra",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet"
      },
      "cleanTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_s26_ultra|12gb|256gb",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet",
      "canonicalParentKey": "samsung|galaxy_s26_ultra|12gb|256gb",
      "canonicalVariantKey": "samsung|galaxy_s26_ultra|12gb|256gb"
    },
    "brand": "samsung",
    "model": "galaxy_s26_ultra",
    "imageUrl": "https://s3.zoommer.ge/site/b595d66d-42df-4c4e-afb8-a9dbb9033c42_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.117Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fzaf0016k8dtjc1uo29n",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-s26-ultra-s948-5g-12-256gb-cobalt-violet-p52094",
        "title": "Samsung Galaxy S26 Ultra S948 5G 12/256GB Cobalt Violet",
        "canonicalKey": "samsung|galaxy_s26_ultra|12gb|256gb",
        "productIdentity": {
          "ram": "12gb",
          "sku": "12_256gb",
          "brand": "samsung",
          "model": "galaxy_s26_ultra",
          "storage": "256gb",
          "variant": "ultra",
          "modelCode": "12/256gb",
          "attributes": {
            "ram": [
              "12gb"
            ],
            "brand": "samsung",
            "storage": [
              "256gb"
            ],
            "variant": "ultra",
            "skuCodes": [
              "12_256gb",
              "mobiluri-telefonebi_samsung-galaxy-s26-ultra-s948-5g-12-256gb-cobalt-violet-p52094"
            ],
            "cleanTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet",
            "modelCodes": [
              "12/256gb",
              "mobiluri-telefonebi/samsung-galaxy-s26-ultra-s948-5g-12-256gb-cobalt-violet-p52094"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "s26",
              "ultra",
              "s948",
              "5g",
              "12",
              "256gb",
              "cobalt",
              "violet"
            ],
            "modelFamily": "galaxy_s26_ultra",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet"
          },
          "cleanTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_s26_ultra|12gb|256gb",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy s26 ultra s948 5g 12/256gb cobalt violet",
          "canonicalParentKey": "samsung|galaxy_s26_ultra|12gb|256gb",
          "canonicalVariantKey": "samsung|galaxy_s26_ultra|12gb|256gb"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 3399,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/b595d66d-42df-4c4e-afb8-a9dbb9033c42_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.871Z"
      }
    ]
  },
  {
    "id": "cmpl2fz7m000qk8dtc9dczjir",
    "slug": "samsung-galaxy-a57-a576bd-5g-8-128gb-violet-41e30322",
    "name": "Samsung Galaxy A57 A576BD 5G 8/128GB Violet",
    "canonicalKey": "samsung|galaxy_a57|8gb|128gb",
    "productIdentity": {
      "ram": "8gb",
      "sku": "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-violet-p52509",
      "brand": "samsung",
      "model": "galaxy_a57",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "samsung",
        "storage": [
          "128gb"
        ],
        "skuCodes": [
          "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-violet-p52509"
        ],
        "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet",
        "modelCodes": [
          "8/128gb",
          "a576bd",
          "mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-violet-p52509"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "a57",
          "a576bd",
          "5g",
          "128gb",
          "violet"
        ],
        "modelFamily": "galaxy_a57",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet"
      },
      "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_a57|8gb|128gb",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet",
      "canonicalParentKey": "samsung|galaxy_a57|8gb|128gb",
      "canonicalVariantKey": "samsung|galaxy_a57|8gb|128gb"
    },
    "brand": "samsung",
    "model": "galaxy_a57",
    "imageUrl": "https://s3.zoommer.ge/site/8c6a8358-2ca3-44e8-a34b-b0ec2314b462_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.059Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fz7r000rk8dtizcbcj8w",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-violet-p52509",
        "title": "Samsung Galaxy A57 A576BD 5G 8/128GB Violet",
        "canonicalKey": "samsung|galaxy_a57|8gb|128gb",
        "productIdentity": {
          "ram": "8gb",
          "sku": "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-violet-p52509",
          "brand": "samsung",
          "model": "galaxy_a57",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "samsung",
            "storage": [
              "128gb"
            ],
            "skuCodes": [
              "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-violet-p52509"
            ],
            "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet",
            "modelCodes": [
              "8/128gb",
              "a576bd",
              "mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-violet-p52509"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "a57",
              "a576bd",
              "5g",
              "128gb",
              "violet"
            ],
            "modelFamily": "galaxy_a57",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet"
          },
          "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_a57|8gb|128gb",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb violet",
          "canonicalParentKey": "samsung|galaxy_a57|8gb|128gb",
          "canonicalVariantKey": "samsung|galaxy_a57|8gb|128gb"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1199,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/8c6a8358-2ca3-44e8-a34b-b0ec2314b462_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.836Z"
      }
    ]
  },
  {
    "id": "cmpl2fz4a000bk8dtnaemi6rv",
    "slug": "samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-8bfa8c6c",
    "name": "Samsung Galaxy A37 A376ED 5G 8/128GB Light Violet",
    "canonicalKey": "samsung|galaxy_a37|8gb|128gb",
    "productIdentity": {
      "ram": "8gb",
      "sku": "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-p52518",
      "brand": "samsung",
      "model": "galaxy_a37",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "samsung",
        "storage": [
          "128gb"
        ],
        "skuCodes": [
          "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-p52518"
        ],
        "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet",
        "modelCodes": [
          "8/128gb",
          "a376ed",
          "mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-p52518"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "a37",
          "a376ed",
          "5g",
          "128gb",
          "light",
          "violet"
        ],
        "modelFamily": "galaxy_a37",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet"
      },
      "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_a37|8gb|128gb",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet",
      "canonicalParentKey": "samsung|galaxy_a37|8gb|128gb",
      "canonicalVariantKey": "samsung|galaxy_a37|8gb|128gb"
    },
    "brand": "samsung",
    "model": "galaxy_a37",
    "imageUrl": "https://s3.zoommer.ge/site/53554773-1760-4850-8be8-66df763b4075_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.003Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fz4k000ck8dtvkvh8nft",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-p52518",
        "title": "Samsung Galaxy A37 A376ED 5G 8/128GB Light Violet",
        "canonicalKey": "samsung|galaxy_a37|8gb|128gb",
        "productIdentity": {
          "ram": "8gb",
          "sku": "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-p52518",
          "brand": "samsung",
          "model": "galaxy_a37",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "samsung",
            "storage": [
              "128gb"
            ],
            "skuCodes": [
              "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-p52518"
            ],
            "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet",
            "modelCodes": [
              "8/128gb",
              "a376ed",
              "mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-light-violet-p52518"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "a37",
              "a376ed",
              "5g",
              "128gb",
              "light",
              "violet"
            ],
            "modelFamily": "galaxy_a37",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet"
          },
          "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_a37|8gb|128gb",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb light violet",
          "canonicalParentKey": "samsung|galaxy_a37|8gb|128gb",
          "canonicalVariantKey": "samsung|galaxy_a37|8gb|128gb"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 999,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/53554773-1760-4850-8be8-66df763b4075_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.787Z"
      }
    ]
  },
  {
    "id": "cmpl2fzeu001uk8dtb731ka14",
    "slug": "apple-iphone-17-pro-max-e-sim-only-256gb-silver-d1851def",
    "name": "Apple iPhone 17 Pro Max | 256GB Silver",
    "canonicalKey": "apple|iphone_17_pro_max|256gb|silver",
    "productIdentity": {
      "sku": "max-256gb-silver-p49659",
      "brand": "apple",
      "color": "silver",
      "model": "iphone_17_pro_max",
      "storage": "256gb",
      "variant": "pro_max",
      "modelCode": "max-256gb-silver-p49659",
      "attributes": {
        "ram": [],
        "brand": "apple",
        "color": "silver",
        "storage": [
          "256gb"
        ],
        "variant": "pro_max",
        "skuCodes": [
          "max-256gb-silver-p49659",
          "mobiluri-telefonebi_apple-iphone-17-pro"
        ],
        "cleanTitle": "apple iphone 17 pro max 256gb silver",
        "modelCodes": [
          "max-256gb-silver-p49659",
          "mobiluri-telefonebi/apple-iphone-17-pro"
        ],
        "typeTokens": [
          "apple",
          "iphone",
          "17",
          "pro",
          "max",
          "256gb",
          "silver"
        ],
        "modelFamily": "iphone_17_pro_max",
        "categorySlug": "mobiles",
        "normalizedTitle": "apple iphone 17 pro max 256gb silver"
      },
      "cleanTitle": "apple iphone 17 pro max 256gb silver",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "apple|iphone_17_pro_max|256gb|silver",
      "categorySlug": "mobiles",
      "normalizedTitle": "apple iphone 17 pro max 256gb silver",
      "canonicalParentKey": "apple|iphone_17_pro_max|256gb",
      "canonicalVariantKey": "apple|iphone_17_pro_max|256gb|silver"
    },
    "brand": "apple",
    "model": "iphone_17_pro_max",
    "imageUrl": "https://s3.zoommer.ge/site/c0297127-9d2f-4096-920a-c7c1fb257b75_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.309Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fzhy002ck8dtunmxqytk",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/apple-iphone-17-pro-max-256gb-silver-p49659",
        "title": "Apple iPhone 17 Pro Max | 256GB Silver",
        "canonicalKey": "apple|iphone_17_pro_max|256gb|silver",
        "productIdentity": {
          "sku": "max-256gb-silver-p49659",
          "brand": "apple",
          "color": "silver",
          "model": "iphone_17_pro_max",
          "storage": "256gb",
          "variant": "pro_max",
          "modelCode": "max-256gb-silver-p49659",
          "attributes": {
            "ram": [],
            "brand": "apple",
            "color": "silver",
            "storage": [
              "256gb"
            ],
            "variant": "pro_max",
            "skuCodes": [
              "max-256gb-silver-p49659",
              "mobiluri-telefonebi_apple-iphone-17-pro"
            ],
            "cleanTitle": "apple iphone 17 pro max 256gb silver",
            "modelCodes": [
              "max-256gb-silver-p49659",
              "mobiluri-telefonebi/apple-iphone-17-pro"
            ],
            "typeTokens": [
              "apple",
              "iphone",
              "17",
              "pro",
              "max",
              "256gb",
              "silver"
            ],
            "modelFamily": "iphone_17_pro_max",
            "categorySlug": "mobiles",
            "normalizedTitle": "apple iphone 17 pro max 256gb silver"
          },
          "cleanTitle": "apple iphone 17 pro max 256gb silver",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "apple|iphone_17_pro_max|256gb|silver",
          "categorySlug": "mobiles",
          "normalizedTitle": "apple iphone 17 pro max 256gb silver",
          "canonicalParentKey": "apple|iphone_17_pro_max|256gb",
          "canonicalVariantKey": "apple|iphone_17_pro_max|256gb|silver"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 4569,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/c0297127-9d2f-4096-920a-c7c1fb257b75_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.974Z"
      }
    ]
  },
  {
    "id": "cmpl2fzb8001ak8dtlk6e6c1z",
    "slug": "samsung-galaxy-s26-ultra-s948-5g-16-1tb-sky-blue-f45146d3",
    "name": "Samsung Galaxy S26 Ultra S948 5G 16/1TB Sky Blue",
    "canonicalKey": "samsung|galaxy_s26_ultra|1tb|blue",
    "productIdentity": {
      "sku": "16_1tb",
      "brand": "samsung",
      "color": "blue",
      "model": "galaxy_s26_ultra",
      "storage": "1tb",
      "variant": "ultra",
      "modelCode": "16/1tb",
      "attributes": {
        "ram": [],
        "brand": "samsung",
        "color": "blue",
        "storage": [
          "1tb"
        ],
        "variant": "ultra",
        "skuCodes": [
          "16_1tb",
          "mobiluri-telefonebi_samsung-galaxy-s26-ultra-s948-5g-16-1tb-sky-blue-p52101"
        ],
        "cleanTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue",
        "modelCodes": [
          "16/1tb",
          "mobiluri-telefonebi/samsung-galaxy-s26-ultra-s948-5g-16-1tb-sky-blue-p52101"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "s26",
          "ultra",
          "s948",
          "5g",
          "16",
          "1tb",
          "sky",
          "blue"
        ],
        "modelFamily": "galaxy_s26_ultra",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue"
      },
      "cleanTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_s26_ultra|1tb|blue",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue",
      "canonicalParentKey": "samsung|galaxy_s26_ultra|1tb",
      "canonicalVariantKey": "samsung|galaxy_s26_ultra|1tb|blue"
    },
    "brand": "samsung",
    "model": "galaxy_s26_ultra",
    "imageUrl": "https://s3.zoommer.ge/site/b8e1edba-4754-4e24-9497-68447d696b73_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.142Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fzbj001bk8dt5clgye9x",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-s26-ultra-s948-5g-16-1tb-sky-blue-p52101",
        "title": "Samsung Galaxy S26 Ultra S948 5G 16/1TB Sky Blue",
        "canonicalKey": "samsung|galaxy_s26_ultra|1tb|blue",
        "productIdentity": {
          "sku": "16_1tb",
          "brand": "samsung",
          "color": "blue",
          "model": "galaxy_s26_ultra",
          "storage": "1tb",
          "variant": "ultra",
          "modelCode": "16/1tb",
          "attributes": {
            "ram": [],
            "brand": "samsung",
            "color": "blue",
            "storage": [
              "1tb"
            ],
            "variant": "ultra",
            "skuCodes": [
              "16_1tb",
              "mobiluri-telefonebi_samsung-galaxy-s26-ultra-s948-5g-16-1tb-sky-blue-p52101"
            ],
            "cleanTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue",
            "modelCodes": [
              "16/1tb",
              "mobiluri-telefonebi/samsung-galaxy-s26-ultra-s948-5g-16-1tb-sky-blue-p52101"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "s26",
              "ultra",
              "s948",
              "5g",
              "16",
              "1tb",
              "sky",
              "blue"
            ],
            "modelFamily": "galaxy_s26_ultra",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue"
          },
          "cleanTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_s26_ultra|1tb|blue",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy s26 ultra s948 5g 16/1tb sky blue",
          "canonicalParentKey": "samsung|galaxy_s26_ultra|1tb",
          "canonicalVariantKey": "samsung|galaxy_s26_ultra|1tb|blue"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 4899,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/b8e1edba-4754-4e24-9497-68447d696b73_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.889Z"
      }
    ]
  },
  {
    "id": "cmpl2fz66000gk8dtebjkirix",
    "slug": "samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-2ef3f20a",
    "name": "Samsung Galaxy A37 A376ED 5G 8/128GB Dark Green",
    "canonicalKey": "samsung|galaxy_a37|8gb|128gb|green",
    "productIdentity": {
      "ram": "8gb",
      "sku": "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-p52517",
      "brand": "samsung",
      "color": "green",
      "model": "galaxy_a37",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "samsung",
        "color": "green",
        "storage": [
          "128gb"
        ],
        "skuCodes": [
          "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-p52517"
        ],
        "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green",
        "modelCodes": [
          "8/128gb",
          "a376ed",
          "mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-p52517"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "a37",
          "a376ed",
          "5g",
          "128gb",
          "dark",
          "green"
        ],
        "modelFamily": "galaxy_a37",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green"
      },
      "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_a37|8gb|128gb|green",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green",
      "canonicalParentKey": "samsung|galaxy_a37|8gb|128gb",
      "canonicalVariantKey": "samsung|galaxy_a37|8gb|128gb|green"
    },
    "brand": "samsung",
    "model": "galaxy_a37",
    "imageUrl": "https://s3.zoommer.ge/site/aac4fe62-fca5-469a-afc3-6682286a1ef6_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.022Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fz6b000hk8dtt3d0jcq4",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-p52517",
        "title": "Samsung Galaxy A37 A376ED 5G 8/128GB Dark Green",
        "canonicalKey": "samsung|galaxy_a37|8gb|128gb|green",
        "productIdentity": {
          "ram": "8gb",
          "sku": "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-p52517",
          "brand": "samsung",
          "color": "green",
          "model": "galaxy_a37",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "samsung",
            "color": "green",
            "storage": [
              "128gb"
            ],
            "skuCodes": [
              "mobiluri-telefonebi_samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-p52517"
            ],
            "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green",
            "modelCodes": [
              "8/128gb",
              "a376ed",
              "mobiluri-telefonebi/samsung-galaxy-a37-a376ed-5g-8-128gb-dark-green-p52517"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "a37",
              "a376ed",
              "5g",
              "128gb",
              "dark",
              "green"
            ],
            "modelFamily": "galaxy_a37",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green"
          },
          "cleanTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_a37|8gb|128gb|green",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy a37 a376ed 5g 8/128gb dark green",
          "canonicalParentKey": "samsung|galaxy_a37|8gb|128gb",
          "canonicalVariantKey": "samsung|galaxy_a37|8gb|128gb|green"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 999,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/aac4fe62-fca5-469a-afc3-6682286a1ef6_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.800Z"
      }
    ]
  },
  {
    "id": "cmpl2fzfh001zk8dt3kdxnsxx",
    "slug": "apple-iphone-17-pro-max-e-sim-only-256gb-deep-blue-c82c5949",
    "name": "Apple iPhone 17 Pro Max | 256GB Deep Blue",
    "canonicalKey": "apple|iphone_17_pro_max|256gb|blue",
    "productIdentity": {
      "sku": "max-256gb-deep-blue-p49660",
      "brand": "apple",
      "color": "blue",
      "model": "iphone_17_pro_max",
      "storage": "256gb",
      "variant": "pro_max",
      "modelCode": "max-256gb-deep-blue-p49660",
      "attributes": {
        "ram": [],
        "brand": "apple",
        "color": "blue",
        "storage": [
          "256gb"
        ],
        "variant": "pro_max",
        "skuCodes": [
          "max-256gb-deep-blue-p49660",
          "mobiluri-telefonebi_apple-iphone-17-pro"
        ],
        "cleanTitle": "apple iphone 17 pro max 256gb deep blue",
        "modelCodes": [
          "max-256gb-deep-blue-p49660",
          "mobiluri-telefonebi/apple-iphone-17-pro"
        ],
        "typeTokens": [
          "apple",
          "iphone",
          "17",
          "pro",
          "max",
          "256gb",
          "deep",
          "blue"
        ],
        "modelFamily": "iphone_17_pro_max",
        "categorySlug": "mobiles",
        "normalizedTitle": "apple iphone 17 pro max 256gb deep blue"
      },
      "cleanTitle": "apple iphone 17 pro max 256gb deep blue",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "apple|iphone_17_pro_max|256gb|blue",
      "categorySlug": "mobiles",
      "normalizedTitle": "apple iphone 17 pro max 256gb deep blue",
      "canonicalParentKey": "apple|iphone_17_pro_max|256gb",
      "canonicalVariantKey": "apple|iphone_17_pro_max|256gb|blue"
    },
    "brand": "apple",
    "model": "iphone_17_pro_max",
    "imageUrl": "https://s3.zoommer.ge/site/b0205c6a-db95-4342-b129-e7f75961de3c_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.288Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fzh40028k8dts9tuwwfq",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/apple-iphone-17-pro-max-256gb-deep-blue-p49660",
        "title": "Apple iPhone 17 Pro Max | 256GB Deep Blue",
        "canonicalKey": "apple|iphone_17_pro_max|256gb|blue",
        "productIdentity": {
          "sku": "max-256gb-deep-blue-p49660",
          "brand": "apple",
          "color": "blue",
          "model": "iphone_17_pro_max",
          "storage": "256gb",
          "variant": "pro_max",
          "modelCode": "max-256gb-deep-blue-p49660",
          "attributes": {
            "ram": [],
            "brand": "apple",
            "color": "blue",
            "storage": [
              "256gb"
            ],
            "variant": "pro_max",
            "skuCodes": [
              "max-256gb-deep-blue-p49660",
              "mobiluri-telefonebi_apple-iphone-17-pro"
            ],
            "cleanTitle": "apple iphone 17 pro max 256gb deep blue",
            "modelCodes": [
              "max-256gb-deep-blue-p49660",
              "mobiluri-telefonebi/apple-iphone-17-pro"
            ],
            "typeTokens": [
              "apple",
              "iphone",
              "17",
              "pro",
              "max",
              "256gb",
              "deep",
              "blue"
            ],
            "modelFamily": "iphone_17_pro_max",
            "categorySlug": "mobiles",
            "normalizedTitle": "apple iphone 17 pro max 256gb deep blue"
          },
          "cleanTitle": "apple iphone 17 pro max 256gb deep blue",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "apple|iphone_17_pro_max|256gb|blue",
          "categorySlug": "mobiles",
          "normalizedTitle": "apple iphone 17 pro max 256gb deep blue",
          "canonicalParentKey": "apple|iphone_17_pro_max|256gb",
          "canonicalVariantKey": "apple|iphone_17_pro_max|256gb|blue"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 4569,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/b0205c6a-db95-4342-b129-e7f75961de3c_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.965Z"
      }
    ]
  },
  {
    "id": "cmpl2fzd4001kk8dtlupxxsu1",
    "slug": "samsung-galaxy-s26-s942-5g-12-256gb-white-f1a21408",
    "name": "Samsung Galaxy S26 S942 5G 12/256GB White",
    "canonicalKey": "samsung|galaxy_s26|12gb|256gb|white",
    "productIdentity": {
      "ram": "12gb",
      "sku": "12_256gb",
      "brand": "samsung",
      "color": "white",
      "model": "galaxy_s26",
      "storage": "256gb",
      "modelCode": "12/256gb",
      "attributes": {
        "ram": [
          "12gb"
        ],
        "brand": "samsung",
        "color": "white",
        "storage": [
          "256gb"
        ],
        "skuCodes": [
          "12_256gb",
          "mobiluri-telefonebi_samsung-galaxy-s26-s942-5g-12-256gb-white-p52076"
        ],
        "cleanTitle": "samsung galaxy s26 s942 5g 12/256gb white",
        "modelCodes": [
          "12/256gb",
          "mobiluri-telefonebi/samsung-galaxy-s26-s942-5g-12-256gb-white-p52076"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "s26",
          "s942",
          "5g",
          "12",
          "256gb"
        ],
        "modelFamily": "galaxy_s26",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy s26 s942 5g 12/256gb white"
      },
      "cleanTitle": "samsung galaxy s26 s942 5g 12/256gb white",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_s26|12gb|256gb|white",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy s26 s942 5g 12/256gb white",
      "canonicalParentKey": "samsung|galaxy_s26|12gb|256gb",
      "canonicalVariantKey": "samsung|galaxy_s26|12gb|256gb|white"
    },
    "brand": "samsung",
    "model": "galaxy_s26",
    "imageUrl": "https://s3.zoommer.ge/site/ba0524bc-d491-4028-8909-922aba11bbe3_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.188Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fzda001lk8dtvclexeie",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-s26-s942-5g-12-256gb-white-p52076",
        "title": "Samsung Galaxy S26 S942 5G 12/256GB White",
        "canonicalKey": "samsung|galaxy_s26|12gb|256gb|white",
        "productIdentity": {
          "ram": "12gb",
          "sku": "12_256gb",
          "brand": "samsung",
          "color": "white",
          "model": "galaxy_s26",
          "storage": "256gb",
          "modelCode": "12/256gb",
          "attributes": {
            "ram": [
              "12gb"
            ],
            "brand": "samsung",
            "color": "white",
            "storage": [
              "256gb"
            ],
            "skuCodes": [
              "12_256gb",
              "mobiluri-telefonebi_samsung-galaxy-s26-s942-5g-12-256gb-white-p52076"
            ],
            "cleanTitle": "samsung galaxy s26 s942 5g 12/256gb white",
            "modelCodes": [
              "12/256gb",
              "mobiluri-telefonebi/samsung-galaxy-s26-s942-5g-12-256gb-white-p52076"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "s26",
              "s942",
              "5g",
              "12",
              "256gb"
            ],
            "modelFamily": "galaxy_s26",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy s26 s942 5g 12/256gb white"
          },
          "cleanTitle": "samsung galaxy s26 s942 5g 12/256gb white",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_s26|12gb|256gb|white",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy s26 s942 5g 12/256gb white",
          "canonicalParentKey": "samsung|galaxy_s26|12gb|256gb",
          "canonicalVariantKey": "samsung|galaxy_s26|12gb|256gb|white"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 2349,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/ba0524bc-d491-4028-8909-922aba11bbe3_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.918Z"
      }
    ]
  },
  {
    "id": "cmpl2fzcb001fk8dt3n2fppkb",
    "slug": "samsung-galaxy-s26-s947-5g-12-256gb-black-e8e3a6eb",
    "name": "Samsung Galaxy S26+ S947 5G 12/256GB Black",
    "canonicalKey": "samsung|galaxy_s26|12gb|256gb|black",
    "productIdentity": {
      "ram": "12gb",
      "sku": "12_256gb",
      "brand": "samsung",
      "color": "black",
      "model": "galaxy_s26",
      "storage": "256gb",
      "modelCode": "12/256gb",
      "attributes": {
        "ram": [
          "12gb"
        ],
        "brand": "samsung",
        "color": "black",
        "storage": [
          "256gb"
        ],
        "skuCodes": [
          "12_256gb",
          "mobiluri-telefonebi_samsung-galaxy-s26-s947-5g-12-256gb-black-p52081"
        ],
        "cleanTitle": "samsung galaxy s26+ s947 5g 12/256gb black",
        "modelCodes": [
          "12/256gb",
          "mobiluri-telefonebi/samsung-galaxy-s26-s947-5g-12-256gb-black-p52081"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "s26",
          "s947",
          "5g",
          "12",
          "256gb"
        ],
        "modelFamily": "galaxy_s26",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy s26+ s947 5g 12/256gb black"
      },
      "cleanTitle": "samsung galaxy s26+ s947 5g 12/256gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_s26|12gb|256gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy s26+ s947 5g 12/256gb black",
      "canonicalParentKey": "samsung|galaxy_s26|12gb|256gb",
      "canonicalVariantKey": "samsung|galaxy_s26|12gb|256gb|black"
    },
    "brand": "samsung",
    "model": "galaxy_s26",
    "imageUrl": "https://s3.zoommer.ge/site/a4a4829f-54b2-40dd-b688-9ec123d6530b_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.165Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fzcj001gk8dt4pocm0yt",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-s26-s947-5g-12-256gb-black-p52081",
        "title": "Samsung Galaxy S26+ S947 5G 12/256GB Black",
        "canonicalKey": "samsung|galaxy_s26|12gb|256gb|black",
        "productIdentity": {
          "ram": "12gb",
          "sku": "12_256gb",
          "brand": "samsung",
          "color": "black",
          "model": "galaxy_s26",
          "storage": "256gb",
          "modelCode": "12/256gb",
          "attributes": {
            "ram": [
              "12gb"
            ],
            "brand": "samsung",
            "color": "black",
            "storage": [
              "256gb"
            ],
            "skuCodes": [
              "12_256gb",
              "mobiluri-telefonebi_samsung-galaxy-s26-s947-5g-12-256gb-black-p52081"
            ],
            "cleanTitle": "samsung galaxy s26+ s947 5g 12/256gb black",
            "modelCodes": [
              "12/256gb",
              "mobiluri-telefonebi/samsung-galaxy-s26-s947-5g-12-256gb-black-p52081"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "s26",
              "s947",
              "5g",
              "12",
              "256gb"
            ],
            "modelFamily": "galaxy_s26",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy s26+ s947 5g 12/256gb black"
          },
          "cleanTitle": "samsung galaxy s26+ s947 5g 12/256gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_s26|12gb|256gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy s26+ s947 5g 12/256gb black",
          "canonicalParentKey": "samsung|galaxy_s26|12gb|256gb",
          "canonicalVariantKey": "samsung|galaxy_s26|12gb|256gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 2699,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/a4a4829f-54b2-40dd-b688-9ec123d6530b_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.903Z"
      }
    ]
  },
  {
    "id": "cmpl2fze3001pk8dtcq0k3md5",
    "slug": "apple-iphone-17-pro-max-e-sim-only-256gb-cosmic-orange-37754aec",
    "name": "Apple iPhone 17 Pro Max | 256GB Cosmic Orange",
    "canonicalKey": "apple|iphone_17_pro_max|256gb|cosmic_orange",
    "productIdentity": {
      "sku": "max-256gb-cosmic_orange-p49662",
      "brand": "apple",
      "color": "cosmic_orange",
      "model": "iphone_17_pro_max",
      "storage": "256gb",
      "variant": "pro_max",
      "modelCode": "max-256gb-cosmic_orange-p49662",
      "attributes": {
        "ram": [],
        "brand": "apple",
        "color": "cosmic_orange",
        "storage": [
          "256gb"
        ],
        "variant": "pro_max",
        "skuCodes": [
          "max-256gb-cosmic_orange-p49662",
          "mobiluri-telefonebi_apple-iphone-17-pro"
        ],
        "cleanTitle": "apple iphone 17 pro max 256gb cosmic_orange",
        "modelCodes": [
          "max-256gb-cosmic_orange-p49662",
          "mobiluri-telefonebi/apple-iphone-17-pro"
        ],
        "typeTokens": [
          "apple",
          "iphone",
          "17",
          "pro",
          "max",
          "256gb",
          "cosmic",
          "orange"
        ],
        "modelFamily": "iphone_17_pro_max",
        "categorySlug": "mobiles",
        "normalizedTitle": "apple iphone 17 pro max 256gb cosmic_orange"
      },
      "cleanTitle": "apple iphone 17 pro max 256gb cosmic_orange",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "apple|iphone_17_pro_max|256gb|cosmic_orange",
      "categorySlug": "mobiles",
      "normalizedTitle": "apple iphone 17 pro max 256gb cosmic_orange",
      "canonicalParentKey": "apple|iphone_17_pro_max|256gb",
      "canonicalVariantKey": "apple|iphone_17_pro_max|256gb|cosmic_orange"
    },
    "brand": "apple",
    "model": "iphone_17_pro_max",
    "imageUrl": "https://s3.zoommer.ge/site/2cbd2ae4-3be1-4c51-a9b9-94dda26492b9_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.266Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fzg60024k8dtluc6c54t",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/apple-iphone-17-pro-max-256gb-cosmic-orange-p49662",
        "title": "Apple iPhone 17 Pro Max | 256GB Cosmic Orange",
        "canonicalKey": "apple|iphone_17_pro_max|256gb|cosmic_orange",
        "productIdentity": {
          "sku": "max-256gb-cosmic_orange-p49662",
          "brand": "apple",
          "color": "cosmic_orange",
          "model": "iphone_17_pro_max",
          "storage": "256gb",
          "variant": "pro_max",
          "modelCode": "max-256gb-cosmic_orange-p49662",
          "attributes": {
            "ram": [],
            "brand": "apple",
            "color": "cosmic_orange",
            "storage": [
              "256gb"
            ],
            "variant": "pro_max",
            "skuCodes": [
              "max-256gb-cosmic_orange-p49662",
              "mobiluri-telefonebi_apple-iphone-17-pro"
            ],
            "cleanTitle": "apple iphone 17 pro max 256gb cosmic_orange",
            "modelCodes": [
              "max-256gb-cosmic_orange-p49662",
              "mobiluri-telefonebi/apple-iphone-17-pro"
            ],
            "typeTokens": [
              "apple",
              "iphone",
              "17",
              "pro",
              "max",
              "256gb",
              "cosmic",
              "orange"
            ],
            "modelFamily": "iphone_17_pro_max",
            "categorySlug": "mobiles",
            "normalizedTitle": "apple iphone 17 pro max 256gb cosmic_orange"
          },
          "cleanTitle": "apple iphone 17 pro max 256gb cosmic_orange",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "apple|iphone_17_pro_max|256gb|cosmic_orange",
          "categorySlug": "mobiles",
          "normalizedTitle": "apple iphone 17 pro max 256gb cosmic_orange",
          "canonicalParentKey": "apple|iphone_17_pro_max|256gb",
          "canonicalVariantKey": "apple|iphone_17_pro_max|256gb|cosmic_orange"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 4569,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/2cbd2ae4-3be1-4c51-a9b9-94dda26492b9_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.957Z"
      }
    ]
  },
  {
    "id": "cmpl2fz950010k8dto7kvjlpx",
    "slug": "samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-37b049c2",
    "name": "Samsung Galaxy A57 A576BD 5G 8/128GB Dark Blue",
    "canonicalKey": "samsung|galaxy_a57|8gb|128gb|blue",
    "productIdentity": {
      "ram": "8gb",
      "sku": "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-p52506",
      "brand": "samsung",
      "color": "blue",
      "model": "galaxy_a57",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "samsung",
        "color": "blue",
        "storage": [
          "128gb"
        ],
        "skuCodes": [
          "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-p52506"
        ],
        "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue",
        "modelCodes": [
          "8/128gb",
          "a576bd",
          "mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-p52506"
        ],
        "typeTokens": [
          "samsung",
          "galaxy",
          "a57",
          "a576bd",
          "5g",
          "128gb",
          "dark",
          "blue"
        ],
        "modelFamily": "galaxy_a57",
        "categorySlug": "mobiles",
        "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue"
      },
      "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "samsung|galaxy_a57|8gb|128gb|blue",
      "categorySlug": "mobiles",
      "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue",
      "canonicalParentKey": "samsung|galaxy_a57|8gb|128gb",
      "canonicalVariantKey": "samsung|galaxy_a57|8gb|128gb|blue"
    },
    "brand": "samsung",
    "model": "galaxy_a57",
    "imageUrl": "https://s3.zoommer.ge/site/825b0096-0119-4563-bcb7-b39e43da4d5e_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.098Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl2fz9a0011k8dt6g3cusos",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-p52506",
        "title": "Samsung Galaxy A57 A576BD 5G 8/128GB Dark Blue",
        "canonicalKey": "samsung|galaxy_a57|8gb|128gb|blue",
        "productIdentity": {
          "ram": "8gb",
          "sku": "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-p52506",
          "brand": "samsung",
          "color": "blue",
          "model": "galaxy_a57",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "samsung",
            "color": "blue",
            "storage": [
              "128gb"
            ],
            "skuCodes": [
              "mobiluri-telefonebi_samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-p52506"
            ],
            "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue",
            "modelCodes": [
              "8/128gb",
              "a576bd",
              "mobiluri-telefonebi/samsung-galaxy-a57-a576bd-5g-8-128gb-dark-blue-p52506"
            ],
            "typeTokens": [
              "samsung",
              "galaxy",
              "a57",
              "a576bd",
              "5g",
              "128gb",
              "dark",
              "blue"
            ],
            "modelFamily": "galaxy_a57",
            "categorySlug": "mobiles",
            "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue"
          },
          "cleanTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "samsung|galaxy_a57|8gb|128gb|blue",
          "categorySlug": "mobiles",
          "normalizedTitle": "samsung galaxy a57 a576bd 5g 8/128gb dark blue",
          "canonicalParentKey": "samsung|galaxy_a57|8gb|128gb",
          "canonicalVariantKey": "samsung|galaxy_a57|8gb|128gb|blue"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1199,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/825b0096-0119-4563-bcb7-b39e43da4d5e_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:30:33.858Z"
      }
    ]
  },
  {
    "id": "cmpl1vthk0007c8dtm432cxfp",
    "slug": "msi-cyborg-17-9s7-17u332-252-intel-core-5-210h-nvidia-geforce-rtx-5050-8gb-16gb-ram-ssd-1tb-free-dos-áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜-03c417ea",
    "name": "MSI Cyborg 17 9S7-17U332-252, Intel Core 5-210H, Nvidia GeForce RTX 5050 8GB, 16GB RAM SSD 1TB, Free Dos, áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
    "canonicalKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb|freedos",
    "productIdentity": {
      "os": "freedos",
      "cpu": "intel_core_5_210h",
      "gpu": "rtx_5050",
      "ram": "8gb",
      "sku": "9s7-17u332-252",
      "brand": "msi",
      "model": "msi_cyborg_17",
      "storage": "1tb",
      "modelCode": "9s7-17u332-252",
      "attributes": {
        "os": "freedos",
        "cpu": "intel_core_5_210h",
        "gpu": "rtx_5050",
        "ram": [
          "16gb",
          "8gb"
        ],
        "brand": "msi",
        "storage": [
          "1tb"
        ],
        "skuCodes": [
          "9s7-17u332-252"
        ],
        "cleanTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
        "modelCodes": [
          "9s7-17u332-252"
        ],
        "typeTokens": [
          "msi",
          "cyborg",
          "17",
          "9s7",
          "17u332",
          "252",
          "intel",
          "core",
          "210h",
          "nvidia",
          "geforce",
          "rtx",
          "5050",
          "8gb",
          "16gb",
          "ram",
          "ssd",
          "1tb",
          "free",
          "dos"
        ],
        "modelFamily": "msi_cyborg_17",
        "categorySlug": "laptops",
        "normalizedTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜"
      },
      "cleanTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
      "confidence": 100,
      "productType": "laptop",
      "canonicalKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb",
      "categorySlug": "laptops",
      "normalizedTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
      "canonicalParentKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb",
      "canonicalVariantKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb|freedos"
    },
    "brand": "msi",
    "model": "msi_cyborg_17",
    "imageUrl": "https://s3.zoommer.ge/site/c0d3eb1d-df86-4b0f-a7cd-7ac2cc242702_Thumb.jpeg",
    "category": {
      "id": "laptops",
      "slug": "laptops",
      "nameKa": "áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ”áƒ‘áƒ˜",
      "nameEn": "Laptops"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 90,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "laptops",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T10:15:22.376Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl1vthv0008c8dt4ih6kcor",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/leptopebi/msi-cyborg-17-9s7-17u332-252-intel-core-5-210h-nvidia-geforce-rtx-5050-8gb-16g-p53309",
        "title": "MSI Cyborg 17 9S7-17U332-252, Intel Core 5-210H, Nvidia GeForce RTX 5050 8GB, 16GB RAM SSD 1TB, Free Dos, áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
        "canonicalKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb|freedos",
        "productIdentity": {
          "os": "freedos",
          "cpu": "intel_core_5_210h",
          "gpu": "rtx_5050",
          "ram": "8gb",
          "sku": "9s7-17u332-252",
          "brand": "msi",
          "model": "msi_cyborg_17",
          "storage": "1tb",
          "modelCode": "9s7-17u332-252",
          "attributes": {
            "os": "freedos",
            "cpu": "intel_core_5_210h",
            "gpu": "rtx_5050",
            "ram": [
              "16gb",
              "8gb"
            ],
            "brand": "msi",
            "storage": [
              "1tb"
            ],
            "skuCodes": [
              "9s7-17u332-252"
            ],
            "cleanTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
            "modelCodes": [
              "9s7-17u332-252"
            ],
            "typeTokens": [
              "msi",
              "cyborg",
              "17",
              "9s7",
              "17u332",
              "252",
              "intel",
              "core",
              "210h",
              "nvidia",
              "geforce",
              "rtx",
              "5050",
              "8gb",
              "16gb",
              "ram",
              "ssd",
              "1tb",
              "free",
              "dos"
            ],
            "modelFamily": "msi_cyborg_17",
            "categorySlug": "laptops",
            "normalizedTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜"
          },
          "cleanTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
          "confidence": 100,
          "productType": "laptop",
          "canonicalKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb",
          "categorySlug": "laptops",
          "normalizedTitle": "msi cyborg 17 9s7-17u332-252 intel core 5-210h nvidia geforce rtx 5050 8gb 16gb ram ssd 1tb free dos áƒšáƒ”áƒžáƒ¢áƒáƒžáƒ˜",
          "canonicalParentKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb",
          "canonicalVariantKey": "msi|msi_cyborg_17|9s7_17u332_252|intel_core_5_210h|8gb|1tb|freedos"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 3499,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/c0d3eb1d-df86-4b0f-a7cd-7ac2cc242702_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:15:22.387Z"
      }
    ]
  },
  {
    "id": "cmpl1vtiy000cc8dts7fp8sas",
    "slug": "sony-wh-1000xm6-wireless-noise-canceling-stereo-headset-pink-e9b8b57c",
    "name": "Sony WH-1000XM6 Wireless Noise Canceling Stereo Headset Pink",
    "canonicalKey": "sony|wh_1000xm6|pink",
    "productIdentity": {
      "sku": "wh-1000xm6",
      "brand": "sony",
      "color": "pink",
      "modelCode": "wh-1000xm6",
      "attributes": {
        "ram": [],
        "brand": "sony",
        "color": "pink",
        "storage": [],
        "skuCodes": [
          "wh-1000xm6"
        ],
        "cleanTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink",
        "modelCodes": [
          "wh-1000xm6"
        ],
        "typeTokens": [
          "sony",
          "wh",
          "1000xm6",
          "wireless",
          "noise",
          "canceling",
          "stereo",
          "headset",
          "pink"
        ],
        "categorySlug": "audio",
        "normalizedTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink"
      },
      "cleanTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink",
      "confidence": 71,
      "productType": "audio",
      "canonicalKey": "sony|wh_1000xm6|pink",
      "categorySlug": "audio",
      "normalizedTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink",
      "canonicalParentKey": "sony|wh_1000xm6",
      "canonicalVariantKey": "sony|wh_1000xm6|pink"
    },
    "brand": "sony",
    "model": null,
    "imageUrl": "https://s3.zoommer.ge/site/2f0a5430-d412-4b99-9c14-930cff20fc57_Thumb.jpeg",
    "category": {
      "id": "audio",
      "slug": "audio",
      "nameKa": "áƒáƒ£áƒ“áƒ˜áƒ",
      "nameEn": "Audio"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 84,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "audio",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T10:15:22.426Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0uh5g000itkdtti9vmvsm",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/audio-sistema/sony-wh-1000xm6-wireless-noise-canceling-stereo-headset-pink-p53307",
        "title": "Sony WH-1000XM6 Wireless Noise Canceling Stereo Headset Pink",
        "canonicalKey": "sony|wh_1000xm6|pink",
        "productIdentity": {
          "sku": "wh-1000xm6",
          "brand": "sony",
          "color": "pink",
          "modelCode": "wh-1000xm6",
          "attributes": {
            "ram": [],
            "brand": "sony",
            "color": "pink",
            "storage": [],
            "skuCodes": [
              "wh-1000xm6"
            ],
            "cleanTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink",
            "modelCodes": [
              "wh-1000xm6"
            ],
            "typeTokens": [
              "sony",
              "wh",
              "1000xm6",
              "wireless",
              "noise",
              "canceling",
              "stereo",
              "headset",
              "pink"
            ],
            "categorySlug": "audio",
            "normalizedTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink"
          },
          "cleanTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink",
          "confidence": 71,
          "productType": "audio",
          "canonicalKey": "sony|wh_1000xm6|pink",
          "categorySlug": "audio",
          "normalizedTitle": "sony wh-1000xm6 wireless noise canceling stereo headset pink",
          "canonicalParentKey": "sony|wh_1000xm6",
          "canonicalVariantKey": "sony|wh_1000xm6|pink"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1069,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/2f0a5430-d412-4b99-9c14-930cff20fc57_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:13:36.270Z"
      }
    ]
  },
  {
    "id": "cmpl1vtkb000gc8dt8038p5n7",
    "slug": "xiaomi-poco-x8-pro-5g-8-512gb-green-186402cd",
    "name": "Xiaomi Poco X8 Pro 5G 8/512GB Green",
    "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|green",
    "productIdentity": {
      "ram": "8gb",
      "brand": "xiaomi",
      "color": "green",
      "model": "poco_x8_pro",
      "storage": "512gb",
      "modelCode": "8/512gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "xiaomi",
        "color": "green",
        "storage": [
          "512gb"
        ],
        "skuCodes": [],
        "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb green",
        "modelCodes": [
          "8/512gb"
        ],
        "typeTokens": [
          "xiaomi",
          "poco",
          "x8",
          "pro",
          "5g",
          "512gb",
          "green"
        ],
        "modelFamily": "poco_x8_pro",
        "categorySlug": "mobiles",
        "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb green"
      },
      "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb green",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|green",
      "categorySlug": "mobiles",
      "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb green",
      "canonicalParentKey": "xiaomi|poco_x8_pro|8gb|512gb",
      "canonicalVariantKey": "xiaomi|poco_x8_pro|8gb|512gb|green"
    },
    "brand": "xiaomi",
    "model": "poco_x8_pro",
    "imageUrl": "https://s3.zoommer.ge/site/442d20bb-1210-4413-bdc7-b07c761fb11f_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 94,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.666Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0ulyi000ltkdtxun6oi1t",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/xiaomi-poco-x8-pro-5g-8-512gb-green-p53303",
        "title": "Xiaomi Poco X8 Pro 5G 8/512GB Green",
        "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|green",
        "productIdentity": {
          "ram": "8gb",
          "brand": "xiaomi",
          "color": "green",
          "model": "poco_x8_pro",
          "storage": "512gb",
          "modelCode": "8/512gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "xiaomi",
            "color": "green",
            "storage": [
              "512gb"
            ],
            "skuCodes": [],
            "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb green",
            "modelCodes": [
              "8/512gb"
            ],
            "typeTokens": [
              "xiaomi",
              "poco",
              "x8",
              "pro",
              "5g",
              "512gb",
              "green"
            ],
            "modelFamily": "poco_x8_pro",
            "categorySlug": "mobiles",
            "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb green"
          },
          "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb green",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|green",
          "categorySlug": "mobiles",
          "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb green",
          "canonicalParentKey": "xiaomi|poco_x8_pro|8gb|512gb",
          "canonicalVariantKey": "xiaomi|poco_x8_pro|8gb|512gb|green"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1149,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/442d20bb-1210-4413-bdc7-b07c761fb11f_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:17.037Z"
      }
    ]
  },
  {
    "id": "cmpl1vtqi0018c8dtd3di7xfb",
    "slug": "honor-magicpad-4-12-3-wifi-12-256gb-5301asdu-grey-9b6b4a88",
    "name": "Honor MagicPad 4 12.3 Wifi 12/256GB 5301ASDU Grey",
    "canonicalKey": "honor|honor_magic_pad|12gb|256gb|gray",
    "productIdentity": {
      "ram": "12gb",
      "sku": "12_256gb",
      "brand": "honor",
      "color": "gray",
      "model": "honor_magic_pad",
      "storage": "256gb",
      "modelCode": "12/256gb",
      "attributes": {
        "ram": [
          "12gb"
        ],
        "brand": "honor",
        "color": "gray",
        "storage": [
          "256gb"
        ],
        "skuCodes": [
          "12_256gb"
        ],
        "cleanTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey",
        "modelCodes": [
          "12/256gb",
          "5301asdu"
        ],
        "typeTokens": [
          "honor",
          "magicpad",
          "12",
          "wifi",
          "12",
          "256gb",
          "5301asdu",
          "grey"
        ],
        "modelFamily": "honor_magic_pad",
        "categorySlug": "tablets",
        "normalizedTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey"
      },
      "cleanTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey",
      "confidence": 100,
      "productType": "tablet",
      "canonicalKey": "honor|honor_magic_pad|12gb|256gb|gray",
      "categorySlug": "tablets",
      "normalizedTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey",
      "canonicalParentKey": "honor|honor_magic_pad|12gb|256gb",
      "canonicalVariantKey": "honor|honor_magic_pad|12gb|256gb|gray"
    },
    "brand": "honor",
    "model": "honor_magic_pad",
    "imageUrl": "https://s3.zoommer.ge/site/61d5efe3-6746-41b7-b7f7-6a0e3ee513d4_Thumb.jpeg",
    "category": {
      "id": "tablets",
      "slug": "tablets",
      "nameKa": "áƒ¢áƒáƒ‘áƒšáƒ”áƒ¢áƒ”áƒ‘áƒ˜",
      "nameEn": "Tablets"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 100,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "tablets",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T10:32:12.691Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0w75z001qtkdtp5imt62h",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/planshetebi/honor-magicpad-4-12-3-wifi-12-256gb-5301asdu-grey-p53229",
        "title": "Honor MagicPad 4 12.3 Wifi 12/256GB 5301ASDU Grey",
        "canonicalKey": "honor|honor_magic_pad|12gb|256gb|gray",
        "productIdentity": {
          "ram": "12gb",
          "sku": "12_256gb",
          "brand": "honor",
          "color": "gray",
          "model": "honor_magic_pad",
          "storage": "256gb",
          "modelCode": "12/256gb",
          "attributes": {
            "ram": [
              "12gb"
            ],
            "brand": "honor",
            "color": "gray",
            "storage": [
              "256gb"
            ],
            "skuCodes": [
              "12_256gb"
            ],
            "cleanTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey",
            "modelCodes": [
              "12/256gb",
              "5301asdu"
            ],
            "typeTokens": [
              "honor",
              "magicpad",
              "12",
              "wifi",
              "12",
              "256gb",
              "5301asdu",
              "grey"
            ],
            "modelFamily": "honor_magic_pad",
            "categorySlug": "tablets",
            "normalizedTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey"
          },
          "cleanTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey",
          "confidence": 100,
          "productType": "tablet",
          "canonicalKey": "honor|honor_magic_pad|12gb|256gb|gray",
          "categorySlug": "tablets",
          "normalizedTitle": "honor magicpad 4 12.3 wifi 12/256gb 5301asdu grey",
          "canonicalParentKey": "honor|honor_magic_pad|12gb|256gb",
          "canonicalVariantKey": "honor|honor_magic_pad|12gb|256gb|gray"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 2599,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/61d5efe3-6746-41b7-b7f7-6a0e3ee513d4_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T10:15:00.845Z"
      }
    ]
  },
  {
    "id": "cmpl1vtla000kc8dtu4762vcy",
    "slug": "xiaomi-poco-x8-pro-5g-8-512gb-black-ed52a172",
    "name": "Xiaomi Poco X8 Pro 5G 8/512GB Black",
    "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|black",
    "productIdentity": {
      "ram": "8gb",
      "brand": "xiaomi",
      "color": "black",
      "model": "poco_x8_pro",
      "storage": "512gb",
      "modelCode": "8/512gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "xiaomi",
        "color": "black",
        "storage": [
          "512gb"
        ],
        "skuCodes": [],
        "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb black",
        "modelCodes": [
          "8/512gb"
        ],
        "typeTokens": [
          "xiaomi",
          "poco",
          "x8",
          "pro",
          "5g",
          "512gb"
        ],
        "modelFamily": "poco_x8_pro",
        "categorySlug": "mobiles",
        "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb black"
      },
      "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb black",
      "canonicalParentKey": "xiaomi|poco_x8_pro|8gb|512gb",
      "canonicalVariantKey": "xiaomi|poco_x8_pro|8gb|512gb|black"
    },
    "brand": "xiaomi",
    "model": "poco_x8_pro",
    "imageUrl": "https://s3.zoommer.ge/site/078dadf2-9a58-46a2-bd38-1839af93e979_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 94,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.714Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0uqw1000otkdtomid9imw",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/xiaomi-poco-x8-pro-5g-8-512gb-black-p53302",
        "title": "Xiaomi Poco X8 Pro 5G 8/512GB Black",
        "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|black",
        "productIdentity": {
          "ram": "8gb",
          "brand": "xiaomi",
          "color": "black",
          "model": "poco_x8_pro",
          "storage": "512gb",
          "modelCode": "8/512gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "xiaomi",
            "color": "black",
            "storage": [
              "512gb"
            ],
            "skuCodes": [],
            "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb black",
            "modelCodes": [
              "8/512gb"
            ],
            "typeTokens": [
              "xiaomi",
              "poco",
              "x8",
              "pro",
              "5g",
              "512gb"
            ],
            "modelFamily": "poco_x8_pro",
            "categorySlug": "mobiles",
            "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb black"
          },
          "cleanTitle": "xiaomi poco x8 pro 5g 8/512gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "xiaomi|poco_x8_pro|8gb|512gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "xiaomi poco x8 pro 5g 8/512gb black",
          "canonicalParentKey": "xiaomi|poco_x8_pro|8gb|512gb",
          "canonicalVariantKey": "xiaomi|poco_x8_pro|8gb|512gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1149,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/078dadf2-9a58-46a2-bd38-1839af93e979_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:24.161Z"
      }
    ]
  },
  {
    "id": "cmpl44vsx003rdsdt190l6hli",
    "slug": "motorola-signature-5g-16-512gb-martini-olive-528f00aa",
    "name": "Motorola Signature 5G 16/512GB Martini Olive",
    "canonicalKey": "motorola|motorola_signature_5g|16gb|512gb|olive",
    "productIdentity": {
      "ram": "16gb",
      "sku": "16_512gb",
      "brand": "motorola",
      "color": "olive",
      "model": "motorola_signature_5g",
      "storage": "512gb",
      "modelCode": "16/512gb",
      "attributes": {
        "ram": [
          "16gb"
        ],
        "brand": "motorola",
        "color": "olive",
        "storage": [
          "512gb"
        ],
        "skuCodes": [
          "16_512gb"
        ],
        "cleanTitle": "motorola signature 5g 16/512gb olive",
        "modelCodes": [
          "16/512gb"
        ],
        "typeTokens": [
          "motorola",
          "signature",
          "5g",
          "16",
          "512gb",
          "olive"
        ],
        "modelFamily": "motorola_signature_5g",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola signature 5g 16/512gb olive"
      },
      "cleanTitle": "motorola signature 5g 16/512gb olive",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_signature_5g|16gb|512gb|olive",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola signature 5g 16/512gb olive",
      "canonicalParentKey": "motorola|motorola_signature_5g|16gb|512gb",
      "canonicalVariantKey": "motorola|motorola_signature_5g|16gb|512gb|olive"
    },
    "brand": "motorola",
    "model": "motorola_signature_5g",
    "imageUrl": "https://s3.zoommer.ge/site/f6ba890d-a473-4ff3-b81d-52f79c5591e2_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.513Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vt4003sdsdt3oedfxmt",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-signature-5g-16-512gb-martini-olive-p52619",
        "title": "Motorola Signature 5G 16/512GB Martini Olive",
        "canonicalKey": "motorola|motorola_signature_5g|16gb|512gb|olive",
        "productIdentity": {
          "ram": "16gb",
          "sku": "16_512gb",
          "brand": "motorola",
          "color": "olive",
          "model": "motorola_signature_5g",
          "storage": "512gb",
          "modelCode": "16/512gb",
          "attributes": {
            "ram": [
              "16gb"
            ],
            "brand": "motorola",
            "color": "olive",
            "storage": [
              "512gb"
            ],
            "skuCodes": [
              "16_512gb"
            ],
            "cleanTitle": "motorola signature 5g 16/512gb olive",
            "modelCodes": [
              "16/512gb"
            ],
            "typeTokens": [
              "motorola",
              "signature",
              "5g",
              "16",
              "512gb",
              "olive"
            ],
            "modelFamily": "motorola_signature_5g",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola signature 5g 16/512gb olive"
          },
          "cleanTitle": "motorola signature 5g 16/512gb olive",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_signature_5g|16gb|512gb|olive",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola signature 5g 16/512gb olive",
          "canonicalParentKey": "motorola|motorola_signature_5g|16gb|512gb",
          "canonicalVariantKey": "motorola|motorola_signature_5g|16gb|512gb|olive"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 2399,
        "oldPrice": 2699,
        "discountPercent": 11,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/f6ba890d-a473-4ff3-b81d-52f79c5591e2_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.520Z"
      }
    ]
  },
  {
    "id": "cmpl44vrc003cdsdteay4xypp",
    "slug": "motorola-moto-edge-60-fusion-5g-8-256gb-zephyr-f788d4bc",
    "name": "Motorola Moto Edge 60 Fusion 5G 8/256GB Zephyr",
    "canonicalKey": "motorola|motorola_edge_60_fusion|8gb|256gb|blue",
    "productIdentity": {
      "ram": "8gb",
      "brand": "motorola",
      "color": "blue",
      "model": "motorola_edge_60_fusion",
      "storage": "256gb",
      "modelCode": "8/256gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "motorola",
        "color": "blue",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "motorola moto edge 60 fusion 5g 8/256gb blue",
        "modelCodes": [
          "8/256gb"
        ],
        "typeTokens": [
          "motorola",
          "moto",
          "edge",
          "60",
          "fusion",
          "5g",
          "256gb",
          "blue"
        ],
        "modelFamily": "motorola_edge_60_fusion",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola moto edge 60 fusion 5g 8/256gb blue"
      },
      "cleanTitle": "motorola moto edge 60 fusion 5g 8/256gb blue",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_edge_60_fusion|8gb|256gb|blue",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola moto edge 60 fusion 5g 8/256gb blue",
      "canonicalParentKey": "motorola|motorola_edge_60_fusion|8gb|256gb",
      "canonicalVariantKey": "motorola|motorola_edge_60_fusion|8gb|256gb|blue"
    },
    "brand": "motorola",
    "model": "motorola_edge_60_fusion",
    "imageUrl": "https://s3.zoommer.ge/site/ee2cfd8f-a95a-4402-aee1-3c18ca524574_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 94,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.456Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vrh003ddsdtkk028pdu",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-moto-edge-60-fusion-5g-8-256gb-zephyr-p52624",
        "title": "Motorola Moto Edge 60 Fusion 5G 8/256GB Zephyr",
        "canonicalKey": "motorola|motorola_edge_60_fusion|8gb|256gb|blue",
        "productIdentity": {
          "ram": "8gb",
          "brand": "motorola",
          "color": "blue",
          "model": "motorola_edge_60_fusion",
          "storage": "256gb",
          "modelCode": "8/256gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "motorola",
            "color": "blue",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "motorola moto edge 60 fusion 5g 8/256gb blue",
            "modelCodes": [
              "8/256gb"
            ],
            "typeTokens": [
              "motorola",
              "moto",
              "edge",
              "60",
              "fusion",
              "5g",
              "256gb",
              "blue"
            ],
            "modelFamily": "motorola_edge_60_fusion",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola moto edge 60 fusion 5g 8/256gb blue"
          },
          "cleanTitle": "motorola moto edge 60 fusion 5g 8/256gb blue",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_edge_60_fusion|8gb|256gb|blue",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola moto edge 60 fusion 5g 8/256gb blue",
          "canonicalParentKey": "motorola|motorola_edge_60_fusion|8gb|256gb",
          "canonicalVariantKey": "motorola|motorola_edge_60_fusion|8gb|256gb|blue"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 799,
        "oldPrice": 899,
        "discountPercent": 11,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/ee2cfd8f-a95a-4402-aee1-3c18ca524574_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.461Z"
      }
    ]
  },
  {
    "id": "cmpl44vp6002sdsdtvdzw98i6",
    "slug": "nothing-phone-4a-5g-8-128gb-white-306d39d6",
    "name": "Nothing Phone 4a 5G 8/128GB White",
    "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|white",
    "productIdentity": {
      "ram": "8gb",
      "brand": "nothing",
      "color": "white",
      "model": "nothing_phone_4a",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "nothing",
        "color": "white",
        "storage": [
          "128gb"
        ],
        "skuCodes": [],
        "cleanTitle": "nothing phone 4a 5g 8/128gb white",
        "modelCodes": [
          "8/128gb"
        ],
        "typeTokens": [
          "nothing",
          "4a",
          "5g",
          "128gb"
        ],
        "modelFamily": "nothing_phone_4a",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 4a 5g 8/128gb white"
      },
      "cleanTitle": "nothing phone 4a 5g 8/128gb white",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|white",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 4a 5g 8/128gb white",
      "canonicalParentKey": "nothing|nothing_phone_4a|8gb|128gb",
      "canonicalVariantKey": "nothing|nothing_phone_4a|8gb|128gb|white"
    },
    "brand": "nothing",
    "model": "nothing_phone_4a",
    "imageUrl": "https://s3.zoommer.ge/site/de3a6226-d66d-487d-9193-e0fc01d87aae_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.378Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vpc002tdsdty81a1c9e",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-4a-5g-8-128gb-white-p52803",
        "title": "Nothing Phone 4a 5G 8/128GB White",
        "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|white",
        "productIdentity": {
          "ram": "8gb",
          "brand": "nothing",
          "color": "white",
          "model": "nothing_phone_4a",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "nothing",
            "color": "white",
            "storage": [
              "128gb"
            ],
            "skuCodes": [],
            "cleanTitle": "nothing phone 4a 5g 8/128gb white",
            "modelCodes": [
              "8/128gb"
            ],
            "typeTokens": [
              "nothing",
              "4a",
              "5g",
              "128gb"
            ],
            "modelFamily": "nothing_phone_4a",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 4a 5g 8/128gb white"
          },
          "cleanTitle": "nothing phone 4a 5g 8/128gb white",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|white",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 4a 5g 8/128gb white",
          "canonicalParentKey": "nothing|nothing_phone_4a|8gb|128gb",
          "canonicalVariantKey": "nothing|nothing_phone_4a|8gb|128gb|white"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1299,
        "oldPrice": 1399,
        "discountPercent": 7,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/de3a6226-d66d-487d-9193-e0fc01d87aae_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.384Z"
      }
    ]
  },
  {
    "id": "cmpl44vpr002xdsdtcx2f84dn",
    "slug": "nothing-phone-4a-5g-8-128gb-black-aa76d544",
    "name": "Nothing Phone 4a 5G 8/128GB Black",
    "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|black",
    "productIdentity": {
      "ram": "8gb",
      "brand": "nothing",
      "color": "black",
      "model": "nothing_phone_4a",
      "storage": "128gb",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "nothing",
        "color": "black",
        "storage": [
          "128gb"
        ],
        "skuCodes": [],
        "cleanTitle": "nothing phone 4a 5g 8/128gb black",
        "modelCodes": [
          "8/128gb"
        ],
        "typeTokens": [
          "nothing",
          "4a",
          "5g",
          "128gb"
        ],
        "modelFamily": "nothing_phone_4a",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 4a 5g 8/128gb black"
      },
      "cleanTitle": "nothing phone 4a 5g 8/128gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 4a 5g 8/128gb black",
      "canonicalParentKey": "nothing|nothing_phone_4a|8gb|128gb",
      "canonicalVariantKey": "nothing|nothing_phone_4a|8gb|128gb|black"
    },
    "brand": "nothing",
    "model": "nothing_phone_4a",
    "imageUrl": "https://s3.zoommer.ge/site/e348f58f-cace-41ba-a01a-75d60190d3a2_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.399Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vpu002ydsdtbnnkdem7",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-4a-5g-8-128gb-black-p52802",
        "title": "Nothing Phone 4a 5G 8/128GB Black",
        "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|black",
        "productIdentity": {
          "ram": "8gb",
          "brand": "nothing",
          "color": "black",
          "model": "nothing_phone_4a",
          "storage": "128gb",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "nothing",
            "color": "black",
            "storage": [
              "128gb"
            ],
            "skuCodes": [],
            "cleanTitle": "nothing phone 4a 5g 8/128gb black",
            "modelCodes": [
              "8/128gb"
            ],
            "typeTokens": [
              "nothing",
              "4a",
              "5g",
              "128gb"
            ],
            "modelFamily": "nothing_phone_4a",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 4a 5g 8/128gb black"
          },
          "cleanTitle": "nothing phone 4a 5g 8/128gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_4a|8gb|128gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 4a 5g 8/128gb black",
          "canonicalParentKey": "nothing|nothing_phone_4a|8gb|128gb",
          "canonicalVariantKey": "nothing|nothing_phone_4a|8gb|128gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1299,
        "oldPrice": 1399,
        "discountPercent": 7,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/e348f58f-cace-41ba-a01a-75d60190d3a2_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.402Z"
      }
    ]
  },
  {
    "id": "cmpl44vcv000wdsdtflu05mz0",
    "slug": "motorola-razr-70-5g-8-256gb-sporting-green-1b508dd6",
    "name": "Motorola RAZR 70 5G 8/256GB Sporting Green",
    "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|green",
    "productIdentity": {
      "ram": "8gb",
      "brand": "motorola",
      "color": "green",
      "model": "motorola_razr_70",
      "storage": "256gb",
      "modelCode": "8/256gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "motorola",
        "color": "green",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "motorola razr 70 5g 8/256gb green",
        "modelCodes": [
          "8/256gb"
        ],
        "typeTokens": [
          "motorola",
          "razr",
          "70",
          "5g",
          "256gb",
          "green"
        ],
        "modelFamily": "motorola_razr_70",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola razr 70 5g 8/256gb green"
      },
      "cleanTitle": "motorola razr 70 5g 8/256gb green",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|green",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola razr 70 5g 8/256gb green",
      "canonicalParentKey": "motorola|motorola_razr_70|8gb|256gb",
      "canonicalVariantKey": "motorola|motorola_razr_70|8gb|256gb|green"
    },
    "brand": "motorola",
    "model": "motorola_razr_70",
    "imageUrl": "https://s3.zoommer.ge/site/98ba4d51-2438-4d72-a103-ec9e12656b35_Thumb.png",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 90,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.935Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vd4000xdsdt86arbl1f",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-razr-70-5g-8-256gb-sporting-green-p52618",
        "title": "Motorola RAZR 70 5G 8/256GB Sporting Green",
        "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|green",
        "productIdentity": {
          "ram": "8gb",
          "brand": "motorola",
          "color": "green",
          "model": "motorola_razr_70",
          "storage": "256gb",
          "modelCode": "8/256gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "motorola",
            "color": "green",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "motorola razr 70 5g 8/256gb green",
            "modelCodes": [
              "8/256gb"
            ],
            "typeTokens": [
              "motorola",
              "razr",
              "70",
              "5g",
              "256gb",
              "green"
            ],
            "modelFamily": "motorola_razr_70",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola razr 70 5g 8/256gb green"
          },
          "cleanTitle": "motorola razr 70 5g 8/256gb green",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|green",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola razr 70 5g 8/256gb green",
          "canonicalParentKey": "motorola|motorola_razr_70|8gb|256gb",
          "canonicalVariantKey": "motorola|motorola_razr_70|8gb|256gb|green"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 2299,
        "oldPrice": 2499,
        "discountPercent": 8,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/98ba4d51-2438-4d72-a103-ec9e12656b35_Thumb.png",
        "lastSeenAt": "2026-05-25T11:18:23.944Z"
      }
    ]
  },
  {
    "id": "cmpl44vsg003mdsdt4jgvboul",
    "slug": "motorola-moto-g67-5g-4-256gb-arctic-seal-4faa7d68",
    "name": "Motorola Moto G67 5G 4/256GB Arctic Seal",
    "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|gray",
    "productIdentity": {
      "ram": "4gb",
      "brand": "motorola",
      "color": "gray",
      "model": "motorola_moto_g67",
      "storage": "256gb",
      "modelCode": "4/256gb",
      "attributes": {
        "ram": [
          "4gb"
        ],
        "brand": "motorola",
        "color": "gray",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "motorola moto g67 5g 4/256gb gray",
        "modelCodes": [
          "4/256gb"
        ],
        "typeTokens": [
          "motorola",
          "moto",
          "g67",
          "5g",
          "256gb",
          "gray"
        ],
        "modelFamily": "motorola_moto_g67",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola moto g67 5g 4/256gb gray"
      },
      "cleanTitle": "motorola moto g67 5g 4/256gb gray",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|gray",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola moto g67 5g 4/256gb gray",
      "canonicalParentKey": "motorola|motorola_moto_g67|4gb|256gb",
      "canonicalVariantKey": "motorola|motorola_moto_g67|4gb|256gb|gray"
    },
    "brand": "motorola",
    "model": "motorola_moto_g67",
    "imageUrl": "https://s3.zoommer.ge/site/923a046d-727d-4c49-a74d-f5eb53bfe7e2_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 94,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.496Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vsl003ndsdt7nfljlso",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-moto-g67-5g-4-256gb-arctic-seal-p52621",
        "title": "Motorola Moto G67 5G 4/256GB Arctic Seal",
        "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|gray",
        "productIdentity": {
          "ram": "4gb",
          "brand": "motorola",
          "color": "gray",
          "model": "motorola_moto_g67",
          "storage": "256gb",
          "modelCode": "4/256gb",
          "attributes": {
            "ram": [
              "4gb"
            ],
            "brand": "motorola",
            "color": "gray",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "motorola moto g67 5g 4/256gb gray",
            "modelCodes": [
              "4/256gb"
            ],
            "typeTokens": [
              "motorola",
              "moto",
              "g67",
              "5g",
              "256gb",
              "gray"
            ],
            "modelFamily": "motorola_moto_g67",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola moto g67 5g 4/256gb gray"
          },
          "cleanTitle": "motorola moto g67 5g 4/256gb gray",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|gray",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola moto g67 5g 4/256gb gray",
          "canonicalParentKey": "motorola|motorola_moto_g67|4gb|256gb",
          "canonicalVariantKey": "motorola|motorola_moto_g67|4gb|256gb|gray"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 669,
        "oldPrice": 729,
        "discountPercent": 8,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/923a046d-727d-4c49-a74d-f5eb53bfe7e2_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.501Z"
      }
    ]
  },
  {
    "id": "cmpl44vrw003hdsdtvbfn16wf",
    "slug": "motorola-moto-g67-5g-4-256gb-nile-aa7dc795",
    "name": "Motorola Moto G67 5G 4/256GB Nile",
    "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|green",
    "productIdentity": {
      "ram": "4gb",
      "brand": "motorola",
      "color": "green",
      "model": "motorola_moto_g67",
      "storage": "256gb",
      "modelCode": "4/256gb",
      "attributes": {
        "ram": [
          "4gb"
        ],
        "brand": "motorola",
        "color": "green",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "motorola moto g67 5g 4/256gb green",
        "modelCodes": [
          "4/256gb"
        ],
        "typeTokens": [
          "motorola",
          "moto",
          "g67",
          "5g",
          "256gb",
          "green"
        ],
        "modelFamily": "motorola_moto_g67",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola moto g67 5g 4/256gb green"
      },
      "cleanTitle": "motorola moto g67 5g 4/256gb green",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|green",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola moto g67 5g 4/256gb green",
      "canonicalParentKey": "motorola|motorola_moto_g67|4gb|256gb",
      "canonicalVariantKey": "motorola|motorola_moto_g67|4gb|256gb|green"
    },
    "brand": "motorola",
    "model": "motorola_moto_g67",
    "imageUrl": "https://s3.zoommer.ge/site/25dbcc1f-9f60-410e-82ec-d927d2766b01_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 94,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.476Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vs2003idsdt1hgdqtgk",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-moto-g67-5g-4-256gb-nile-p52622",
        "title": "Motorola Moto G67 5G 4/256GB Nile",
        "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|green",
        "productIdentity": {
          "ram": "4gb",
          "brand": "motorola",
          "color": "green",
          "model": "motorola_moto_g67",
          "storage": "256gb",
          "modelCode": "4/256gb",
          "attributes": {
            "ram": [
              "4gb"
            ],
            "brand": "motorola",
            "color": "green",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "motorola moto g67 5g 4/256gb green",
            "modelCodes": [
              "4/256gb"
            ],
            "typeTokens": [
              "motorola",
              "moto",
              "g67",
              "5g",
              "256gb",
              "green"
            ],
            "modelFamily": "motorola_moto_g67",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola moto g67 5g 4/256gb green"
          },
          "cleanTitle": "motorola moto g67 5g 4/256gb green",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_moto_g67|4gb|256gb|green",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola moto g67 5g 4/256gb green",
          "canonicalParentKey": "motorola|motorola_moto_g67|4gb|256gb",
          "canonicalVariantKey": "motorola|motorola_moto_g67|4gb|256gb|green"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 669,
        "oldPrice": 729,
        "discountPercent": 8,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/25dbcc1f-9f60-410e-82ec-d927d2766b01_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.482Z"
      }
    ]
  },
  {
    "id": "cmpl44ve30011dsdtk32kcei2",
    "slug": "motorola-razr-70-5g-8-256gb-pantone-hematite-26621c2b",
    "name": "Motorola RAZR 70 5G 8/256GB Pantone Hematite",
    "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|hematite",
    "productIdentity": {
      "ram": "8gb",
      "brand": "motorola",
      "color": "hematite",
      "model": "motorola_razr_70",
      "storage": "256gb",
      "modelCode": "8/256gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "motorola",
        "color": "hematite",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "motorola razr 70 5g 8/256gb hematite",
        "modelCodes": [
          "8/256gb"
        ],
        "typeTokens": [
          "motorola",
          "razr",
          "70",
          "5g",
          "256gb",
          "hematite"
        ],
        "modelFamily": "motorola_razr_70",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola razr 70 5g 8/256gb hematite"
      },
      "cleanTitle": "motorola razr 70 5g 8/256gb hematite",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|hematite",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola razr 70 5g 8/256gb hematite",
      "canonicalParentKey": "motorola|motorola_razr_70|8gb|256gb",
      "canonicalVariantKey": "motorola|motorola_razr_70|8gb|256gb|hematite"
    },
    "brand": "motorola",
    "model": "motorola_razr_70",
    "imageUrl": "https://s3.zoommer.ge/site/d364d7a1-6133-46a2-b3b7-6283c30042c0_Thumb.png",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 90,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.979Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44ve90012dsdtgafc7yo4",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-razr-70-5g-8-256gb-pantone-hematite-p52617",
        "title": "Motorola RAZR 70 5G 8/256GB Pantone Hematite",
        "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|hematite",
        "productIdentity": {
          "ram": "8gb",
          "brand": "motorola",
          "color": "hematite",
          "model": "motorola_razr_70",
          "storage": "256gb",
          "modelCode": "8/256gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "motorola",
            "color": "hematite",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "motorola razr 70 5g 8/256gb hematite",
            "modelCodes": [
              "8/256gb"
            ],
            "typeTokens": [
              "motorola",
              "razr",
              "70",
              "5g",
              "256gb",
              "hematite"
            ],
            "modelFamily": "motorola_razr_70",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola razr 70 5g 8/256gb hematite"
          },
          "cleanTitle": "motorola razr 70 5g 8/256gb hematite",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_razr_70|8gb|256gb|hematite",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola razr 70 5g 8/256gb hematite",
          "canonicalParentKey": "motorola|motorola_razr_70|8gb|256gb",
          "canonicalVariantKey": "motorola|motorola_razr_70|8gb|256gb|hematite"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 2299,
        "oldPrice": 2499,
        "discountPercent": 8,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/d364d7a1-6133-46a2-b3b7-6283c30042c0_Thumb.png",
        "lastSeenAt": "2026-05-25T11:18:23.985Z"
      }
    ]
  },
  {
    "id": "cmpl44vnu002idsdtkmkyns4w",
    "slug": "nothing-phone-4a-pro-5g-12-256gb-black-24f372bd",
    "name": "Nothing Phone 4a Pro 5G 12/256GB Black",
    "canonicalKey": "nothing|nothing_phone_4a_pro|12gb|256gb|black",
    "productIdentity": {
      "ram": "12gb",
      "sku": "12_256gb",
      "brand": "nothing",
      "color": "black",
      "model": "nothing_phone_4a_pro",
      "storage": "256gb",
      "modelCode": "12/256gb",
      "attributes": {
        "ram": [
          "12gb"
        ],
        "brand": "nothing",
        "color": "black",
        "storage": [
          "256gb"
        ],
        "skuCodes": [
          "12_256gb"
        ],
        "cleanTitle": "nothing phone 4a pro 5g 12/256gb black",
        "modelCodes": [
          "12/256gb"
        ],
        "typeTokens": [
          "nothing",
          "4a",
          "pro",
          "5g",
          "12",
          "256gb"
        ],
        "modelFamily": "nothing_phone_4a_pro",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 4a pro 5g 12/256gb black"
      },
      "cleanTitle": "nothing phone 4a pro 5g 12/256gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_4a_pro|12gb|256gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 4a pro 5g 12/256gb black",
      "canonicalParentKey": "nothing|nothing_phone_4a_pro|12gb|256gb",
      "canonicalVariantKey": "nothing|nothing_phone_4a_pro|12gb|256gb|black"
    },
    "brand": "nothing",
    "model": "nothing_phone_4a_pro",
    "imageUrl": "https://s3.zoommer.ge/site/a301a948-d5f4-49b9-af40-f6862622ea78_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.330Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vo2002jdsdte4saulx0",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-4a-pro-5g-12-256gb-black-p52806",
        "title": "Nothing Phone 4a Pro 5G 12/256GB Black",
        "canonicalKey": "nothing|nothing_phone_4a_pro|12gb|256gb|black",
        "productIdentity": {
          "ram": "12gb",
          "sku": "12_256gb",
          "brand": "nothing",
          "color": "black",
          "model": "nothing_phone_4a_pro",
          "storage": "256gb",
          "modelCode": "12/256gb",
          "attributes": {
            "ram": [
              "12gb"
            ],
            "brand": "nothing",
            "color": "black",
            "storage": [
              "256gb"
            ],
            "skuCodes": [
              "12_256gb"
            ],
            "cleanTitle": "nothing phone 4a pro 5g 12/256gb black",
            "modelCodes": [
              "12/256gb"
            ],
            "typeTokens": [
              "nothing",
              "4a",
              "pro",
              "5g",
              "12",
              "256gb"
            ],
            "modelFamily": "nothing_phone_4a_pro",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 4a pro 5g 12/256gb black"
          },
          "cleanTitle": "nothing phone 4a pro 5g 12/256gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_4a_pro|12gb|256gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 4a pro 5g 12/256gb black",
          "canonicalParentKey": "nothing|nothing_phone_4a_pro|12gb|256gb",
          "canonicalVariantKey": "nothing|nothing_phone_4a_pro|12gb|256gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1999,
        "oldPrice": 2099,
        "discountPercent": 5,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/a301a948-d5f4-49b9-af40-f6862622ea78_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.338Z"
      }
    ]
  },
  {
    "id": "cmpl44voj002ndsdtq53wt921",
    "slug": "nothing-phone-4a-5g-8-256gb-white-cc82a620",
    "name": "Nothing Phone 4a 5G 8/256GB White",
    "canonicalKey": "nothing|nothing_phone_4a|8gb|256gb|white",
    "productIdentity": {
      "ram": "8gb",
      "brand": "nothing",
      "color": "white",
      "model": "nothing_phone_4a",
      "storage": "256gb",
      "modelCode": "8/256gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "nothing",
        "color": "white",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "nothing phone 4a 5g 8/256gb white",
        "modelCodes": [
          "8/256gb"
        ],
        "typeTokens": [
          "nothing",
          "4a",
          "5g",
          "256gb"
        ],
        "modelFamily": "nothing_phone_4a",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 4a 5g 8/256gb white"
      },
      "cleanTitle": "nothing phone 4a 5g 8/256gb white",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_4a|8gb|256gb|white",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 4a 5g 8/256gb white",
      "canonicalParentKey": "nothing|nothing_phone_4a|8gb|256gb",
      "canonicalVariantKey": "nothing|nothing_phone_4a|8gb|256gb|white"
    },
    "brand": "nothing",
    "model": "nothing_phone_4a",
    "imageUrl": "https://s3.zoommer.ge/site/69899757-a223-4c1e-8c85-89f790c7f1e6_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.355Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vor002odsdt3vq878ql",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-4a-5g-8-256gb-white-p52805",
        "title": "Nothing Phone 4a 5G 8/256GB White",
        "canonicalKey": "nothing|nothing_phone_4a|8gb|256gb|white",
        "productIdentity": {
          "ram": "8gb",
          "brand": "nothing",
          "color": "white",
          "model": "nothing_phone_4a",
          "storage": "256gb",
          "modelCode": "8/256gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "nothing",
            "color": "white",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "nothing phone 4a 5g 8/256gb white",
            "modelCodes": [
              "8/256gb"
            ],
            "typeTokens": [
              "nothing",
              "4a",
              "5g",
              "256gb"
            ],
            "modelFamily": "nothing_phone_4a",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 4a 5g 8/256gb white"
          },
          "cleanTitle": "nothing phone 4a 5g 8/256gb white",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_4a|8gb|256gb|white",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 4a 5g 8/256gb white",
          "canonicalParentKey": "nothing|nothing_phone_4a|8gb|256gb",
          "canonicalVariantKey": "nothing|nothing_phone_4a|8gb|256gb|white"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1499,
        "oldPrice": 1599,
        "discountPercent": 6,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/69899757-a223-4c1e-8c85-89f790c7f1e6_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.363Z"
      }
    ]
  },
  {
    "id": "cmpl44vay000kdsdtd657mec9",
    "slug": "oneplus-nord-6-5g-8-256gb-black-e230201a",
    "name": "OnePlus Nord 6 5G 8/256GB Black",
    "canonicalKey": "oneplus|oneplus_nord_6|8gb|256gb|black",
    "productIdentity": {
      "ram": "8gb",
      "brand": "oneplus",
      "color": "black",
      "model": "oneplus_nord_6",
      "storage": "256gb",
      "modelCode": "8/256gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "oneplus",
        "color": "black",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "oneplus nord 6 5g 8/256gb black",
        "modelCodes": [
          "8/256gb"
        ],
        "typeTokens": [
          "oneplus",
          "nord",
          "5g",
          "256gb"
        ],
        "modelFamily": "oneplus_nord_6",
        "categorySlug": "mobiles",
        "normalizedTitle": "oneplus nord 6 5g 8/256gb black"
      },
      "cleanTitle": "oneplus nord 6 5g 8/256gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "oneplus|oneplus_nord_6|8gb|256gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "oneplus nord 6 5g 8/256gb black",
      "canonicalParentKey": "oneplus|oneplus_nord_6|8gb|256gb",
      "canonicalVariantKey": "oneplus|oneplus_nord_6|8gb|256gb|black"
    },
    "brand": "oneplus",
    "model": "oneplus_nord_6",
    "imageUrl": "https://s3.zoommer.ge/site/aec77b4b-d3d9-44de-8ed1-179175be4de7_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.866Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0wx6n0025tkdt8eruus7c",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/oneplus-nord-6-5g-8-256gb-black-p53180",
        "title": "OnePlus Nord 6 5G 8/256GB Black",
        "canonicalKey": "oneplus|oneplus_nord_6|8gb|256gb|black",
        "productIdentity": {
          "ram": "8gb",
          "brand": "oneplus",
          "color": "black",
          "model": "oneplus_nord_6",
          "storage": "256gb",
          "modelCode": "8/256gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "oneplus",
            "color": "black",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "oneplus nord 6 5g 8/256gb black",
            "modelCodes": [
              "8/256gb"
            ],
            "typeTokens": [
              "oneplus",
              "nord",
              "5g",
              "256gb"
            ],
            "modelFamily": "oneplus_nord_6",
            "categorySlug": "mobiles",
            "normalizedTitle": "oneplus nord 6 5g 8/256gb black"
          },
          "cleanTitle": "oneplus nord 6 5g 8/256gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "oneplus|oneplus_nord_6|8gb|256gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "oneplus nord 6 5g 8/256gb black",
          "canonicalParentKey": "oneplus|oneplus_nord_6|8gb|256gb",
          "canonicalVariantKey": "oneplus|oneplus_nord_6|8gb|256gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1599,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/aec77b4b-d3d9-44de-8ed1-179175be4de7_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:47.081Z"
      }
    ]
  },
  {
    "id": "cmpl44vca000sdsdtfpb6ch96",
    "slug": "motorola-moto-g06-power-lte-4-256gb-laurel-oak-14db1a79",
    "name": "Motorola Moto G06 Power LTE 4/256GB Laurel oak",
    "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|green",
    "productIdentity": {
      "ram": "4gb",
      "brand": "motorola",
      "color": "green",
      "model": "motorola_moto_g06_power",
      "storage": "256gb",
      "modelCode": "4/256gb",
      "attributes": {
        "ram": [
          "4gb"
        ],
        "brand": "motorola",
        "color": "green",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "motorola moto g06 power lte 4/256gb green",
        "modelCodes": [
          "4/256gb"
        ],
        "typeTokens": [
          "motorola",
          "moto",
          "g06",
          "power",
          "lte",
          "256gb",
          "green"
        ],
        "modelFamily": "motorola_moto_g06_power",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola moto g06 power lte 4/256gb green"
      },
      "cleanTitle": "motorola moto g06 power lte 4/256gb green",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|green",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola moto g06 power lte 4/256gb green",
      "canonicalParentKey": "motorola|motorola_moto_g06_power|4gb|256gb",
      "canonicalVariantKey": "motorola|motorola_moto_g06_power|4gb|256gb|green"
    },
    "brand": "motorola",
    "model": "motorola_moto_g06_power",
    "imageUrl": "https://s3.zoommer.ge/site/ee14a9dd-2ca1-4b45-8919-c0194339fe5e_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 94,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.914Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0y0t2002ztkdt7iaw7tva",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-moto-g06-power-lte-4-256gb-laurel-oak-p53102",
        "title": "Motorola Moto G06 Power LTE 4/256GB Laurel oak",
        "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|green",
        "productIdentity": {
          "ram": "4gb",
          "brand": "motorola",
          "color": "green",
          "model": "motorola_moto_g06_power",
          "storage": "256gb",
          "modelCode": "4/256gb",
          "attributes": {
            "ram": [
              "4gb"
            ],
            "brand": "motorola",
            "color": "green",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "motorola moto g06 power lte 4/256gb green",
            "modelCodes": [
              "4/256gb"
            ],
            "typeTokens": [
              "motorola",
              "moto",
              "g06",
              "power",
              "lte",
              "256gb",
              "green"
            ],
            "modelFamily": "motorola_moto_g06_power",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola moto g06 power lte 4/256gb green"
          },
          "cleanTitle": "motorola moto g06 power lte 4/256gb green",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|green",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola moto g06 power lte 4/256gb green",
          "canonicalParentKey": "motorola|motorola_moto_g06_power|4gb|256gb",
          "canonicalVariantKey": "motorola|motorola_moto_g06_power|4gb|256gb|green"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 429,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/ee14a9dd-2ca1-4b45-8919-c0194339fe5e_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:58.730Z"
      }
    ]
  },
  {
    "id": "cmpl44vqv0037dsdtsa10rifh",
    "slug": "nothing-phone-4a-5g-12-256gb-black-432b0b57",
    "name": "Nothing Phone 4a 5G 12/256GB Black",
    "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|black",
    "productIdentity": {
      "ram": "12gb",
      "sku": "12_256gb",
      "brand": "nothing",
      "color": "black",
      "model": "nothing_phone_4a",
      "storage": "256gb",
      "modelCode": "12/256gb",
      "attributes": {
        "ram": [
          "12gb"
        ],
        "brand": "nothing",
        "color": "black",
        "storage": [
          "256gb"
        ],
        "skuCodes": [
          "12_256gb"
        ],
        "cleanTitle": "nothing phone 4a 5g 12/256gb black",
        "modelCodes": [
          "12/256gb"
        ],
        "typeTokens": [
          "nothing",
          "4a",
          "5g",
          "12",
          "256gb"
        ],
        "modelFamily": "nothing_phone_4a",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 4a 5g 12/256gb black"
      },
      "cleanTitle": "nothing phone 4a 5g 12/256gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 4a 5g 12/256gb black",
      "canonicalParentKey": "nothing|nothing_phone_4a|12gb|256gb",
      "canonicalVariantKey": "nothing|nothing_phone_4a|12gb|256gb|black"
    },
    "brand": "nothing",
    "model": "nothing_phone_4a",
    "imageUrl": "https://s3.zoommer.ge/site/64a55319-15ba-4a1d-9923-8a8d85a4855d_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.439Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vqy0038dsdtrajef148",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-4a-5g-12-256gb-black-p52799",
        "title": "Nothing Phone 4a 5G 12/256GB Black",
        "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|black",
        "productIdentity": {
          "ram": "12gb",
          "sku": "12_256gb",
          "brand": "nothing",
          "color": "black",
          "model": "nothing_phone_4a",
          "storage": "256gb",
          "modelCode": "12/256gb",
          "attributes": {
            "ram": [
              "12gb"
            ],
            "brand": "nothing",
            "color": "black",
            "storage": [
              "256gb"
            ],
            "skuCodes": [
              "12_256gb"
            ],
            "cleanTitle": "nothing phone 4a 5g 12/256gb black",
            "modelCodes": [
              "12/256gb"
            ],
            "typeTokens": [
              "nothing",
              "4a",
              "5g",
              "12",
              "256gb"
            ],
            "modelFamily": "nothing_phone_4a",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 4a 5g 12/256gb black"
          },
          "cleanTitle": "nothing phone 4a 5g 12/256gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 4a 5g 12/256gb black",
          "canonicalParentKey": "nothing|nothing_phone_4a|12gb|256gb",
          "canonicalVariantKey": "nothing|nothing_phone_4a|12gb|256gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1599,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/64a55319-15ba-4a1d-9923-8a8d85a4855d_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.442Z"
      }
    ]
  },
  {
    "id": "cmpl44v9p000cdsdt0zh0rwg7",
    "slug": "nothing-phone-3a-lite-5g-8-256gb-black-631cdd48",
    "name": "Nothing Phone 3a Lite 5G 8/256GB Black",
    "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|black",
    "productIdentity": {
      "ram": "8gb",
      "brand": "nothing",
      "color": "black",
      "model": "nothing_phone_3a_lite",
      "storage": "256gb",
      "variant": "lite",
      "modelCode": "8/256gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "nothing",
        "color": "black",
        "storage": [
          "256gb"
        ],
        "variant": "lite",
        "skuCodes": [],
        "cleanTitle": "nothing phone 3a lite 5g 8/256gb black",
        "modelCodes": [
          "8/256gb"
        ],
        "typeTokens": [
          "nothing",
          "3a",
          "lite",
          "5g",
          "256gb"
        ],
        "modelFamily": "nothing_phone_3a_lite",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 3a lite 5g 8/256gb black"
      },
      "cleanTitle": "nothing phone 3a lite 5g 8/256gb black",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|black",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 3a lite 5g 8/256gb black",
      "canonicalParentKey": "nothing|nothing_phone_3a_lite|8gb|256gb",
      "canonicalVariantKey": "nothing|nothing_phone_3a_lite|8gb|256gb|black"
    },
    "brand": "nothing",
    "model": "nothing_phone_3a_lite",
    "imageUrl": "https://s3.zoommer.ge/site/4f4abee3-81bb-4681-b3c4-6a98e4e25d96_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.821Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0wkq9001ytkdteknm93uh",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-3a-lite-5g-8-256gb-black-p53183",
        "title": "Nothing Phone 3a Lite 5G 8/256GB Black",
        "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|black",
        "productIdentity": {
          "ram": "8gb",
          "brand": "nothing",
          "color": "black",
          "model": "nothing_phone_3a_lite",
          "storage": "256gb",
          "variant": "lite",
          "modelCode": "8/256gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "nothing",
            "color": "black",
            "storage": [
              "256gb"
            ],
            "variant": "lite",
            "skuCodes": [],
            "cleanTitle": "nothing phone 3a lite 5g 8/256gb black",
            "modelCodes": [
              "8/256gb"
            ],
            "typeTokens": [
              "nothing",
              "3a",
              "lite",
              "5g",
              "256gb"
            ],
            "modelFamily": "nothing_phone_3a_lite",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 3a lite 5g 8/256gb black"
          },
          "cleanTitle": "nothing phone 3a lite 5g 8/256gb black",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|black",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 3a lite 5g 8/256gb black",
          "canonicalParentKey": "nothing|nothing_phone_3a_lite|8gb|256gb",
          "canonicalVariantKey": "nothing|nothing_phone_3a_lite|8gb|256gb|black"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 789,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/4f4abee3-81bb-4681-b3c4-6a98e4e25d96_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:35.632Z"
      }
    ]
  },
  {
    "id": "cmpl44v830008dsdt6yp6ty7y",
    "slug": "nothing-phone-3a-lite-5g-8-256gb-white-7762559f",
    "name": "Nothing Phone 3a Lite 5G 8/256GB White",
    "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|white",
    "productIdentity": {
      "ram": "8gb",
      "brand": "nothing",
      "color": "white",
      "model": "nothing_phone_3a_lite",
      "storage": "256gb",
      "variant": "lite",
      "modelCode": "8/256gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "nothing",
        "color": "white",
        "storage": [
          "256gb"
        ],
        "variant": "lite",
        "skuCodes": [],
        "cleanTitle": "nothing phone 3a lite 5g 8/256gb white",
        "modelCodes": [
          "8/256gb"
        ],
        "typeTokens": [
          "nothing",
          "3a",
          "lite",
          "5g",
          "256gb"
        ],
        "modelFamily": "nothing_phone_3a_lite",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 3a lite 5g 8/256gb white"
      },
      "cleanTitle": "nothing phone 3a lite 5g 8/256gb white",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|white",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 3a lite 5g 8/256gb white",
      "canonicalParentKey": "nothing|nothing_phone_3a_lite|8gb|256gb",
      "canonicalVariantKey": "nothing|nothing_phone_3a_lite|8gb|256gb|white"
    },
    "brand": "nothing",
    "model": "nothing_phone_3a_lite",
    "imageUrl": "https://s3.zoommer.ge/site/6f46e0eb-e181-44b4-b815-929ee849b302_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.763Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0wgdc001wtkdt7r7pho0g",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-3a-lite-5g-8-256gb-white-p53184",
        "title": "Nothing Phone 3a Lite 5G 8/256GB White",
        "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|white",
        "productIdentity": {
          "ram": "8gb",
          "brand": "nothing",
          "color": "white",
          "model": "nothing_phone_3a_lite",
          "storage": "256gb",
          "variant": "lite",
          "modelCode": "8/256gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "nothing",
            "color": "white",
            "storage": [
              "256gb"
            ],
            "variant": "lite",
            "skuCodes": [],
            "cleanTitle": "nothing phone 3a lite 5g 8/256gb white",
            "modelCodes": [
              "8/256gb"
            ],
            "typeTokens": [
              "nothing",
              "3a",
              "lite",
              "5g",
              "256gb"
            ],
            "modelFamily": "nothing_phone_3a_lite",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 3a lite 5g 8/256gb white"
          },
          "cleanTitle": "nothing phone 3a lite 5g 8/256gb white",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|256gb|white",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 3a lite 5g 8/256gb white",
          "canonicalParentKey": "nothing|nothing_phone_3a_lite|8gb|256gb",
          "canonicalVariantKey": "nothing|nothing_phone_3a_lite|8gb|256gb|white"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 789,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/6f46e0eb-e181-44b4-b815-929ee849b302_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:30.052Z"
      }
    ]
  },
  {
    "id": "cmpl44va9000gdsdt9s8m8zn5",
    "slug": "nothing-phone-3a-lite-5g-8-128gb-white-531f1c33",
    "name": "Nothing Phone 3a Lite 5G 8/128GB White",
    "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|128gb|white",
    "productIdentity": {
      "ram": "8gb",
      "brand": "nothing",
      "color": "white",
      "model": "nothing_phone_3a_lite",
      "storage": "128gb",
      "variant": "lite",
      "modelCode": "8/128gb",
      "attributes": {
        "ram": [
          "8gb"
        ],
        "brand": "nothing",
        "color": "white",
        "storage": [
          "128gb"
        ],
        "variant": "lite",
        "skuCodes": [],
        "cleanTitle": "nothing phone 3a lite 5g 8/128gb white",
        "modelCodes": [
          "8/128gb"
        ],
        "typeTokens": [
          "nothing",
          "3a",
          "lite",
          "5g",
          "128gb"
        ],
        "modelFamily": "nothing_phone_3a_lite",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 3a lite 5g 8/128gb white"
      },
      "cleanTitle": "nothing phone 3a lite 5g 8/128gb white",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|128gb|white",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 3a lite 5g 8/128gb white",
      "canonicalParentKey": "nothing|nothing_phone_3a_lite|8gb|128gb",
      "canonicalVariantKey": "nothing|nothing_phone_3a_lite|8gb|128gb|white"
    },
    "brand": "nothing",
    "model": "nothing_phone_3a_lite",
    "imageUrl": "https://s3.zoommer.ge/site/c63224d6-d194-4c91-93b4-d5cc8b1b6685_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.841Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0woxh0020tkdte1p6jt8a",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-3a-lite-5g-8-128gb-white-p53182",
        "title": "Nothing Phone 3a Lite 5G 8/128GB White",
        "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|128gb|white",
        "productIdentity": {
          "ram": "8gb",
          "brand": "nothing",
          "color": "white",
          "model": "nothing_phone_3a_lite",
          "storage": "128gb",
          "variant": "lite",
          "modelCode": "8/128gb",
          "attributes": {
            "ram": [
              "8gb"
            ],
            "brand": "nothing",
            "color": "white",
            "storage": [
              "128gb"
            ],
            "variant": "lite",
            "skuCodes": [],
            "cleanTitle": "nothing phone 3a lite 5g 8/128gb white",
            "modelCodes": [
              "8/128gb"
            ],
            "typeTokens": [
              "nothing",
              "3a",
              "lite",
              "5g",
              "128gb"
            ],
            "modelFamily": "nothing_phone_3a_lite",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 3a lite 5g 8/128gb white"
          },
          "cleanTitle": "nothing phone 3a lite 5g 8/128gb white",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_3a_lite|8gb|128gb|white",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 3a lite 5g 8/128gb white",
          "canonicalParentKey": "nothing|nothing_phone_3a_lite|8gb|128gb",
          "canonicalVariantKey": "nothing|nothing_phone_3a_lite|8gb|128gb|white"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 689,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/c63224d6-d194-4c91-93b4-d5cc8b1b6685_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:41.233Z"
      }
    ]
  },
  {
    "id": "cmpl44vbo000odsdt8z8jn811",
    "slug": "motorola-moto-g06-power-lte-4-256gb-tapestry-091943cc",
    "name": "Motorola Moto G06 Power LTE 4/256GB Tapestry",
    "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|gray",
    "productIdentity": {
      "ram": "4gb",
      "brand": "motorola",
      "color": "gray",
      "model": "motorola_moto_g06_power",
      "storage": "256gb",
      "modelCode": "4/256gb",
      "attributes": {
        "ram": [
          "4gb"
        ],
        "brand": "motorola",
        "color": "gray",
        "storage": [
          "256gb"
        ],
        "skuCodes": [],
        "cleanTitle": "motorola moto g06 power lte 4/256gb gray",
        "modelCodes": [
          "4/256gb"
        ],
        "typeTokens": [
          "motorola",
          "moto",
          "g06",
          "power",
          "lte",
          "256gb",
          "gray"
        ],
        "modelFamily": "motorola_moto_g06_power",
        "categorySlug": "mobiles",
        "normalizedTitle": "motorola moto g06 power lte 4/256gb gray"
      },
      "cleanTitle": "motorola moto g06 power lte 4/256gb gray",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|gray",
      "categorySlug": "mobiles",
      "normalizedTitle": "motorola moto g06 power lte 4/256gb gray",
      "canonicalParentKey": "motorola|motorola_moto_g06_power|4gb|256gb",
      "canonicalVariantKey": "motorola|motorola_moto_g06_power|4gb|256gb|gray"
    },
    "brand": "motorola",
    "model": "motorola_moto_g06_power",
    "imageUrl": "https://s3.zoommer.ge/site/7755e3ea-01e2-45ed-b7ab-a85ad13608b1_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 94,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:23.892Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpg0xwq9002xtkdtogy2rlk0",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/motorola-moto-g06-power-lte-4-256gb-tapestry-p53103",
        "title": "Motorola Moto G06 Power LTE 4/256GB Tapestry",
        "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|gray",
        "productIdentity": {
          "ram": "4gb",
          "brand": "motorola",
          "color": "gray",
          "model": "motorola_moto_g06_power",
          "storage": "256gb",
          "modelCode": "4/256gb",
          "attributes": {
            "ram": [
              "4gb"
            ],
            "brand": "motorola",
            "color": "gray",
            "storage": [
              "256gb"
            ],
            "skuCodes": [],
            "cleanTitle": "motorola moto g06 power lte 4/256gb gray",
            "modelCodes": [
              "4/256gb"
            ],
            "typeTokens": [
              "motorola",
              "moto",
              "g06",
              "power",
              "lte",
              "256gb",
              "gray"
            ],
            "modelFamily": "motorola_moto_g06_power",
            "categorySlug": "mobiles",
            "normalizedTitle": "motorola moto g06 power lte 4/256gb gray"
          },
          "cleanTitle": "motorola moto g06 power lte 4/256gb gray",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "motorola|motorola_moto_g06_power|4gb|256gb|gray",
          "categorySlug": "mobiles",
          "normalizedTitle": "motorola moto g06 power lte 4/256gb gray",
          "canonicalParentKey": "motorola|motorola_moto_g06_power|4gb|256gb",
          "canonicalVariantKey": "motorola|motorola_moto_g06_power|4gb|256gb|gray"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 429,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/7755e3ea-01e2-45ed-b7ab-a85ad13608b1_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:10:53.082Z"
      }
    ]
  },
  {
    "id": "cmpl44vq80032dsdtw68t192y",
    "slug": "nothing-phone-4a-5g-12-256gb-white-7dca0266",
    "name": "Nothing Phone 4a 5G 12/256GB White",
    "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|white",
    "productIdentity": {
      "ram": "12gb",
      "sku": "12_256gb",
      "brand": "nothing",
      "color": "white",
      "model": "nothing_phone_4a",
      "storage": "256gb",
      "modelCode": "12/256gb",
      "attributes": {
        "ram": [
          "12gb"
        ],
        "brand": "nothing",
        "color": "white",
        "storage": [
          "256gb"
        ],
        "skuCodes": [
          "12_256gb"
        ],
        "cleanTitle": "nothing phone 4a 5g 12/256gb white",
        "modelCodes": [
          "12/256gb"
        ],
        "typeTokens": [
          "nothing",
          "4a",
          "5g",
          "12",
          "256gb"
        ],
        "modelFamily": "nothing_phone_4a",
        "categorySlug": "mobiles",
        "normalizedTitle": "nothing phone 4a 5g 12/256gb white"
      },
      "cleanTitle": "nothing phone 4a 5g 12/256gb white",
      "confidence": 100,
      "productType": "mobile_phone",
      "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|white",
      "categorySlug": "mobiles",
      "normalizedTitle": "nothing phone 4a 5g 12/256gb white",
      "canonicalParentKey": "nothing|nothing_phone_4a|12gb|256gb",
      "canonicalVariantKey": "nothing|nothing_phone_4a|12gb|256gb|white"
    },
    "brand": "nothing",
    "model": "nothing_phone_4a",
    "imageUrl": "https://s3.zoommer.ge/site/1a7fd76d-d0b2-4d44-912d-92b5dd2bcdde_Thumb.jpeg",
    "category": {
      "id": "mobiles",
      "slug": "mobiles",
      "nameKa": "áƒ›áƒáƒ‘áƒ˜áƒšáƒ£áƒ áƒ”áƒ‘áƒ˜",
      "nameEn": "Mobiles"
    },
    "popularityScore": 0,
    "manualCategoryId": null,
    "categoryLocked": false,
    "categoryConfidence": 86,
    "categoryNeedsReview": false,
    "categorySuggestedSlug": "mobiles",
    "categoryReason": "Clean variant pipeline attached this exact purchasable variant.",
    "categoryMatchedRules": null,
    "categorySourceSignals": null,
    "matchingLocked": false,
    "isPublic": true,
    "needsReview": false,
    "archivedAt": null,
    "reviewedAt": null,
    "crossStoreCheckedAt": null,
    "checkedShopsCount": 0,
    "totalEnabledShopsCount": 0,
    "missingOfferDiscoveryStatus": "PENDING",
    "updatedAt": "2026-05-25T11:18:24.416Z",
    "offerCount": 1,
    "offers": [
      {
        "id": "cmpl44vqd0033dsdtfjp27kbp",
        "shop": {
          "id": "cmpfywl29000etkdt5s1743hq",
          "slug": "zoommer",
          "name": "Zoommer",
          "baseUrl": "https://zoommer.ge",
          "logoUrl": null,
          "enabled": true,
          "reliabilityLabel": "áƒ¡áƒáƒ¯áƒáƒ áƒ áƒ™áƒáƒ¢áƒáƒšáƒáƒ’áƒ˜",
          "needsConfiguration": false,
          "lastScrapedAt": "2026-05-25T11:12:10.138Z",
          "lastIngestedAt": "2026-05-25T11:12:10.138Z",
          "ingestionStatus": "SUCCESS",
          "createdAt": "2026-05-21T20:53:08.385Z",
          "updatedAt": "2026-05-25T11:12:10.144Z"
        },
        "url": "https://zoommer.ge/mobiluri-telefonebi/nothing-phone-4a-5g-12-256gb-white-p52801",
        "title": "Nothing Phone 4a 5G 12/256GB White",
        "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|white",
        "productIdentity": {
          "ram": "12gb",
          "sku": "12_256gb",
          "brand": "nothing",
          "color": "white",
          "model": "nothing_phone_4a",
          "storage": "256gb",
          "modelCode": "12/256gb",
          "attributes": {
            "ram": [
              "12gb"
            ],
            "brand": "nothing",
            "color": "white",
            "storage": [
              "256gb"
            ],
            "skuCodes": [
              "12_256gb"
            ],
            "cleanTitle": "nothing phone 4a 5g 12/256gb white",
            "modelCodes": [
              "12/256gb"
            ],
            "typeTokens": [
              "nothing",
              "4a",
              "5g",
              "12",
              "256gb"
            ],
            "modelFamily": "nothing_phone_4a",
            "categorySlug": "mobiles",
            "normalizedTitle": "nothing phone 4a 5g 12/256gb white"
          },
          "cleanTitle": "nothing phone 4a 5g 12/256gb white",
          "confidence": 100,
          "productType": "mobile_phone",
          "canonicalKey": "nothing|nothing_phone_4a|12gb|256gb|white",
          "categorySlug": "mobiles",
          "normalizedTitle": "nothing phone 4a 5g 12/256gb white",
          "canonicalParentKey": "nothing|nothing_phone_4a|12gb|256gb",
          "canonicalVariantKey": "nothing|nothing_phone_4a|12gb|256gb|white"
        },
        "matchStatus": "CONFIRMED",
        "matchConfidence": 100,
        "verificationStatus": "CONFIRMED",
        "currentPrice": 1599,
        "oldPrice": null,
        "discountPercent": 0,
        "currency": "GEL",
        "availability": "IN_STOCK",
        "imageUrl": "https://s3.zoommer.ge/site/1a7fd76d-d0b2-4d44-912d-92b5dd2bcdde_Thumb.jpeg",
        "lastSeenAt": "2026-05-25T11:18:24.421Z"
      }
    ]
  }
] as unknown as ProductView[];

