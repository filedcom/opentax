import { z } from "zod";

const reviewedDocuments = [
  {
    "path": "docs/mef/ty2025/domains/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "48d096cd02afa373f3a74f84cdf39b5c8f4feefe0a20ddba46717bdd311637e7",
  },
  {
    "path": "docs/mef/ty2025/domains/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "6bc7a5f83702c3d21ba87285e132b5bba62d337d5b3c83d9b9c194a465b94701",
  },
  {
    "path": "docs/mef/ty2025/domains/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "4d36d31877042b3bd57a8f7091bb45c5097f6cc6415096b648986158446ebb99",
  },
  {
    "path": "docs/mef/ty2025/domains/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "732312f1c012d6020ac7df4d529435dafb422322972b659cc4988a97f20bdd06",
  },
  {
    "path": "docs/mef/ty2025/domains/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "5ce606e077b9419b006e648f0c5d37fb681090b786c12f3faa687f8a3a1a9aa1",
  },
  {
    "path": "docs/mef/ty2025/domains/payments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "497915f8e879caac71bec7d0f92b24e3192facaad6fe1b7e7b6f57703b84de3d",
  },
  {
    "path": "docs/mef/ty2025/domains/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "f2ef77799751b6571e36563a2acd8464ee9e02ede9347097a78bc49589511eaa",
  },
  {
    "path": "forms/f1040/2025/domains/README.md",
    "operation": "replace",
    "beforeSha256":
      "48e2928c62fec2d98c825cf61298acb17526e58d8030162e5e1769553fc146b3",
    "afterSha256":
      "9bc2b00788708c7071e5288df85a62f7f09cd973a4abfa8fd1483fe11740c704",
  },
  {
    "path": "forms/f1040/2025/domains/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "a8b4919e608e3ce30b50cda17add979c991922190c42b86388bd59d87ee02aad",
  },
  {
    "path": "forms/f1040/2025/domains/adjustments/health/README.md",
    "operation": "replace",
    "beforeSha256":
      "7a67bd769d4cf50d0c37386157d6e23c6cc343ace15f81138d6cac939f315d69",
    "afterSha256":
      "2eea8b9936f103e6dd2ffb3019b114aaffe1b4610f0b447097f798626d5675f1",
  },
  {
    "path": "forms/f1040/2025/domains/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "865cd920cdb0a90800406703a55f8c8549ce7b8827db03832caadacbe78f9323",
  },
  {
    "path": "forms/f1040/2025/domains/credits/individual/README.md",
    "operation": "replace",
    "beforeSha256":
      "014b02fdd986ec982ddc5ca8dc61df1cab601b607a46c2b27e07e2242fe97535",
    "afterSha256":
      "744c3c3268761aa9511322303673ce7779708474f70f21f6776b4039f94dddc9",
  },
  {
    "path": "forms/f1040/2025/domains/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "f4b48395788b68e4e8e7d0b49446eede5f26ec8e8d4f2df66faa8d69f9614e99",
  },
  {
    "path": "forms/f1040/2025/domains/deductions/itemized/README.md",
    "operation": "replace",
    "beforeSha256":
      "485e461ac3ec9b154d92f9202caa44b1a275a7ea2688068b1fe176b7df6feb53",
    "afterSha256":
      "95726fe76a3e4f4a6bc2048965b9991c6a735cde61d73ce432709f665a968652",
  },
  {
    "path": "forms/f1040/2025/domains/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "7c4121d3b703bc3741def5044f3fe7c28a029a95474e25240cf259c876c9f62f",
  },
  {
    "path": "forms/f1040/2025/domains/general/foreign/README.md",
    "operation": "replace",
    "beforeSha256":
      "116f4eaf6e78e3e53508134dcbef96a63671420426151f643f7977dcf45f0067",
    "afterSha256":
      "2467448351c9bc1d9fe55acb43efde450115a2492cfda23b4a7e001ca2297bf9",
  },
  {
    "path": "forms/f1040/2025/domains/general/return-assembly/README.md",
    "operation": "replace",
    "beforeSha256":
      "fe1677bc2100e88ed7a0386c652970eba0b52b618f1215cb7932f789ab645cd7",
    "afterSha256":
      "d6753485941a6b0846fd5a1c3d00d6eb2bd4d53eb3ecba2d303a8d24cac5b8dc",
  },
  {
    "path": "forms/f1040/2025/domains/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "89d2e1829c68f1844f2c5c403c75e2ee91845d78ae51422e6b847592353c2d32",
  },
  {
    "path": "forms/f1040/2025/domains/income/business/README.md",
    "operation": "replace",
    "beforeSha256":
      "a8eccc73918434cd067f696da9c919c6bef38b7b34dcd0d4b4004dbd8ad52854",
    "afterSha256":
      "0cba4c5a2ea7f01c377415ea8ac8629e5d731153ad010c3a4df09b68c26c24ef",
  },
  {
    "path": "forms/f1040/2025/domains/income/investments/README.md",
    "operation": "replace",
    "beforeSha256":
      "c52a517bdb69c1bbded1121e23263f1ad1a768b069d5a644f4be62c31ee9ea63",
    "afterSha256":
      "5840c04880afbc34758c6a66e73098cbb6e88d812a3e09bdcec7c6cec242ab04",
  },
  {
    "path": "forms/f1040/2025/domains/income/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "ce6f42883ea64ff0c4d2b796780e1e98584b6bbde2a5cc8e21c0d722fbeb8742",
    "afterSha256":
      "1574921c0427e017edd4593a1a0a62afd0d3ab5a1899ea0b27e18baac5c7543e",
  },
  {
    "path": "forms/f1040/2025/domains/income/retirement/README.md",
    "operation": "replace",
    "beforeSha256":
      "4d09b3ac2fadc10f8d2e0e26138ce649060861ddc383d38921938daac8eafa78",
    "afterSha256":
      "82779acdb59e6cbfa6e1bbc3c301eff414acae023a90b1682d981585bdc3ed33",
  },
  {
    "path": "forms/f1040/2025/domains/payments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "520b364db6587092cbefd05ec234b0aaa4463591c0418a42d33659b77d60ed28",
  },
  {
    "path": "forms/f1040/2025/domains/payments/settlement/README.md",
    "operation": "replace",
    "beforeSha256":
      "910ff6e9e68993669d73c7f0f65728fb44cfbe02316362ace425a49bf5e0defe",
    "afterSha256":
      "ab477081c2973680065e937cd66f9e9108a0fe5d71a053dd9e7579d290945f4f",
  },
  {
    "path": "forms/f1040/2025/domains/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "c7fb74fb736dea08fca4ad6fdede25546fcd7be5c7f4716d18237400618d89c1",
  },
  {
    "path": "forms/f1040/2025/domains/taxes/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "2bedcb10dfcf858a6c1564995dbc2f1861c4bc27163e0d383910f898d0b4baf4",
    "afterSha256":
      "7ee3ed3dced4e3762e3d91d40bd51bc4217aad8df41ec8c1d88c64d31bdbd23c",
  },
  {
    "path": "forms/f1040/2025/mef/forms/README.md",
    "operation": "replace",
    "beforeSha256":
      "31dca36b01d1ef272f426733d6c87c0144bf382798d12048c4572a5f016d0dfd",
    "afterSha256":
      "69bb24a255bf021c7a41f99749b63e0f0067b050405af25351e9630db6c6af32",
  },
  {
    "path": "forms/f1040/2025/mef/forms/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "ec19e5464e9d95e6ab6f60305ba4232687a3a8d91767bded911998c477df5685",
  },
  {
    "path": "forms/f1040/2025/mef/forms/adjustments/health/README.md",
    "operation": "replace",
    "beforeSha256":
      "fcb7d65a3dc9c969ac13cf69bacc4b2f690724bfa8b8bd4b984049eb0bca9b72",
    "afterSha256":
      "480d7dc0fd5aefe2b5c732c323821710a1fdc15f89a1bfca0c7f07934518f89c",
  },
  {
    "path": "forms/f1040/2025/mef/forms/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "aff05ea09c66de369c2c697df0f4e072571cb9717a24c7792b30e7e1af75de07",
  },
  {
    "path": "forms/f1040/2025/mef/forms/credits/individual/README.md",
    "operation": "replace",
    "beforeSha256":
      "5015a7f6eebe8fcaa8585b8aa590a1bb643565e5ace412484be842c98125b4ac",
    "afterSha256":
      "fc0f1f08b13a28a680ad6d917f9c5300cc00acd2d367a2b36bdae200025a63c3",
  },
  {
    "path": "forms/f1040/2025/mef/forms/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "2d18459b0dc96708e2b7c394b66f49d9f92177fccefa2b7492e760187e702b9f",
  },
  {
    "path": "forms/f1040/2025/mef/forms/deductions/itemized/README.md",
    "operation": "replace",
    "beforeSha256":
      "523a4b330470afe32bfb2251ac860d5d2189e81b5fa9da057e6bed82d79681b3",
    "afterSha256":
      "1040ad9892ce7e6de56c2e02d876e3c96c315d265c30f6a0a8b91b18754faf81",
  },
  {
    "path": "forms/f1040/2025/mef/forms/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "5466e9dba9868022080061b70178e003d180f52bb7806b2f687888860b6c8733",
  },
  {
    "path": "forms/f1040/2025/mef/forms/general/foreign/README.md",
    "operation": "replace",
    "beforeSha256":
      "194532d96d707718b965534bd48ef3e51c6259c871ea0e07dc31402a8011d453",
    "afterSha256":
      "99c8d3fa3b43cbe8375e7e81c124e1d37c1ad46bbe96dab88dbacfc871718120",
  },
  {
    "path": "forms/f1040/2025/mef/forms/general/return-assembly/README.md",
    "operation": "replace",
    "beforeSha256":
      "d111b31c6a359f86074aaaa41fb91a19b0093ea7d1155d3ad09fd1726f7b00df",
    "afterSha256":
      "1a2d25284c7c6d1f273dccc13ccee4c39b3f7aa1164c272d0c8ed58c6e54b082",
  },
  {
    "path": "forms/f1040/2025/mef/forms/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "49d21bf0fa0d99241ac502d12c33a9b38d39ba3276894ce481cec0143d929f81",
  },
  {
    "path": "forms/f1040/2025/mef/forms/income/business/README.md",
    "operation": "replace",
    "beforeSha256":
      "2fdca906589c28a16b13f922fa08208370e066cc71c1047ee3c33eef15bbf180",
    "afterSha256":
      "a3a96b3f130c95345ede3fd94e218c508fff8edf1b04fbafdcb26759c67584c0",
  },
  {
    "path": "forms/f1040/2025/mef/forms/income/investments/README.md",
    "operation": "replace",
    "beforeSha256":
      "c81a714c207afbacd5f922d922435a8f6d3a348a925d7d228c521dcc4106f927",
    "afterSha256":
      "0f350fcdfd0454c5fafd6844a7eb638661d67e628ccb14364f3e83fecae33f83",
  },
  {
    "path": "forms/f1040/2025/mef/forms/income/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "0a08b4717bb3fc1704c281053d9493d1f3371f496398c8ede2ae0151fa3051ce",
    "afterSha256":
      "9a3f6a060b2d5f01b4928db6579c6fcf018807129d9ac2603806eaf65952b6ec",
  },
  {
    "path": "forms/f1040/2025/mef/forms/income/retirement/README.md",
    "operation": "replace",
    "beforeSha256":
      "1dacf521b7208380fe09ab5a40e21fc40e90f9949b6b73cb4dba752998ec8da0",
    "afterSha256":
      "c7b2a8c92720de31375f785bacd2ab5a4f8ec216f0006bf8a14313ca6ca1cd84",
  },
  {
    "path": "forms/f1040/2025/mef/forms/payments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "42b9252ff6d415e2e74e4a619d6fed9cb5ff215297a91efbb0c05dcce1b7ee2c",
  },
  {
    "path": "forms/f1040/2025/mef/forms/payments/settlement/README.md",
    "operation": "replace",
    "beforeSha256":
      "1a32ec9a3cd1a0ef5a2704a711919787532c2e9b3e3db019df53310f3f5d1ebf",
    "afterSha256":
      "e71b7ab8b2896869ebed0fb857d1954b9d2e41888e10523fc768e5234d1c4b77",
  },
  {
    "path": "forms/f1040/2025/mef/forms/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "421ae512c60db23075f9efd78d396d0973018e30efc34e481dec07d23d90f00b",
  },
  {
    "path": "forms/f1040/2025/mef/forms/taxes/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "7d976f364a890f930566744bac2edfaf558d55f60fc69e495183e83bb4a72c9f",
    "afterSha256":
      "02d1547f69afa91f981dc13d798d6508b21a4c6f9cb49a454c2b7a12e77f7e56",
  },
  {
    "path": "forms/f1040/2025/mef/support/README.md",
    "operation": "replace",
    "beforeSha256":
      "9d5ccdcf854555c1df2ef1b7ce882a45c0daaf31abd844fef9c0c8c89c87a582",
    "afterSha256":
      "3bece6463a05938dceccf21818f5be9101f86b0f97a6c1d576a9922c7647ec57",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/README.md",
    "operation": "replace",
    "beforeSha256":
      "d9d0b9fff24aa7a81424c8d568fa6068aec1fc4b4ba3d9135c073084e07d2c60",
    "afterSha256":
      "69bb24a255bf021c7a41f99749b63e0f0067b050405af25351e9630db6c6af32",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "4a298d6f4d172305a482243af8a6b93f93da822286214051fca00f8fceaffdbc",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/adjustments/health/README.md",
    "operation": "replace",
    "beforeSha256":
      "49fbb791ccda5a1a98a5d83ef274331a0caaa9b4d1871f92e815add47021e5ff",
    "afterSha256":
      "3085c355e06cf30660b9b4430cc727d814a41dcf216b3ddfa97a52cada8eb1a9",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "32d4b2f64f76e4b9b6e3d2816fc579aaa90300608c4af60a13252a55b95c730b",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/credits/individual/README.md",
    "operation": "replace",
    "beforeSha256":
      "931a36b6ac0294a53cfd72ca22dbbf6603b913456be4fee05d5eb5e8614b7c66",
    "afterSha256":
      "3ccb2f5cdbf2e55762c3e921bf96cb213843cb9bc7f837925e140daa1b953497",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "925dd9bb27b098fdd37599bf1c0c38cff42ccfa6f4da81c3a6ff03783682442f",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/deductions/itemized/README.md",
    "operation": "replace",
    "beforeSha256":
      "f9be4c365bd803f025371cf9bad6a9b0cd36c898be6c3939314b78588e025933",
    "afterSha256":
      "ee4758a76fbafa023f0a7ce35942db08365a4106c861c168029c0cdb085f4b49",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "81ab455eef66658fab117737fda154154c44a3fa75be1a3be40b7b3c60eac960",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/general/foreign/README.md",
    "operation": "replace",
    "beforeSha256":
      "1747223c336b50e8b31bd3cbea1ffb71995fcdacdf4fd34bd6c8eee00d786c85",
    "afterSha256":
      "bdb862933916e0691fc811a72cb6db22bf84f9c5c20b24cf49110cc9a76733fe",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/general/return-assembly/README.md",
    "operation": "replace",
    "beforeSha256":
      "eeba3c9e2b29391d25a7651167311743cb2cf5ca80798069fa4cdc1dfc824488",
    "afterSha256":
      "e734aaef056b927314c9984c3fcc2e50474527b3412bee005a62f3eccc7ec987",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "a8d82379ab4dde69c1ca3121acdc91f6a182c28284c271243f1b29d3915611f8",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/income/business/README.md",
    "operation": "replace",
    "beforeSha256":
      "47ee9019d9432ab332d89b0e4213a36fcfb8a1e974e98d359a80c0c991f8ecb7",
    "afterSha256":
      "5c52fce9164da05847174b4c84315bc646aceb23ca651f05ef7170ef4acf0fd2",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/income/investments/README.md",
    "operation": "replace",
    "beforeSha256":
      "9bd13c66b925fa1af9fb178b3ffc058c4b217bc08818952243a6e608797c18a2",
    "afterSha256":
      "1eccfb430849554792a23a12de91fa15dce7ebba5bd28f18ddcd7872322022f5",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/income/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "47936adb27dc690bc02318105159f4b866f8df8a244351c03d42a797b613dd6a",
    "afterSha256":
      "8b7b87ef326c018e34f320d4edd91fdf8824b4ba13b857baef864aa22a76b214",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/income/retirement/README.md",
    "operation": "replace",
    "beforeSha256":
      "f78d3b469e356acfbffbf7515fe95af1f665e68fe49dd8627fec696256a1d51c",
    "afterSha256":
      "528e34efba68956f55ef58b53f65477ca1680e42486a1f0b73054e638d6d1695",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/payments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "67f2821b174c1bf7141ae4de6408000a4807de731618b2ff9b974514ea60c1ab",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/payments/settlement/README.md",
    "operation": "replace",
    "beforeSha256":
      "02b3c1d645802dad58f4d0f1fa397445ca7abe0ed3af214d0d2aede6aa4d562c",
    "afterSha256":
      "4ce51cdb5f047045d918913f0fb920ba97cb29855f51bf86f27483b47c0cf02f",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "39e19ea9f1771475322e729e7803653523fb4d66d4cf37e2c22a76692fb195b1",
  },
  {
    "path": "forms/f1040/2025/pdf/forms/taxes/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "05de790a786a282a3ac1e03db3c847ec006083880a5e6c6268fa593a2775d3a7",
    "afterSha256":
      "5270e65382e8bb36a1578a4c95e90a1310a2b56d7ec354b96a3ff94feb2243dc",
  },
  {
    "path": "forms/f1040/2025/pdf/review-support/README.md",
    "operation": "replace",
    "beforeSha256":
      "d41ae607aefec3cee5a8497dd15459efd17c6afd9ee26ccfbab5ec93b64ec422",
    "afterSha256":
      "4e26ab56317f4408bec6f35ce5c879173d3062854e4a13ac18cf1e1752cf744c",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/README.md",
    "operation": "replace",
    "beforeSha256":
      "35207bb30ce1af74bef732041ae42754772cf9d1a10daa7eb8f21f2b73dd94ea",
    "afterSha256":
      "8b1510814df12b005378e4a7cfae4df03ebb0c71c2b3afd0d40092c072025104",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "9dc21249cf7facd76ea6b02fe1f88af673b5efbe7bcf93116857939df0dd65b2",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/adjustments/health/README.md",
    "operation": "replace",
    "beforeSha256":
      "59350cf7f545c45af79f6d1517cb6179bb3182b486915048cd2076b6998d1ddc",
    "afterSha256":
      "a65bb33564089ad962081c373dc864b026410ccba6404a979a12594e254ef4a5",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "16342beb2368f1df822d98ecf27bec181815614ad26ef5f1d8574410a4100896",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/credits/individual/README.md",
    "operation": "replace",
    "beforeSha256":
      "d0f7fd37a9183f72c105f07e95e12062fddcd9a66128b1150431176142bc0551",
    "afterSha256":
      "6e3faac012a3dbded4c686714c30424eb88c1552a614164da90a5b9ea5cee404",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "6ea51d87125e2bd832b3724b3533cca0f39927da6970025a56bd83bc00756c79",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/deductions/itemized/README.md",
    "operation": "replace",
    "beforeSha256":
      "c5240134da2b775d694a4b0ae69e42e50caaec47535cc420c5a524fa00d87ab2",
    "afterSha256":
      "5ee32bc3f341578125682e80b1cf5d87ac03e1d6fd9d6a5038439a79c980c014",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "8818fe741eedad8dfc4b785c91a3ee83f9186e8f033a1f6e9bbbd29089582021",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/general/composed-returns/README.md",
    "operation": "replace",
    "beforeSha256":
      "931b322c9454c281d0c5cec59dbbe5c4dcf12bff50f774b5d47ccf516efd2afc",
    "afterSha256":
      "e8db3d72371c15e4282fe0a73f802dd9fb53be5c9de0e5b8081e74f44e8e8e13",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/general/return-assembly/README.md",
    "operation": "replace",
    "beforeSha256":
      "467e429a853a8fff3231c36e69ebe2653d8bb8fcb8cd00db023718a6fedcd101",
    "afterSha256":
      "7a6db9cca327ebc29002a75c05d732501e13975276bbe7f43fb4b65f0845476c",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "8c424effc6731da65212f36866f9250536538aa338232ddc9ba1686362c50a73",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/income/business/README.md",
    "operation": "replace",
    "beforeSha256":
      "c22f2228fb126283595d2c5b4df27e84261c91a0b59f1e2f17f56c7f108c32f1",
    "afterSha256":
      "5457985c5f725c4fffa65491ed1051c872310fdef95d6fab6ee2c922302b8451",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/income/investments/README.md",
    "operation": "replace",
    "beforeSha256":
      "59a02ec4425752bb6fc3314bcb74900bd493489a7ce8423e286935029c744165",
    "afterSha256":
      "d14124ab91454e380d868b6847b02b9fe0d2c765f9152c2fca62d905cc1c984b",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/income/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "8c944f92e1b893441ad97cd24c938dcdfe5bec9d86eb41c8a9cd704f9ff15533",
    "afterSha256":
      "34a05555dffe75e8dd7c6d7c64d624418bb4497f0772f54000c61bf1e9c0768f",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/income/retirement/README.md",
    "operation": "replace",
    "beforeSha256":
      "e79c371e7e33b506f536191216450376bf0a2c14079b4d7bcb7d7689a3cf7547",
    "afterSha256":
      "3729b942f4a6b5c39fab3d895c6f3ca86cb3cd9c70c210f65612ffe93456e93b",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "662d6eb5ed00bb3f7716c04b8730a3de70f8fbedc962b1e7e0d82b6186d3a4d2",
  },
  {
    "path": "forms/f1040/2025/pdf/reviews/taxes/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "5f44b9eeedd8987be98934876f03fe58e65744e3c3873797aeb04654335a1658",
    "afterSha256":
      "6d8df7f3aaeafa4f80215bf31d074b8fec072604b36dc5cc089d6fdfef78468c",
  },
  {
    "path": "forms/f1040/2025/pdf/support/README.md",
    "operation": "replace",
    "beforeSha256":
      "40d243af7028a06ce6640b54ec2c72bf0f6d342aa639e1c84ea046cf83ded3f6",
    "afterSha256":
      "b0ce9b463ee0d085ac1aeb6869d55568f03c1bc2de48a4fa092297e9f6f4a11d",
  },
  {
    "path": "forms/f1040/2025/return-processing/README.md",
    "operation": "replace",
    "beforeSha256":
      "e739b293f62e6049977fa730d6cd47e92210335bf43148252ab8573706044760",
    "afterSha256":
      "ff05db7d8d43890db7a60013d2b9ff3685bea3e6839ca44a97b765417c18d2cc",
  },
  {
    "path": "forms/f1040/e2e/README.md",
    "operation": "replace",
    "beforeSha256":
      "c2c8846c0e35aa8356b13dba8a86af74f29dae62c8e08f2f63f435747548ce25",
    "afterSha256":
      "4c3412545945e72c472e29b06e6d2836bd27013c241dbc5cb468fde82880a7bd",
  },
  {
    "path": "forms/f1040/e2e/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "d7b0a41ea4964f38c738ba23229dcb9e38a05a44091cad93400380f2fc108963",
  },
  {
    "path": "forms/f1040/e2e/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "ac2512413d51e366e846ea721796ff9b7b5f017ecc0dcd0c6c4f6ab24932bf2b",
  },
  {
    "path": "forms/f1040/e2e/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "1a9ee335c96cceb0667f45c31d8798bb38928d1d249832b8417f428731d5fbee",
  },
  {
    "path": "forms/f1040/e2e/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "6762ca5244ed4cb378d05339d61f41e20fa8d0d601c1ef236bf74c83793f746e",
  },
  {
    "path": "forms/f1040/e2e/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "3d495ae7d91193c4c5cb95409c2a74c8e3c9aa1ef8b6e081aeb615c1a81f4e9c",
  },
  {
    "path": "forms/f1040/e2e/payments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "5c31fb8487aa1c022af4c582a51a27c396443a0a7f712a57d01373e34a6b4e38",
  },
  {
    "path": "forms/f1040/e2e/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "6b4e0d84fa85cd0d09fa6e281f6cc529aab912d16e89db37bd44ab973305c6a1",
  },
  {
    "path": "forms/f1040/nodes/inputs/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "68811e0f12066544b800a4a7c22bf958661ec3f96ac7e1ccafcfd1567a00dad4",
  },
  {
    "path": "forms/f1040/nodes/inputs/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "6801a0e382c5babb07047df0148c6db56d17e63e8f8121f59fbe31a2adc71882",
  },
  {
    "path": "forms/f1040/nodes/inputs/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "e0a9373ff314ce7e18cdf637a85bb04d04a01c6a11f215c922987442b85150da",
  },
  {
    "path": "forms/f1040/nodes/inputs/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "4283e5b5d31be6ed8a67084436842b44fb6cc9573b5421008440214c1a43d88f",
  },
  {
    "path": "forms/f1040/nodes/inputs/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "cb4353b4320098cb033e53e1eecbc54f8c29824d1ac478621ba5f720b9ab2aea",
  },
  {
    "path": "forms/f1040/nodes/inputs/payments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "24042bff2af69ec4511b13900c2543b3d6e54ac7282d5dfc5d7fb5717051e1af",
  },
  {
    "path": "forms/f1040/nodes/inputs/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "3d4f78099e2506aea356d22d517312ef803cd365bf22923bfa4a3c56484aaa1f",
  },
  {
    "path": "forms/f1040/nodes/intermediate/aggregation/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "325a81e369ea7dacf81f722040b719a5d9a0b1b0a51c18c6ae8b2a5b0c558202",
  },
  {
    "path": "forms/f1040/nodes/intermediate/aggregation/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "11b2d60200800a7a9ecf47f93c699b75785227cfe15e2c8372f32f88dd5a9c67",
  },
  {
    "path": "forms/f1040/nodes/intermediate/aggregation/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "77202efc96a791a881a10bcf615b68953771fbf3ebf5fead0a74d5881d8fd0aa",
  },
  {
    "path": "forms/f1040/nodes/intermediate/forms/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "b3afe3d62e1c69cb66199c8d4b4562426b5d4dbf8ef4a7fe3307b15bce151776",
  },
  {
    "path": "forms/f1040/nodes/intermediate/forms/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "d7910ebe347866bc8988d5ba618ff7524ef9c0fb3d20ee3d6f4def2892cf7d33",
  },
  {
    "path": "forms/f1040/nodes/intermediate/forms/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "c115ff8079ee8def13ac90869e3733ad9c770656b2ee5845fdb6479b9682ed99",
  },
  {
    "path": "forms/f1040/nodes/intermediate/forms/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "597ce360ad0a98ff49637ff2975dd7c37fca4a9b64371bba59ee65c754249f25",
  },
  {
    "path": "forms/f1040/nodes/intermediate/forms/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "6c6634e733958d3d623aa3a2f27d718f6ae29301482617c727e90a7732f20627",
  },
  {
    "path": "forms/f1040/nodes/intermediate/forms/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "3bf88e7d28c41d83488b1a664bd609490f7ee6cf88178f5c86dc83d63eb58980",
  },
  {
    "path": "forms/f1040/nodes/intermediate/worksheets/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "be69ca3b64ae6c152e4910d837aa1d21ea2236dea4a91fac81a7b0669e801208",
  },
  {
    "path": "forms/f1040/nodes/intermediate/worksheets/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "b98357ef51d94cea3e3fb47802c21645640f673f01ff948850a65717b87d4647",
  },
  {
    "path": "forms/f1040/nodes/intermediate/worksheets/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "e45dd89fdc65b48fde539342322637e50cb1bb871dd2c19182f7ee14ebc80d9b",
  },
  {
    "path": "forms/f1040/nodes/outputs/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "714096076a51fb8a1f81cdf1ecb88ba8e38c438d20170c4d7d90e115a49875ef",
  },
  {
    "path": "forms/f1040/validation/rules/README.md",
    "operation": "replace",
    "beforeSha256":
      "13dee47f729699d848bc6349e7eea5313bfd89721b830eb34e5b02a935a86aab",
    "afterSha256":
      "69bb24a255bf021c7a41f99749b63e0f0067b050405af25351e9630db6c6af32",
  },
  {
    "path": "forms/f1040/validation/rules/adjustments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "433662beadd856780c8f6b9fa41aedc59ef7301bf8e0fa5e9af7a76a9daacf01",
  },
  {
    "path": "forms/f1040/validation/rules/adjustments/health/README.md",
    "operation": "replace",
    "beforeSha256":
      "dc3da4ab41103ffebf888443d86563e9dfbf6ca430ed12be22ff315e3351fe85",
    "afterSha256":
      "1ae45c620a9020f8923a8558175f589bc37ccaccc4d747381280eef7fefd4f3a",
  },
  {
    "path": "forms/f1040/validation/rules/credits/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "238d11320846db1aec9a3dd18ddc46a638cdc17f9922ccf2e9d7754a9ff783ac",
  },
  {
    "path": "forms/f1040/validation/rules/credits/individual/README.md",
    "operation": "replace",
    "beforeSha256":
      "73a5e5c9439e2d83abc8ad75f4cdc36f78f0aec323606c16c75ea8645b625622",
    "afterSha256":
      "30b01e81273993a9ddaa6d3e89f7e5a094b46c0525682dfd4c4e0747ba7b7d96",
  },
  {
    "path": "forms/f1040/validation/rules/deductions/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "6a623bce1f6b647be0fea51f5832f605137e64a8508933ba9b6ef5f00eceadb2",
  },
  {
    "path": "forms/f1040/validation/rules/deductions/itemized/README.md",
    "operation": "replace",
    "beforeSha256":
      "b23896686ddc7455938522eec68cc7b2755915832a6406b51f4fbc2dc309c0ef",
    "afterSha256":
      "80175a801350391e1affe2ac9a8eeb7915830d2bcf7f796ca73b1c5c38fb402c",
  },
  {
    "path": "forms/f1040/validation/rules/general/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "3ef40b6d6bfadc5431f3698fe67583a31f10c37badbcb87c2f4827c8e2cb2eca",
  },
  {
    "path": "forms/f1040/validation/rules/general/submission/README.md",
    "operation": "replace",
    "beforeSha256":
      "f8af8618cfb21f0e0769d593b4bd911daffae3cf32b344e002e607f45b02b33a",
    "afterSha256":
      "bd6beef69df8f10f3570bd307545015a376cb6dfc24a55cfc794fad54ad277d9",
  },
  {
    "path": "forms/f1040/validation/rules/general/submission/foreign/README.md",
    "operation": "replace",
    "beforeSha256":
      "464359bd4f80736d5058473937ae73395858aa74695ae49e8313e1ef029153e9",
    "afterSha256":
      "dbcf32045bcff811eb1317c6a860a02d291ad391dbb5eee41bcf0f47a974ad34",
  },
  {
    "path":
      "forms/f1040/validation/rules/general/submission/return-assembly/README.md",
    "operation": "replace",
    "beforeSha256":
      "d765cfd7823be9c2d583835a37985a06eb541250a714ab5e5365de61028e7c42",
    "afterSha256":
      "40b8bb403362daf5ce9e00c3275c70e11514cf8626fdc8201da4282d9f6e54b1",
  },
  {
    "path": "forms/f1040/validation/rules/income/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "7f6f000d1ac82c1366999a792c9b6cbc3d234c4e77c8ca2e9c9a99576edf89e5",
  },
  {
    "path": "forms/f1040/validation/rules/income/business/README.md",
    "operation": "replace",
    "beforeSha256":
      "e3796f746a1ce1647d43fae77b4c8d2046d78f0fce1986ff8c970ef95dcd1734",
    "afterSha256":
      "508133d515ce2e5d8ecfe7da42faa2be54bbd45405464e72b46f7bdab2033ab6",
  },
  {
    "path": "forms/f1040/validation/rules/income/investments/README.md",
    "operation": "replace",
    "beforeSha256":
      "61b7e23595ebf05eb1b27ee45a6eac41917142ecd0e9e447bd68209d8153914e",
    "afterSha256":
      "1c891e94c2f1bc5cc0666264b74538a4b78b9ddba0e02609a1eb9032758dc157",
  },
  {
    "path": "forms/f1040/validation/rules/income/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "ccfbffdc2eebdee8f202d0c0f13252c5f05647fa3a5c68fdced11cd24079b8c0",
    "afterSha256":
      "2191215a210403134f0bff5ab8d952ebb008d284ccc34f484966845cb4d8a94d",
  },
  {
    "path": "forms/f1040/validation/rules/income/retirement/README.md",
    "operation": "replace",
    "beforeSha256":
      "c1a4e428a07cb0694b821fbf482c9f4970b8ef7e9e7d3219c6c1a836b0d6ee1b",
    "afterSha256":
      "55449c9649957f623178e55c8e5a912cb76ebb587eb0857fbf3733baab5469cd",
  },
  {
    "path": "forms/f1040/validation/rules/payments/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "079c9df238c58b5108839d8de0a80860816ef55e593562b5a5132cf774a87135",
  },
  {
    "path": "forms/f1040/validation/rules/payments/settlement/README.md",
    "operation": "replace",
    "beforeSha256":
      "c42761b1d52e4163831bd75569fcec6c18bd744d9b2b4207ce0696f0e85acf56",
    "afterSha256":
      "dcf8f2c2f0150833b3248a59c10543084b6d88d6ecd97d8f36b5dd240d6535c0",
  },
  {
    "path": "forms/f1040/validation/rules/taxes/README.md",
    "operation": "create",
    "beforeSha256":
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "afterSha256":
      "bea8d4dc648ce17ffecfdb7984094cf153e61ca5517f9e4595d740ba2adc62f2",
  },
  {
    "path": "forms/f1040/validation/rules/taxes/other/README.md",
    "operation": "replace",
    "beforeSha256":
      "447b732eb9a478576a6a822d976b06442422922e3a9b43358d305eac0ac79196",
    "afterSha256":
      "4e617c1bf649824a82044e69d1a806d5ddeead561891317e431d817ad2d94710",
  },
  {
    "path": "docs/architecture/repository-organization.md",
    "operation": "replace",
    "beforeSha256":
      "c73d6228167a213ca4ef983b3d0eb96cd15eb3bab689f135bab0fb4490e61460",
    "afterSha256":
      "890071897ec3c1cd24a4934fd89b615a1e548de91ce43b5a922d31945db36ce2",
  },
  {
    "path": "docs/architecture/STRUCTURE.md",
    "operation": "replace",
    "beforeSha256":
      "d470a849d4e3c418996c44dd1fe8684471612f9fa78accb0fa94529061671ad5",
    "afterSha256":
      "eb81671cce277acf249105944d3d69a646edad83f4fb163154b811d4e6f194ea",
  },
] as const;

