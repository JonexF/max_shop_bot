import { useEffect, useMemo, useState } from "react";
import { products } from "./products";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const PACK_SIZE = 6;

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

function Screen({ children, bottomNav }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#f8fafc] shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
        {children}
        {bottomNav}
      </div>
    </div>
  );
}

function App() {
  const categories = ["Свинина", "Говядина", "Вторые блюда"];

  const [selectedCategory, setSelectedCategory] = useState("Говядина");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(PACK_SIZE);
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

        window.WebApp.ready?.();
        window.WebApp.expand?.();
      } catch (e) {
        console.log("MAX init error:", e);
      }
    }
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => product.category === selectedCategory);
  }, [selectedCategory]);

  const getItemPrice = (product, qty) => {
    if (product?.promo && qty >= product.promo.minQty) {
      return Math.round(
        product.price * (1 - product.promo.discountPercent / 100)
      );
    }
    return product.price;
  };

  const getItemTotal = (product, qty) => {
    return getItemPrice(product, qty) * qty;
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + getItemTotal(item.product, item.quantity),
    0
  );

  const cartTotalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const openProductCard = (product) => {
    setSelectedProduct(product);
    setQuantity(PACK_SIZE);
    setCurrentScreen("product");
  };

  const closeProductCard = () => {
    setSelectedProduct(null);
    setQuantity(PACK_SIZE);
    setCurrentScreen("catalog");
  };

  const openCart = () => {
    setSelectedProduct(null);
    setQuantity(PACK_SIZE);
    setCurrentScreen("cart");
  };

  const openCheckout = () => {
    setCurrentScreen("checkout");
  };

  const goHome = () => {
    setSelectedProduct(null);
    setQuantity(PACK_SIZE);
    setCurrentScreen("catalog");
  };

  const increaseQty = () => {
    setQuantity((prev) => prev + PACK_SIZE);
  };

  const decreaseQty = () => {
    setQuantity((prev) => (prev > PACK_SIZE ? prev - PACK_SIZE : PACK_SIZE));
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
    setQuantity(PACK_SIZE);
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
          const newQty = item.quantity + delta * PACK_SIZE;
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity >= PACK_SIZE)
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

    if (!chatId) {
      alert("Ошибка: не удалось получить chatId");
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
        price: getItemPrice(item.product, item.quantity),
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
      setQuantity(PACK_SIZE);
    } catch (error) {
      console.error(error);
      alert(error.message || "Не удалось отправить заказ");
    } finally {
      setLoading(false);
    }
  };

  const renderBottomNav = (activeTab = "Главная") => (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 border-t border-slate-200 bg-white px-2 py-3">
      {[
        ["Главная", "🏠"],
        ["Корзина", "🛒"],
        ["Оформить", "✅"],
      ].map(([label, icon]) => (
        <button
          key={label}
          type="button"
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
              ? `Корзина (${cartTotalQty} банок)`
              : label}
          </span>
        </button>
      ))}
    </nav>
  );

  const renderFloatingCartButton = () => {
    if (
      cartTotalQty === 0 ||
      currentScreen === "cart" ||
      currentScreen === "checkout" ||
      currentScreen === "product"
    ) {
      return null;
    }

    return (
      <div className="fixed bottom-20 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-4">
        <button
          type="button"
          onClick={openCart}
          className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 px-4 py-4 text-white shadow-lg"
        >
          <div className="text-left">
            <div className="text-xs text-emerald-100">
              В корзине {cartTotalQty} банок
            </div>
            <div className="text-base font-bold">Перейти к оформлению</div>
          </div>
          <div className="text-lg font-bold">{cartTotal} ₽</div>
        </button>
      </div>
    );
  };

  if (currentScreen === "product" && selectedProduct) {
    const currentUnitPrice = getItemPrice(selectedProduct, quantity);
    const promoApplied =
      selectedProduct?.promo && quantity >= selectedProduct.promo.minQty;

    return (
      <Screen bottomNav={renderBottomNav("Корзина")}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              type="button"
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
              type="button"
              onClick={openCart}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            >
              🛒 {cartTotalQty}
            </button>
          </div>
        </header>

        <main className="px-4 pb-40 pt-4">
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

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Продажа комплектами по 6 банок
                </div>

                {selectedProduct?.promo && (
                  <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    Акция: скидка {selectedProduct.promo.discountPercent}% от{" "}
                    {selectedProduct.promo.minQty} банок
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-400">Цена за 1 банку</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {currentUnitPrice} ₽
                </div>
                {promoApplied && (
                  <div className="mt-1 text-xs font-semibold text-emerald-600">
                    Скидка применена
                  </div>
                )}
              </div>

              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Количество
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={decreaseQty}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl"
                  >
                    −
                  </button>

                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-bold">
                    {quantity}
                  </div>

                  <button
                    type="button"
                    onClick={increaseQty}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="fixed bottom-20 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-4">
          <div className="space-y-3 rounded-[24px] bg-slate-900 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-300">Сумма</div>
                <div className="text-3xl font-bold">
                  {getItemTotal(selectedProduct, quantity)} ₽
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decreaseQty}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl"
                >
                  −
                </button>

                <div className="min-w-[60px] text-center text-lg font-bold">
                  {quantity}
                </div>

                <button
                  type="button"
                  onClick={increaseQty}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={addToCart}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-base font-bold text-white"
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
      <Screen bottomNav={renderBottomNav("Оформить")}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              type="button"
              onClick={openCart}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg"
            >
              ←
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-400">
                Оформление
              </div>
              <div className="truncate text-base font-bold text-slate-900">
                Провиант Одинцово
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-4 px-4 pb-32 pt-4">
          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <div className="text-lg font-bold text-slate-900">
              Данные для заказа
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Имя
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400"
                  placeholder="Введите имя"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400"
                  placeholder="+7 (999) 999-99-99"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Адрес доставки
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400"
                  placeholder="Укажите адрес доставки"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <div className="text-lg font-bold text-slate-900">Ваш заказ</div>

            <div className="mt-4 space-y-3">
              {cartItems.map((item) => {
                const unitPrice = getItemPrice(item.product, item.quantity);
                const totalPrice = getItemTotal(item.product, item.quantity);
                const promoApplied =
                  item.product?.promo &&
                  item.quantity >= item.product.promo.minQty;

                return (
                  <div
                    key={item.product.id}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {item.product.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.quantity} банок × {unitPrice} ₽
                    </div>
                    {promoApplied && (
                      <div className="mt-1 text-xs font-semibold text-emerald-600">
                        Скидка применена
                      </div>
                    )}
                    <div className="mt-2 text-lg font-bold text-slate-900">
                      {totalPrice} ₽
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-4 text-white">
              <span className="text-base font-medium">Итого</span>
              <span className="text-2xl font-bold">{cartTotal} ₽</span>
            </div>
          </div>

          <button
            type="button"
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
      <Screen bottomNav={renderBottomNav("Корзина")}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              type="button"
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
                type="button"
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
                type="button"
                onClick={goHome}
                className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Перейти в каталог
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const unitPrice = getItemPrice(item.product, item.quantity);
                const totalPrice = getItemTotal(item.product, item.quantity);
                const promoApplied =
                  item.product?.promo &&
                  item.quantity >= item.product.promo.minQty;

                return (
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
                          {unitPrice} ₽ за банку
                        </div>

                        {promoApplied && (
                          <div className="mt-1 text-xs font-semibold text-emerald-600">
                            Скидка применена
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQty(item.product.id, -1)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold"
                            >
                              −
                            </button>

                            <div className="min-w-[72px] rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-bold">
                              {item.quantity}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQty(item.product.id, 1)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-lg font-bold text-slate-900">
                            {totalPrice} ₽
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCartItem(item.product.id)}
                      className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
                    >
                      Удалить товар
                    </button>
                  </div>
                );
              })}

              <div className="rounded-[28px] bg-slate-900 p-5 text-white">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Всего банок</span>
                  <span>{cartTotalQty}</span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-medium">Итого</span>
                  <span className="text-3xl font-bold">{cartTotal} ₽</span>
                </div>

                <button
                  type="button"
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
    <Screen bottomNav={renderBottomNav("Главная")}>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white">
            <img
            src="/images/logo.png"
            alt="Логотип"
            className="h-full w-full object-cover"
            />
          </div>

          <div className="flex-1">
            <div className="text-xs text-slate-400">Натуральные продукты</div>
            <div className="text-lg font-bold text-slate-900">
              Провиант Одинцово
            </div>
          </div>

          <button
            type="button"
            onClick={openCart}
            className="relative rounded-2xl bg-slate-900 px-3 py-2 text-white"
          >
            🛒
            {cartTotalQty > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-emerald-500 px-2 text-xs text-white">
                {cartTotalQty}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="space-y-6 px-4 pb-32 pt-4">
        <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/20 shadow">
              <img
              src="/images/logo.png"
              alt="Логотип"
             className="h-full w-full object-cover"
              />
            </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
                  Натуральные продукты
                </div>
                <h1 className="mt-1 text-2xl font-bold">Провиант Одинцово</h1>
              </div>
            </div>

            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              ГОСТ
            </span>
          </div>

          <p className="mt-4 text-sm text-emerald-50">
            Натуральные мясные консервы и готовые блюда. Доставка, удобные
            комплекты по 6 банок.
          </p>

          <div className="mt-4 rounded-2xl bg-white/12 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
              Акция
            </div>
            <div className="mt-1 text-lg font-bold">
              Скидка 10% на говядину 525 г
            </div>
            <div className="mt-1 text-sm text-emerald-50">
              При заказе от 36 банок (1 коробка)
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const section = document.getElementById("catalog-section");
              section?.scrollIntoView({ behavior: "smooth" });
            }}
            className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-emerald-700"
          >
            Смотреть каталог
          </button>
        </section>

        <section className="space-y-3">
          <div className="text-lg font-bold text-slate-900">Категории</div>

          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              const meta = categoryMeta[category];

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-[24px] border px-3 py-4 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <div className="text-2xl">{meta.emoji}</div>
                  <div className="mt-3 text-sm font-bold">{category}</div>
                  <div
                    className={`mt-1 text-[11px] leading-4 ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {meta.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section id="catalog-section" className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900">Каталог</div>
              <div className="text-sm text-slate-500">
                Все товары продаются комплектами по 6 банок
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredProducts.map((product) => {
              const hasPromo = !!product.promo;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProductCard(product)}
                  className="w-full overflow-hidden rounded-[28px] bg-white text-left shadow-sm transition hover:shadow-md"
                >
                  <div className="flex gap-3 p-3">
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                          {product.title}
                        </div>

                        {hasPromo && (
                          <div className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                            {product.promo.label}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                        {product.description}
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="text-xs text-slate-400">
                            от {product.packSize || PACK_SIZE} банок
                          </div>
                          <div className="text-xl font-bold text-slate-900">
                            {product.price} ₽
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                          Открыть
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {renderFloatingCartButton()}
    </Screen>
  );
}

export default App;