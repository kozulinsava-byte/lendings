window.FA = window.FA || {};

/* ============================================================
   Цели: для чего собираем сочетание.
   cats    — какие категории продуктов допустимы
   seeds   — с чего начинать (самые характерные продукты для цели)
   must    — группы, по одной из которых обязательно должно быть в сочетании
   blockIds / blockCats — что для этой цели не подходит
   hint    — одна фраза «как это готовят», идёт в описание
   ============================================================ */

FA.PURPOSES = [
  { id: "jam",     name: "Джем и варенье", short: "Джем",     lead: "Ягоды, фрукты, пряности",      photo: "cherry" },
  { id: "bake",    name: "Выпечка",        short: "Выпечка",  lead: "Тесто, начинка, посыпка",      photo: "bread" },
  { id: "pasta",   name: "Паста и соусы",  short: "Паста",    lead: "Соус, заправка, топпинг",      photo: "pasta" },
  { id: "salad",   name: "Салат",          short: "Салат",    lead: "Свежее, хрустящее, кислое",    photo: "tomato" },
  { id: "grill",   name: "Гриль и мясо",   short: "Гриль",    lead: "Жар, дым, корочка",            photo: "beef" },
  { id: "soup",    name: "Суп",            short: "Суп",      lead: "Бульон, коренья, зелень",      photo: "mushroom" },
  { id: "dessert", name: "Десерт",         short: "Десерт",   lead: "Сладкое, сливочное, ягодное",  photo: "dark_chocolate" },
  { id: "drink",   name: "Напиток",        short: "Напиток",  lead: "Коктейль, лимонад, глинтвейн", photo: "lime" }
];

