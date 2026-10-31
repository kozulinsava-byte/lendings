window.FA = window.FA || {};

/* ============================================================
   Цели: для чего собираем сочетание.
   cats    — какие категории продуктов допустимы
   seeds   — с чего начинать (самые характерные продукты для цели)
   must    — группы, по одной из которых обязательно должно быть в сочетании
   blockIds / blockCats — что для этой цели не подходит
   hint / hint2 — фразы «как это готовят», идут в описание
   ============================================================ */

FA.PURPOSES = [
  { id: "jam",       name: "Джем и варенье", short: "Джем",      lead: "Ягоды, фрукты, пряности",      photo: "cherry" },
  { id: "bake",      name: "Выпечка",        short: "Выпечка",   lead: "Тесто, начинка, посыпка",      photo: "bread" },
  { id: "pasta",     name: "Паста и соусы",  short: "Паста",     lead: "Соус, заправка, топпинг",      photo: "pasta" },
  { id: "salad",     name: "Салат",          short: "Салат",     lead: "Свежее, хрустящее, кислое",    photo: "tomato" },
  { id: "grill",     name: "Гриль и мясо",   short: "Гриль",     lead: "Жар, дым, корочка",            photo: "beef" },
  { id: "soup",      name: "Суп",            short: "Суп",       lead: "Бульон, коренья, зелень",      photo: "mushroom" },
  { id: "dessert",   name: "Десерт",         short: "Десерт",    lead: "Сладкое, сливочное, ягодное",  photo: "dark_chocolate" },
  { id: "drink",     name: "Напиток",        short: "Напиток",   lead: "Коктейль, лимонад, глинтвейн", photo: "lime" },
  { id: "breakfast", name: "Завтрак",        short: "Завтрак",   lead: "Быстро, сытно, утром",         photo: "egg" },
  { id: "side",      name: "Гарнир",         short: "Гарнир",    lead: "К мясу и рыбе",                photo: "potato" },
  { id: "snack",     name: "Закуска",        short: "Закуска",   lead: "К вину и на стол",             photo: "olive" },
  { id: "marinade",  name: "Маринад",        short: "Маринад",   lead: "Для мяса, рыбы, овощей",       photo: "garlic" }
];

