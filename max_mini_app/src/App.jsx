import { useState } from "react";
import { products } from "./products";
import { createOrder } from "./api";

function App() {
  const categories = ["Свинина", "Говядина", "Вторые блюда"];

  const [selectedCategory, setSelectedCategory] = useState("Говядина");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [currentScreen, setCurrentScreen] = useState("catalog");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartTotalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const openProductCard = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCurrentScreen("product");
  };

  const closeProductCard = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setCurrentScreen("catalog");
  };

  const openCart = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setCurrentScreen("cart");
  };

  const openCheckout = () => {
    setCurrentScreen("checkout");
  };

  const goHome = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setCurrentScreen("catalog");
  };

  const increaseQty = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQty = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.product.id === selectedProduct.id
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.product.id === selectedProduct.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prevItems, { product: selectedProduct, quantity }];
    });

    setSelectedProduct(null);
    setQuantity(1);
    setCurrentScreen("cart");
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitOrder = async () => {
    if (!form.name || !form.phone || !form.address) {
      alert("Заполните все поля");
      return;
    }

    let chatId = null;

    if (window.WebApp?.initDataUnsafe?.chat?.id) {
      chatId = window.WebApp.initDataUnsafe.chat.id;
    }

    const orderData = {
      customer: {
        name: form.name,
        phone: form.phone,
        address: form.address,
        chatId,
      },
      items: cartItems.map((item) => ({
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
      })),
      total: cartTotal,
    };

    try {
      const result = await createOrder(orderData);

      alert(result.message || "Заказ оформлен!");

      setCartItems([]);
      setForm({
        name: "",
        phone: "",
        address: "",
      });
      setCurrentScreen("catalog");
    } catch (error) {
      console.error(error);
      alert("Не удалось отправить заказ");
    }
  };

  const renderBottomNav = (activeTab = "Главная") => (
    <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 items-center justify-around rounded-t-[28px] border-t border-slate-200 bg-white/95 px-2 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      {[
        ["🏷️", "Скидки"],
        ["🖤", "Избранное"],
        ["⬛", "Главная"],
        ["🛒", "Корзина"],
        ["👤", "Профиль"],
      ].map(([icon, label]) => (
        <button
          key={label}
          onClick={() => {
            if (label === "Главная") goHome();
            if (label === "Корзина") openCart();
          }}
          className={`flex min-w-[60px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-center text-[11px] font-medium transition ${
            activeTab === label ? "bg-slate-900 text-white" : "text-slate-500"
          }`}
        >
          <span className="text-[20px] leading-none">{icon}</span>
          <span>
            {label === "Корзина" && cartTotalQty > 0
              ? `Корзина (${cartTotalQty})`
              : label}
          </span>
        </button>
      ))}
    </nav>
  );

  if (currentScreen === "product" && selectedProduct) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-4">
              <button
                onClick={closeProductCard}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl shadow-sm"
              >
                ←
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  карточка товара
                </div>
                <div className="truncate text-lg font-bold text-slate-900">
                  Провиант Одинцово
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 pb-28 pt-4">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div className="aspect-square bg-slate-100">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {selectedProduct.category}
                </div>

                <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900">
                  {selectedProduct.title}
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {selectedProduct.description}
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Цена за 1 шт.
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {selectedProduct.price} ₽
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    Количество
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={decreaseQty}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl shadow-sm"
                    >
                      −
                    </button>

                    <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-bold">
                      {quantity}
                    </div>

                    <button
                      onClick={increaseQty}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setQuantity(10)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    10 шт
                  </button>

                  <button
                    onClick={() => setQuantity(36)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    36 шт
                  </button>
                </div>

                <div className="mt-6 rounded-[24px] bg-slate-900 p-4 text-white">
                  <div className="text-sm text-slate-300">Сумма</div>
                  <div className="mt-1 text-3xl font-bold">
                    {selectedProduct.price * quantity} ₽
                  </div>

                  <button
                    onClick={addToCart}
                    className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-base font-bold text-white shadow-sm"
                  >
                    Добавить в корзину
                  </button>
                </div>
              </div>
            </div>
          </main>

          {renderBottomNav("Корзина")}
        </div>
      </div>
    );
  }

  if (currentScreen === "checkout") {
    return (
      <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-4">
              <button
                onClick={openCart}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl shadow-sm"
              >
                ←
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  оформление заказа
                </div>
                <div className="truncate text-lg font-bold text-slate-900">
                  Провиант Одинцово
                </div>
              </div>
            </div>
          </header>

          <main className="space-y-4 px-4 pb-28 pt-4">
            <div>
              <div className="text-sm text-slate-400">Последний шаг</div>
              <h1 className="text-2xl font-bold text-slate-900">
                Оформление заказа
              </h1>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Имя
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  placeholder="Введите имя"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Телефон
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  placeholder="+7..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Адрес
                </label>
                <input
                  value={form.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  placeholder="Адрес доставки"
                />
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-100 p-4">
              <div className="text-sm text-slate-500">Ваш заказ</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Товаров</span>
                <span>{cartTotalQty}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-lg font-bold text-slate-900">
                <span>Итого</span>
                <span>{cartTotal} ₽</span>
              </div>
            </div>

            <button
              onClick={submitOrder}
              className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-bold text-white shadow-sm"
            >
              Подтвердить заказ
            </button>
          </main>

          {renderBottomNav("Корзина")}
        </div>
      </div>
    );
  }

  if (currentScreen === "cart") {
    return (
      <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-4">
              <button
                onClick={goHome}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl shadow-sm"
              >
                ←
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  корзина
                </div>
                <div className="truncate text-lg font-bold text-slate-900">
                  Провиант Одинцово
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 pb-32 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">Ваш заказ</div>
                <h1 className="text-2xl font-bold text-slate-900">Корзина</h1>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
                >
                  Очистить
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 text-center">
                <div className="text-4xl">🛒</div>
                <div className="mt-3 text-lg font-semibold text-slate-900">
                  Корзина пустая
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Добавьте товары из каталога, и они появятся здесь.
                </p>

                <button
                  onClick={goHome}
                  className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  Перейти в каталог
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-5 text-slate-900">
                        {item.product.title}
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        {item.quantity} шт × {item.product.price} ₽
                      </div>

                      <div className="mt-3 text-lg font-bold text-slate-900">
                        {item.quantity * item.product.price} ₽
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-4 rounded-[24px] bg-slate-900 p-5 text-white">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Всего товаров</span>
                    <span>{cartTotalQty}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-medium">Итого</span>
                    <span className="text-3xl font-bold">{cartTotal} ₽</span>
                  </div>

                  <button
                    onClick={openCheckout}
                    className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-base font-bold text-white shadow-sm"
                  >
                    Оформить заказ
                  </button>
                </div>
              </div>
            )}
          </main>

          {renderBottomNav("Корзина")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
          <div className="px-4 pb-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-lime-50 text-xl shadow-sm">
                🥫
              </div>

              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  мини-приложение
                </div>
                <div className="truncate text-lg font-bold text-slate-900">
                  Провиант Одинцово
                </div>
              </div>

              <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl shadow-sm transition active:scale-95">
                🔍
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-4">
          <section className="mb-4 rounded-[24px] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-5 text-white shadow-lg">
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-200/90">
              Натуральные консервы
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight">
              Выберите категорию и соберите заказ за минуту
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Тушёнка и готовые блюда с аккуратной витриной, как в современном
              магазине.
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Категории
              </h2>
              <span className="text-sm text-slate-400">3 раздела</span>
            </div>

            <div className="grid gap-3">
              {categories.map((category) => {
                const isActive = selectedCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full rounded-[20px] border px-4 py-4 text-left transition active:scale-[0.99] ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 shadow-[0_8px_24px_rgba(16,185,129,0.14)]"
                        : "border-slate-200 bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          категория
                        </div>
                        <div
                          className={`mt-1 text-lg font-semibold ${
                            isActive ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {category}
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        открыть
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">Сейчас выбрано</div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedCategory}
                </h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                {filteredProducts.length} шт.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  onClick={() => openProductCard(product)}
                  className="cursor-pointer overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-square bg-slate-100">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-3">
                    <div className="min-h-[60px] text-sm font-medium leading-5 text-slate-800">
                      {product.title}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          Цена
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {product.price} ₽
                        </div>
                      </div>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openProductCard(product);
                        }}
                        className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95"
                      >
                        Открыть
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        {renderBottomNav("Главная")}
      </div>
    </div>
  );
}

export default App;