export const documentationPatchSchema = z.object({
  path: z.string().min(1),
  operation: z.enum(["replace", "create"]),
  beforeSource: z.string(),
  afterSource: z.string(),
  beforeSha256: z.string().regex(/^[a-f0-9]{64}$/),
  afterSha256: z.string().regex(/^[a-f0-9]{64}$/),
  reason: z.string().min(1),
}).strict();
export type DocumentationPatch = z.infer<typeof documentationPatchSchema>;

export const reviewedDocumentationPaths: readonly string[] = reviewedDocuments
  .map((document) => document.path);

const bindings = new Map<string, typeof reviewedDocuments[number]>(
  reviewedDocuments.map((document) => [document.path, document]),
);

async function hash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Exact reviewed v12 prose is separate from mechanical source-path replay. */
export async function assertDocumentationPatch(
  value: unknown,
): Promise<DocumentationPatch> {
  const patch = documentationPatchSchema.parse(value);
  const binding = bindings.get(patch.path);
  if (!binding || patch.operation !== binding.operation) {
    throw new Error(
      `Documentation outside exact reviewed boundary: ${patch.path}`,
    );
  }
  if (
    patch.beforeSha256 !== binding.beforeSha256 ||
    patch.afterSha256 !== binding.afterSha256 ||
    await hash(patch.beforeSource) !== binding.beforeSha256 ||
    await hash(patch.afterSource) !== binding.afterSha256
  ) {
    throw new Error(`Reviewed documentation bytes differ: ${patch.path}`);
  }
  return patch;
}