FA.PURPOSE_RULES = {
  jam: {
    cats: ["fruit", "spice", "herb", "sweet", "drink", "nut"],
    seeds: ["currant", "gooseberry", "plum", "cherry", "strawberry", "raspberry", "blackberry",
            "blueberry", "apple", "quince", "apricot", "peach", "fig", "cranberry", "sea_buckthorn",
            "lingonberry", "cloudberry", "aronia", "redcurrant", "cherry_plum", "dogwood", "viburnum"],
    must: [["fruit"]],
    blockCats: ["veg", "meat", "fish"],
    hint: "Варят с сахаром 15–20 минут, пряности и травы кладут в конце — так аромат остаётся.",
    hint2: "Пектин берут из ягод и яблок, а сахар добавляют постепенно — вкус остаётся ярким."
  },

  bake: {
    cats: ["grain", "dairy", "fruit", "nut", "spice", "sweet", "sauce"],
    seeds: ["bread", "oats", "butter", "egg", "honey", "apple", "pear", "cinnamon", "ricotta",
            "mascarpone", "dark_chocolate", "walnut", "almond", "vanilla", "spelt", "rye",
            "marzipan", "pecan", "brown_sugar"],
    must: [
      ["bread", "oats", "butter", "egg", "ricotta", "mascarpone", "cream", "honey",
       "dark_chocolate", "cocoa", "caramel", "maple_syrup", "spelt", "rye", "marzipan"],
      ["grain", "fruit", "nut", "spice", "sweet"]
    ],
    blockIds: ["lentil", "chickpea", "bean", "pasta", "rice", "soy_sauce", "miso", "fish_sauce",
               "olive_oil", "balsamic", "dijon", "tomato_paste", "noodles", "couscous"],
    hint: "В тесто или начинку: фрукты дают влагу, орехи — текстуру, специи — верхнюю ноту.",
    hint2: "Специи и цедру кладут в тесто, а свежие фрукты — поверх, чтобы не утяжелить."
  },

  pasta: {
    cats: ["grain", "veg", "dairy", "meat", "fish", "herb", "sauce", "spice"],
    seeds: ["pasta", "parmesan", "tomato", "garlic", "olive_oil", "basil", "mushroom", "beef",
            "cream", "anchovy", "chili", "burrata", "pecorino", "noodles", "artichoke"],
    must: [["pasta", "rice", "tomato", "tomato_paste", "cream", "olive_oil", "butter", "parmesan",
            "garlic", "mushroom", "noodles", "pecorino", "burrata"]],
    blockCats: ["fruit", "sweet"],
    blockIds: ["bread", "oats", "watermelon", "banana", "pita", "crackers", "tortilla"],
    hint: "Соус строят от жира — масло или сливки, — а кислоту и зелень добавляют в конце.",
    hint2: "Воду от пасты оставляют: крахмал связывает соус и не даёт ему расслоиться."
  },

  salad: {
    cats: ["veg", "herb", "fruit", "dairy", "nut", "sauce", "fish"],
    seeds: ["tomato", "cucumber", "arugula", "spinach", "feta", "olive_oil", "lemon", "walnut",
            "avocado", "radish", "mozzarella", "basil", "radicchio", "watercress", "burrata",
            "endive", "beet"],
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
            "rosemary", "thyme", "garlic", "smoked_paprika", "venison", "goose", "quail", "halloumi"],
    must: [["meat", "fish", "eggplant", "zucchini", "bell_pepper", "mushroom", "corn", "onion",
            "tomato", "potato", "asparagus", "cauliflower", "broccoli", "chili", "halloumi"]],
    blockIds: ["cucumber", "spinach", "arugula", "cream", "butter", "bread", "pasta", "rice",
               "oats", "dark_chocolate", "honey", "cocoa", "buckwheat", "bulgur", "quinoa"],
    blockCats: ["sweet", "fruit", "nut"],
    hint: "Сильный жар, отдых под фольгой, а кислота и травы — уже на тарелке.",
    hint2: "Маринад — за пару часов, соль — за час; на углях сначала корочка, потом догоняют."
  },

  soup: {
    cats: ["veg", "meat", "fish", "grain", "herb", "spice", "dairy"],
    seeds: ["mushroom", "potato", "carrot", "onion", "chicken", "lentil", "bean", "buckwheat",
            "cream", "dill", "beef", "fish", "barley", "leek", "celeriac", "pumpkin"],
    must: [["veg", "meat", "fish", "grain"]],
    blockIds: ["dark_chocolate", "honey", "caramel", "maple_syrup", "cocoa", "vanilla", "coffee",
               "crackers", "tortilla", "pita"],
    blockCats: ["fruit", "sweet"],
    hint: "Закладывают по плотности: сначала коренья и мясо, зелень — в самом конце.",
    hint2: "Бульон не кипятят бурно, а специи прогревают в масле перед закладкой."
  },

  dessert: {
    cats: ["sweet", "fruit", "dairy", "nut", "spice", "grain", "drink"],
    seeds: ["dark_chocolate", "cream", "mascarpone", "strawberry", "raspberry", "honey", "walnut",
            "caramel", "vanilla", "coffee", "peach", "white_chocolate", "marzipan", "pecan",
            "halva", "ricotta"],
    must: [["sweet", "fruit", "dairy"]],
    blockCats: ["meat", "fish", "legume"],
    blockIds: ["garlic", "onion", "chili", "fish_sauce", "soy_sauce", "miso", "dijon", "horseradish",
               "rice", "buckwheat", "bulgur", "barley", "millet", "polenta", "pasta", "noodles",
               "couscous", "pita", "tortilla", "crackers", "rye", "spelt", "lentil", "chickpea", "bean", "edamame"],
    hint: "Сладость держат кислотой, жир подают холодным, соль — щепоткой.",
    hint2: "Холодное — холодным, тёплое — тёплым: температура меняет восприятие сладости."
  },

  drink: {
    cats: ["drink", "fruit", "herb", "spice", "sweet"],
    seeds: ["lemon", "lime", "orange", "mint", "rum", "brandy", "red_wine", "white_wine",
            "ginger", "honey", "grapefruit", "champagne", "gin", "cider", "kombucha", "yuzu"],
    must: [["drink", "lemon", "lime", "orange", "grapefruit", "coffee", "yuzu", "kombucha"]],
    blockCats: ["meat", "fish", "veg", "grain", "nut", "dairy"],
    blockIds: ["dark_chocolate", "caramel", "cumin", "coriander_seed", "curry_powder",
               "garam_masala", "baharat", "zaatar", "asafoetida", "fenugreek", "caraway",
               "celery_seed", "mustard", "horseradish", "wasabi", "paprika", "smoked_paprika",
               "chipotle", "ancho", "cayenne"],
    hint: "Смешивают со льдом, кислоту и травы добавляют последними.",
    hint2: "Сначала лёд и крепкое, потом кислота и травы — иначе аромат теряется."
  },

  breakfast: {
    cats: ["grain", "dairy", "fruit", "nut", "sweet", "spice", "sauce"],
    seeds: ["egg", "bread", "oats", "yogurt", "cottage_cheese", "ricotta", "cream_cheese", "honey",
            "banana", "apple", "blueberry", "avocado", "bacon", "ham", "butter"],
    must: [["egg", "bread", "oats", "yogurt", "cottage_cheese", "ricotta", "cream_cheese",
            "pita", "tortilla", "crackers"]],
    blockIds: ["lentil", "chickpea", "bean", "pasta", "rice", "buckwheat", "beef", "pork",
               "lamb", "duck", "garlic", "chili", "fish_sauce", "miso", "noodles", "couscous",
               "curry_powder", "garam_masala", "baharat", "asafoetida", "cumin"],
    blockCats: ["veg"],
    hint: "Собирают быстро: сначала основа, потом фрукты, орехи и ложка кисломолочного.",
    hint2: "Яйцо и хлеб — база, а всё остальное добавляют за минуту до подачи."
  },

  side: {
    cats: ["veg", "grain", "legume", "herb", "spice", "dairy", "sauce", "nut"],
    seeds: ["potato", "rice", "buckwheat", "barley", "bulgur", "couscous", "polenta", "lentil",
            "chickpea", "bean", "carrot", "broccoli", "cauliflower", "zucchini", "beet", "kale"],
    must: [["veg", "grain", "legume"]],
    blockIds: ["dark_chocolate", "honey", "caramel", "maple_syrup", "cocoa", "vanilla", "coffee",
               "bread", "pita", "tortilla", "crackers"],
    blockCats: ["meat", "fish", "fruit", "sweet"],
    hint: "Гарнир держится на жире и соли: масло или сливочное масло, затем зелень.",
    hint2: "Плотные овощи — в духовку, крупы — в подсоленный кипяток, зелень — в конце."
  },

  snack: {
    cats: ["dairy", "meat", "fish", "veg", "grain", "nut", "fruit", "sauce", "spice"],
    seeds: ["cheese", "bread", "crackers", "prosciutto", "salami", "olive", "tomato", "avocado",
            "walnut", "fig", "grape", "sardine", "anchovy"],
    must: [["dairy", "meat", "fish", "bread", "crackers", "veg", "nut"]],
    blockIds: ["dark_chocolate", "caramel", "maple_syrup", "oats", "lentil", "buckwheat", "pasta",
               "rice", "bulgur", "polenta", "noodles", "couscous", "spelt", "rye", "chickpea", "bean",
               "lentil", "edamame"],
    blockCats: ["sweet", "drink"],
    hint: "Собирают на доске: солёное, жирное и кислое — рядом, а не в одном соусе.",
    hint2: "Чем меньше подготовки, тем лучше: нарезать, полить маслом, посыпать солью."
  },

  marinade: {
    cats: ["sauce", "spice", "herb", "fruit", "drink", "veg", "dairy"],
    seeds: ["soy_sauce", "olive_oil", "lemon", "lime", "garlic", "honey", "mustard", "paprika",
            "thyme", "rosemary", "yogurt", "red_wine", "balsamic", "ginger", "chili"],
    must: [["sauce", "spice", "herb", "fruit", "drink", "dairy"]],
    blockIds: ["bread", "pasta", "rice", "oats", "dark_chocolate", "caramel", "maple_syrup",
               "egg", "crackers"],
    blockCats: ["grain", "sweet", "nut"],
    hint: "Маринуют от 30 минут до ночи: кислота и соль работают первыми, специи — следом.",
    hint2: "Кислоты — не больше трети: иначе мясо станет сухим, а рыба развалится."
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
  drink: "напитка",
  breakfast: "завтрака",
  side: "гарнира",
  snack: "закуски",
  marinade: "маринада"
};