FA.PURPOSE_RULES = {
  jam: {
    cats: ["fruit", "spice", "herb", "sweet", "drink", "nut"],
    seeds: ["currant", "gooseberry", "plum", "cherry", "strawberry", "raspberry", "blackberry",
            "blueberry", "apple", "quince", "apricot", "peach", "fig", "cranberry"],
    must: [["fruit"]],
    blockCats: ["veg", "meat", "fish"],
    hint: "Варят с сахаром 15–20 минут, пряности и травы кладут в конце — так аромат остаётся.",
    hint2: "Пектин берут из ягод и яблок, а сахар добавляют постепенно — так вкус остаётся ярким."
  },

  bake: {
    cats: ["grain", "dairy", "fruit", "nut", "spice", "sweet", "sauce"],
    seeds: ["bread", "oats", "butter", "egg", "honey", "apple", "pear", "cinnamon", "ricotta",
            "mascarpone", "dark_chocolate", "walnut", "almond", "vanilla"],
    must: [
      ["bread", "oats", "butter", "egg", "ricotta", "mascarpone", "cream", "honey",
       "dark_chocolate", "cocoa", "caramel", "maple_syrup"],
      ["grain", "fruit", "nut", "spice", "sweet"]
    ],
    blockIds: ["lentil", "chickpea", "bean", "pasta", "rice", "soy_sauce", "miso", "fish_sauce",
               "olive_oil", "balsamic", "dijon", "tomato_paste"],
    hint: "В тесто или начинку: фрукты дают влагу, орехи — текстуру, специи — верхнюю ноту.",
    hint2: "Специи и цедру кладут в тесто, а свежие фрукты — поверх, чтобы не утяжелить."
  },

  pasta: {
    cats: ["grain", "veg", "dairy", "meat", "fish", "herb", "sauce", "spice"],
    seeds: ["pasta", "parmesan", "tomato", "garlic", "olive_oil", "basil", "mushroom", "beef",
            "cream", "anchovy", "chili"],
    must: [["pasta", "rice", "tomato", "tomato_paste", "cream", "olive_oil", "butter", "parmesan",
            "garlic", "mushroom"]],
    blockCats: ["fruit", "sweet"],
    blockIds: ["bread", "oats", "watermelon", "banana"],
    hint: "Соус строят от жира — масло или сливки, — а кислоту и зелень добавляют в конце.",
    hint2: "Воду от пасты оставляют: крахмал связывает соус и не даёт ему расслоиться."
  },

  salad: {
    cats: ["veg", "herb", "fruit", "dairy", "nut", "sauce", "fish"],
    seeds: ["tomato", "cucumber", "arugula", "spinach", "feta", "olive_oil", "lemon", "walnut",
            "avocado", "radish", "mozzarella", "basil"],
    must: [["veg", "herb"]],
    blockIds: ["cream", "butter", "bread", "pasta", "rice", "buckwheat", "bulgur", "quinoa",
               "oats", "beef", "pork", "lamb", "chicken", "duck", "turkey", "bacon"],
    blockCats: ["sweet"],
    hint: "Собирают сырым, заправляют маслом и кислотой, соль добавляют в последний момент.",
    hint2: "Заправку делают заранее, а зелень и соль добавляют перед подачей."
  },

  grill: {
    cats: ["meat", "fish", "veg", "spice", "herb", "sauce"],
    seeds: ["beef", "pork", "lamb", "chicken", "salmon", "shrimp", "eggplant", "zucchini",
            "rosemary", "thyme", "garlic", "smoked_paprika"],
    must: [["meat", "fish", "eggplant", "zucchini", "bell_pepper", "mushroom", "corn", "onion",
            "tomato", "potato", "asparagus", "cauliflower", "broccoli", "chili"]],
    blockIds: ["cucumber", "spinach", "arugula", "cream", "butter", "bread", "pasta", "rice",
               "oats", "dark_chocolate", "honey", "cocoa", "buckwheat", "bulgur", "quinoa"],
    blockCats: ["sweet", "fruit", "nut"],
    hint: "Сильный жар, отдых под фольгой, а кислота и травы — уже на тарелке.",
    hint2: "Маринад — за пару часов, соль — за час; на углях сначала корочка, потом догоняют."
  },

  soup: {
    cats: ["veg", "meat", "fish", "grain", "herb", "spice", "dairy"],
    seeds: ["mushroom", "potato", "carrot", "onion", "chicken", "lentil", "bean", "buckwheat",
            "cream", "dill", "beef", "fish"],
    must: [["veg", "meat", "fish", "grain"]],
    blockIds: ["dark_chocolate", "honey", "caramel", "maple_syrup", "cocoa", "vanilla", "coffee"],
    blockCats: ["fruit", "sweet"],
    hint: "Закладывают по плотности: сначала коренья и мясо, зелень — в самом конце.",
    hint2: "Бульон не кипятят бурно, а специи прогревают в масле перед закладкой."
  },

  dessert: {
    cats: ["sweet", "fruit", "dairy", "nut", "spice", "grain", "drink"],
    seeds: ["dark_chocolate", "cream", "mascarpone", "strawberry", "raspberry", "honey", "walnut",
            "caramel", "vanilla", "coffee", "peach"],
    must: [["sweet", "fruit", "dairy"]],
    blockCats: ["meat", "fish"],
    blockIds: ["garlic", "onion", "chili", "fish_sauce", "soy_sauce", "miso", "dijon", "horseradish"],
    hint: "Сладость держат кислотой, жир подают холодным, соль — щепоткой.",
    hint2: "Холодное — холодным, тёплое — тёплым: температура меняет восприятие сладости."
  },

  drink: {
    cats: ["drink", "fruit", "herb", "spice", "sweet"],
    seeds: ["lemon", "lime", "orange", "mint", "rum", "brandy", "red_wine", "white_wine",
            "ginger", "honey", "grapefruit"],
    must: [["drink", "lemon", "lime", "orange", "grapefruit", "coffee"]],
    blockCats: ["meat", "fish", "veg", "grain", "nut", "dairy"],
    blockIds: ["dark_chocolate", "caramel"],
    hint: "Смешивают со льдом, кислоту и травы добавляют последними.",
    hint2: "Сначала лёд и крепкое, потом кислота и травы — иначе аромат теряется."
  }
};

FA.PURPOSE_BY_ID = {};
FA.PURPOSES.forEach((p) => { FA.PURPOSE_BY_ID[p.id] = p; });

/* Родительный падеж — для заголовка «Сочетание для …» */
FA.PURPOSE_GEN = {
  jam: "джема и варенья",
  bake: "выпечки",
  pasta: "пасты и соусов",
  salad: "салата",
  grill: "гриля",
  soup: "супа",
  dessert: "десерта",
  drink: "напитка"
};
