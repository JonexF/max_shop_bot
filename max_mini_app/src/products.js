export const products = [
  {
    id: 1,
    category: "Говядина",
    title: "Говядина тушёная высший сорт 325 г",
    description:
      "Говядина тушёная высший сорт по ГОСТ. Удобный формат для дома, поездок и запаса.",
    price: 220,
    image: "/images/beef.png",
    packSize: 6,
  },
  {
    id: 2,
    category: "Говядина",
    title: "Говядина тушёная высший сорт 339 г",
    description:
      "Говядина тушёная высший сорт по ГОСТ. Банка 339 г. Натуральный состав.",
    price: 230,
    image: "/images/beef339.png",
    packSize: 6,
  },
  {
    id: 3,
    category: "Говядина",
    title: "Говядина тушёная высший сорт 525 г",
    description:
      "Говядина тушёная высший сорт по ГОСТ. Большой формат 525 г. Акция: скидка 10% при заказе от 36 банок.",
    price: 350,
    image: "/images/beef525.png",
    packSize: 6,
    promo: {
      minQty: 36,
      discountPercent: 10,
      label: "−10% от 36 банок",
    },
  },
  {
    id: 4,
    category: "Свинина",
    title: "Свинина тушёная высший сорт 325 г",
    description:
      "Свинина тушёная высший сорт по ГОСТ. Нежное мясо и удобный формат.",
    price: 210,
    image: "/images/pork.png",
    packSize: 6,
  },
  {
    id: 5,
    category: "Свинина",
    title: "Свинина тушёная высший сорт 339 г",
    description: "Свинина тушёная высший сорт по ГОСТ. Банка 339 г.",
    price: 225,
    image: "/images/pork339.png",
    packSize: 6,
  },
  {
    id: 6,
    category: "Свинина",
    title: "Свинина тушёная высший сорт 525 г",
    description:
      "Свинина тушёная высший сорт по ГОСТ. Большой формат 525 г.",
    price: 340,
    image: "/images/pork525.png",
    packSize: 6,
  },
  {
    id: 7,
    category: "Вторые блюда",
    title: "Гречка с говядиной",
    description:
      "Готовое второе блюдо. Удобно взять с собой в дорогу, на дачу или хранить дома.",
    price: 180,
    image: "/images/meal1.png",
    packSize: 6,
  },
  {
    id: 8,
    category: "Вторые блюда",
    title: "Рис со свининой",
    description:
      "Готовое второе блюдо с рисом и мясом. Быстро, удобно и сытно.",
    price: 185,
    image: "/images/meal2.png",
    packSize: 6,
  },
];