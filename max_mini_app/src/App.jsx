import { useEffect, useMemo, useState } from "react";
import { products } from "./products";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const categoryMeta = {
  Свинина: {
    emoji: "🐖",
    subtitle: "Сытные мясные консервы",
  },
  Говядина: {
    emoji: "🥩",
    subtitle: "Классическая тушёнка",
  },
  "Вторые блюда": {
    emoji: "🍲",
    subtitle: "Готовые блюда на каждый день",
  },
};

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
  const [chatId, setChatId] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.WebApp) {
      try {
        const data = window.WebApp.initDataUnsafe;

        const id = data?.chat?.id || data?.user?.id || 0;
        setChatId(id);

        if (data?.user?.first_name) {
          setForm((prev) => ({
            ...prev,
            name: prev.name || data.user.first_name,
          }));
        }

        window.WebApp.ready();
      } catch (e) {
        console.log("MAX init error:", e);
      }
    }
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => product.category === selectedCategory);
  }, [selectedCategory]);

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

  const updateCartItemQty = (productId, delta) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (productId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.product.id !== productId)
    );
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

    if (cartItems.length === 0) {
      alert("Корзина пустая");
      return;
    }

    const orderData = {
      customer: {
        name: form.name,
        phone: form.phone,
        address: form.address,
        chatId: chatId || 0,
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
      setLoading(true);

      const response = await fetch(`${API_URL}/api/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Не удалось отправить заказ");
      }

      alert(result.message || `Заказ #${result.orderId} оформлен!`);

      setCartItems([]);
      setForm((prev) => ({
        name: prev.name,
        phone: "",
        address: "",
      }));
      setCurrentScreen("catalog");
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error) {
      console.error(error);
      alert(error.message || "Не удалось отправить заказ");
    } finally {
      setLoading(false);
    }
  };

  const Screen = ({ children, nav = "Главная" }) => (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#f8fafc] shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
        {children}
        {renderBottomNav(nav)}
      </div>
    </div>
  );

  const renderBottomNav = (activeTab = "Главная") => (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 border-t border-slate-200 bg-white px-2 py-3">
      {[
        ["Главная", "🏠"],
        ["Корзина", "🛒"],
        ["Оформить", "✅"],
      ].map(([label, icon]) => (
        <button
          key={label}
          onClick={() => {
            if (label === "Главная") goHome();
            if (label === "Корзина") openCart();
            if (label === "Оформить" && cartItems.length > 0) openCheckout();
          }}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition ${
            activeTab === label
              ? "bg-slate-900 text-white"
              : "text-slate-500"
          }`}
        >
          <span className="text-base">{icon}</span>
          <span>
            {label === "Корзина" && cartTotalQty > 0
              ? `Корзина (${cartTotalQty})`
              : label}
          </span>
        </button>
      ))}
    </nav>
  );

  const renderFloatingCartButton = () => {
    if (cartTotalQty === 0 || currentScreen === "cart" || currentScreen === "checkout") {
      return null;
    }

    return (
      <div className="fixed bottom-20 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-4">
        <button
          onClick={openCart}
          className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 px-4 py-4 text-white shadow-lg"
        >
          <div className="text-left">
            <div className="text-xs text-emerald-100">В корзине {cartTotalQty} шт.</div>
            <div className="text-base font-bold">Перейти к оформлению</div>
          </div>
          <div className="text-lg font-bold">{cartTotal} ₽</div>
        </button>
      </div>
    );
  };

  if (currentScreen === "product" && selectedProduct) {
    return (
      <Screen nav="Корзина">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={closeProductCard}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg"
            >
              ←
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-400">Товар</div>
              <div className="truncate text-base font-bold text-slate-900">
                Провиант Одинцово
              </div>
            </div>

            <button
              onClick={openCart}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            >
              🛒 {cartTotalQty}
            </button>
          </div>
        </header>

        <main className="px-4 pb-32 pt-4">
          <div className="overflow-hidden rounded-[28px] bg-white shadow-sm">
            <div className="aspect-square bg-slate-100">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-4">
              <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {selectedProduct.category}
              </div>

              <h1 className="mt-3 text-xl font-bold leading-tight text-slate-900">
                {selectedProduct.title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {selectedProduct.description}
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-400">Цена за 1 шт.</div>
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
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl"
                  >
                    −
                  </button>

                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-bold">
                    {quantity}
                  </div>

                  <button
                    onClick={increaseQty}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setQuantity(10)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  10 шт
                </button>
                <button
                  onClick={() => setQuantity(36)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  36 шт
                </button>
              </div>
            </div>
          </div>
        </main>

        <div className="fixed bottom-20 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-4">
          <div className="rounded-[24px] bg-slate-900 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-300">Сумма</div>
                <div className="text-3xl font-bold">
                  {selectedProduct.price * quantity} ₽
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold">
                {quantity} шт
              </div>
            </div>

            <button
              onClick={addToCart}
              className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-base font-bold text-white"
            >
              Добавить в корзину
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  if (currentScreen === "checkout") {
    return (
      <Screen nav="Оформить">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={openCart}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg"
            >
              ←
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-400">Оформление</div>
              <div className="truncate text-base font-bold text-slate-900">
                Провиант Одинцово
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-4 px-4 pb-32 pt-4">
          <section className="rounded-[28px] bg-slate-900 p-5 text-white">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
              Последний шаг
            </div>
            <h1 className="mt-2 text-2xl font-bold">Оформление заказа</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Оставьте данные для доставки, и мы передадим заказ в обработку.
            </p>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Имя
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                  placeholder="Введите имя"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Телефон
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                  placeholder="+7..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Адрес
                </label>
                <input
                  value={form.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                  placeholder="Адрес доставки"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-500">
              Ваш заказ
            </div>

            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {item.product.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.quantity} шт × {item.product.price} ₽
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {item.quantity * item.product.price} ₽
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[24px] bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Товаров</span>
                <span>{cartTotalQty}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-medium">Итого</span>
                <span className="text-3xl font-bold">{cartTotal} ₽</span>
              </div>
            </div>
          </section>

          <button
            onClick={submitOrder}
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-base font-bold text-white disabled:opacity-60"
          >
            {loading ? "Отправка..." : "Подтвердить заказ"}
          </button>
        </main>
      </Screen>
    );
  }

  if (currentScreen === "cart") {
    return (
      <Screen nav="Корзина">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={goHome}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg"
            >
              ←
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-400">Корзина</div>
              <div className="truncate text-base font-bold text-slate-900">
                Провиант Одинцово
              </div>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
              >
                Очистить
              </button>
            )}
          </div>
        </header>

        <main className="px-4 pb-32 pt-4">
          {cartItems.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">
                🛒
              </div>
              <div className="mt-4 text-xl font-bold text-slate-900">
                Корзина пуста
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
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="rounded-[28px] bg-white p-3 shadow-sm"
                >
                  <div className="flex gap-3">
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
                        {item.product.price} ₽ за 1 шт
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartItemQty(item.product.id, -1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold"
                          >
                            −
                          </button>
                          <div className="min-w-[36px] text-center text-sm font-bold">
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => updateCartItemQty(item.product.id, 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-lg font-bold text-slate-900">
                          {item.quantity * item.product.price} ₽
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeCartItem(item.product.id)}
                    className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
                  >
                    Удалить товар
                  </button>
                </div>
              ))}

              <div className="rounded-[28px] bg-slate-900 p-5 text-white">
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
                  className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-base font-bold text-white"
                >
                  Оформить заказ
                </button>
              </div>
            </div>
          )}
        </main>
      </Screen>
    );
  }

  return (
  <Screen nav="Главная">
    {/* HEADER */}
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
          🥫
        </div>

        <div className="flex-1">
          <div className="text-xs text-slate-400">Доставка продуктов</div>
          <div className="text-lg font-bold text-slate-900">
            Провиант Одинцово
          </div>
        </div>

        <button
          onClick={openCart}
          className="relative rounded-2xl bg-slate-900 px-3 py-2 text-white"
        >
          🛒
          {cartTotalQty > 0 && (
            <span className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-2 text-xs text-white">
              {cartTotalQty}
            </span>
          )}
        </button>
      </div>
    </header>

    {/* CONTENT */}
    <main className="px-4 pb-32 pt-4 space-y-6">

      {/* HERO */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
        <h1 className="text-2xl font-bold">
          Натуральные консервы
        </h1>
        <p className="mt-2 text-sm text-emerald-100">
          Без добавок. ГОСТ. Доставка за 1 день.
        </p>

        <button
          onClick={() => setSelectedCategory("Говядина")}
          className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700"
        >
          Смотреть каталог
        </button>
      </section>

      {/* CATEGORIES */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Категории
        </h2>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((category) => {
            const isActive = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`min-w-[140px] rounded-2xl p-3 text-left transition ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "bg-white border border-slate-200"
                }`}
              >
                <div className="text-lg font-semibold">{category}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* PRODUCTS */}
      <section>
        <div className="mb-3 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">
            {selectedCategory}
          </h2>
          <span className="text-sm text-slate-400">
            {filteredProducts.length} шт.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => openProductCard(product)}
              className="cursor-pointer rounded-2xl bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="aspect-square bg-slate-100 rounded-t-2xl overflow-hidden">
                <img
                  src={product.image}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-3">
                <div className="text-sm font-semibold text-slate-900 line-clamp-2">
                  {product.title}
                </div>

                <div className="mt-2 flex justify-between items-center">
                  <div className="font-bold text-slate-900">
                    {product.price} ₽
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openProductCard(product);
                    }}
                    className="rounded-lg bg-emerald-500 px-2 py-1 text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>

    {renderFloatingCartButton()}
  </Screen>
);
}

export default App;