type DocumentationContext = {
  files: ReadonlyArray<{ new: string; afterSource: string }>;
  inventory?: { before: string[]; after: string[] };
  additions: ReadonlyArray<{ path: string }>;
};

export async function assertMigrationDocuments(
  values: readonly unknown[],
  context: DocumentationContext,
  actualSources: ReadonlyMap<string, string>,
): Promise<ReadonlyMap<string, DocumentationPatch>> {
  const patches = new Map<string, DocumentationPatch>();
  for (const value of values) {
    const patch = await assertDocumentationPatch(value);
    if (patches.has(patch.path)) {
      throw new Error(`Duplicate documentation patch: ${patch.path}`);
    }
    if (!context.inventory?.after.includes(patch.path)) {
      throw new Error(
        `Documentation absent from final inventory: ${patch.path}`,
      );
    }
    if (patch.operation === "create") {
      if (
        context.inventory.before.includes(patch.path) ||
        !context.additions.some((addition) => addition.path === patch.path) ||
        patch.beforeSource !== "" ||
        context.files.some((file) => file.new === patch.path)
      ) {
        throw new Error(
          `Invalid reviewed documentation addition: ${patch.path}`,
        );
      }
    } else {
      const file = context.files.find((file) => file.new === patch.path);
      // Retained stage-one additions and untouched original documents can lack
      // a source replay entry. Their exact reviewed before SHA still binds them.
      if (file && file.afterSource !== patch.beforeSource) {
        throw new Error(
          `Documentation path-replay baseline differs: ${patch.path}`,
        );
      }
      if (
        !file &&
        !context.inventory.before.includes(patch.path) &&
        !context.additions.some((addition) => addition.path === patch.path)
      ) {
        throw new Error(`Documentation baseline absent: ${patch.path}`);
      }
    }
    if (actualSources.get(patch.path) !== patch.afterSource) {
      throw new Error(`Actual documentation differs: ${patch.path}`);
    }
    patches.set(patch.path, patch);
  }
  const fullReviewedLayout = [...bindings.keys()].every((path) =>
    context.inventory?.after.includes(path)
  );
  if ((patches.size || fullReviewedLayout) && patches.size !== bindings.size) {
    throw new Error("Reviewed documentation patch inventory is incomplete");
  }
  return patches;
}
