package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
<<<<<<< HEAD

=======
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
>>>>>>> 35b878f61f120415212d853ec5e1e40b9418277f
	maxbot "github.com/max-messenger/max-bot-api-client-go"
	"github.com/max-messenger/max-bot-api-client-go/schemes"
)

<<<<<<< HEAD
func main() {
	token := "f9LHodD0cOLXE4YeaRslBs2l-u_nSQzFeRT0tLQHLZQarZx8QX1A19WSjsmd_pqCKHgfn1PkVIVKyvsRWqI7"

	api := maxbot.New(token)

	info, err := api.Bots.GetBot()
	fmt.Printf("Bot info: %#v\nError: %#v\n", info, err)

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		exit := make(chan os.Signal, 1)
		signal.Notify(exit, os.Interrupt)
		<-exit
		cancel()
	}()

	fmt.Println("Бот запущен и ждёт сообщения...")

	for upd := range api.GetUpdates(ctx) {
		switch upd := upd.(type) {
		case *schemes.MessageCreatedUpdate:
			chatID := upd.Message.Recipient.ChatId
			text := upd.Message.Body.Text

			fmt.Println("Пришло сообщение:", text)

			var reply string

			if text == "меню" {
				reply = "Главное меню:\n- Каталог\n- Корзина\n- Оформить заказ"
			} else {
				reply = "Привет! Напиши: меню"
			}

			_, err := api.Messages.Send(
				maxbot.NewMessage().
					SetChat(chatID).
					SetText(reply),
			)

			if err != nil {
				fmt.Println("Ошибка отправки:", err)
			}
		}
	}
=======
var adminIDs = []int64{
	149858131,
	219284348,
}

type Product struct {
	ID          int
	Category    string
	Name        string
	Description string
	Price       int
	ImagePath   string
	VideoPath   string
}

type CartItem struct {
	Product  Product
	Quantity int
}

type OrderState struct {
	Step             string
	Name             string
	Phone            string
	Address          string
	SelectedCategory string
	SelectedProduct  *Product
	SelectedQty      int
}

type Order struct {
	ID         int
	ClientChat int64
	Items      []CartItem
	Name       string
	Phone      string
	Address    string
	Status     string
}

var catalog = map[string][]Product{
	"Говядина": {
		{
			ID:          1,
			Category:    "Говядина",
			Name:        "Говядина тушёная высший сорт 325 г",
			Description: "Говядина тушёная высший сорт по ГОСТ. Удобный формат для дома, поездок и запаса.",
			Price:       220,
			ImagePath:   "./beef.png",
			VideoPath:   "./beef.mp4",
		},
		{
			ID:          2,
			Category:    "Говядина",
			Name:        "Говядина тушёная высший сорт 339 г",
			Description: "Говядина тушёная высший сорт по ГОСТ. Банка 339 г. Натуральный состав.",
			Price:       230,
			ImagePath:   "./beef339.png",
			VideoPath:   "./beef.mp4",
		},
		{
			ID:          3,
			Category:    "Говядина",
			Name:        "Говядина тушёная высший сорт 540 г",
			Description: "Говядина тушёная высший сорт по ГОСТ. Большой формат 540 г.",
			Price:       350,
			ImagePath:   "./beef540.png",
			VideoPath:   "./beef.mp4",
		},
	},
	"Свинина": {
		{
			ID:          4,
			Category:    "Свинина",
			Name:        "Свинина тушёная высший сорт 325 г",
			Description: "Свинина тушёная высший сорт по ГОСТ. Нежное мясо и удобный формат.",
			Price:       210,
			ImagePath:   "./pork.png",
			VideoPath:   "./pork.mp4",
		},
		{
			ID:          5,
			Category:    "Свинина",
			Name:        "Свинина тушёная высший сорт 339 г",
			Description: "Свинина тушёная высший сорт по ГОСТ. Банка 339 г.",
			Price:       225,
			ImagePath:   "./pork339.png",
			VideoPath:   "./pork.mp4",
		},
		{
			ID:          6,
			Category:    "Свинина",
			Name:        "Свинина тушёная высший сорт 540 г",
			Description: "Свинина тушёная высший сорт по ГОСТ. Большой формат 540 г.",
			Price:       340,
			ImagePath:   "./pork540.png",
			VideoPath:   "./pork.mp4",
		},
	},
	"Вторые блюда": {
		{
			ID:          7,
			Category:    "Вторые блюда",
			Name:        "Гречка с говядиной",
			Description: "Готовое второе блюдо. Удобно взять с собой в дорогу, на дачу или хранить дома.",
			Price:       180,
			ImagePath:   "./meal1.png",
			VideoPath:   "./meal.mp4",
		},
		{
			ID:          8,
			Category:    "Вторые блюда",
			Name:        "Рис со свининой",
			Description: "Готовое второе блюдо с рисом и мясом. Быстро, удобно и сытно.",
			Price:       185,
			ImagePath:   "./meal2.png",
			VideoPath:   "./meal.mp4",
		},
	},
}

var userCarts = make(map[int64][]CartItem)
var userOrderStates = make(map[int64]*OrderState)
var orders = make(map[int]*Order)

var nextOrderID = 1
var photoCache = make(map[string]*schemes.PhotoTokens)

func isAdmin(chatID int64) bool {
	for _, id := range adminIDs {
		if id == chatID {
			return true
		}
	}
	return false
}

func mainKeyboard() *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	kb.AddRow().AddMessage("Каталог").AddMessage("Корзина")
	kb.AddRow().AddMessage("Оформить заказ")
	return kb
}

func catalogKeyboard() *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	kb.AddRow().AddMessage("Говядина").AddMessage("Свинина")
	kb.AddRow().AddMessage("Вторые блюда")
	kb.AddRow().AddMessage("Главное меню")
	return kb
}

func categoryProductsKeyboard(category string) *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	products := catalog[category]

	for _, p := range products {
		kb.AddRow().AddMessage(fmt.Sprintf("Товар %d", p.ID))
	}

	kb.AddRow().AddMessage("Назад в каталог")
	kb.AddRow().AddMessage("Корзина").AddMessage("Главное меню")
	return kb
}

func productCardKeyboard() *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	kb.AddRow().AddMessage("+1").AddMessage("-1")
	kb.AddRow().AddMessage("10 шт").AddMessage("36 шт (коробка)")
	kb.AddRow().AddMessage("Ввести количество")
	kb.AddRow().AddMessage("Видео")
	kb.AddRow().AddMessage("Добавить в корзину")
	kb.AddRow().AddMessage("Назад в категорию")
	kb.AddRow().AddMessage("Корзина").AddMessage("Главное меню")
	return kb
}

func cartKeyboard() *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	kb.AddRow().AddMessage("Оформить заказ")
	kb.AddRow().AddMessage("Очистить корзину")
	kb.AddRow().AddMessage("Каталог").AddMessage("Главное меню")
	return kb
}

func adminKeyboard(orderID int) *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	kb.AddRow().AddMessage(fmt.Sprintf("Принять заказ %d", orderID))
	kb.AddRow().AddMessage(fmt.Sprintf("В доставке %d", orderID))
	kb.AddRow().AddMessage(fmt.Sprintf("Доставлен %d", orderID))
	return kb
}

func send(ctx context.Context, api *maxbot.Api, chatID int64, text string, kb *maxbot.Keyboard) {
	msg := maxbot.NewMessage().
		SetChat(chatID).
		SetText(text)

	if kb != nil {
		msg = msg.AddKeyboard(kb)
	}

	if err := api.Messages.Send(ctx, msg); err != nil {
		fmt.Println("Ошибка отправки:", err)
	}
}

func getProductsListText(category string) string {
	products, ok := catalog[category]
	if !ok || len(products) == 0 {
		return "В этой категории пока нет товаров."
	}

	var result strings.Builder
	result.WriteString("Выберите товар:\n\n")

	for _, p := range products {
		result.WriteString(fmt.Sprintf("%d. %s — %d ₽\n", p.ID, p.Name, p.Price))
	}

	return result.String()
}

func getProductCardText(product Product, qty int) string {
	if qty <= 0 {
		qty = 1
	}

	return fmt.Sprintf(
		"📦 %s\n\nЦена: %d ₽\n\n%s\n\nКоличество: %d\nСумма: %d ₽",
		product.Name,
		product.Price,
		product.Description,
		qty,
		product.Price*qty,
	)
}

func findProductByID(productID int) (*Product, bool) {
	for _, products := range catalog {
		for _, p := range products {
			if p.ID == productID {
				cp := p
				return &cp, true
			}
		}
	}
	return nil, false
}

func addToCart(chatID int64, product Product, qty int) {
	if qty <= 0 {
		return
	}

	cart := userCarts[chatID]

	for i := range cart {
		if cart[i].Product.ID == product.ID {
			cart[i].Quantity += qty
			userCarts[chatID] = cart
			return
		}
	}

	cart = append(cart, CartItem{
		Product:  product,
		Quantity: qty,
	})
	userCarts[chatID] = cart
}

func getCartText(chatID int64) string {
	cart := userCarts[chatID]
	if len(cart) == 0 {
		return "Корзина пустая."
	}

	var result strings.Builder
	result.WriteString("🛒 Ваша корзина:\n\n")

	total := 0
	totalQty := 0

	for i, item := range cart {
		sum := item.Product.Price * item.Quantity
		result.WriteString(fmt.Sprintf(
			"%d. %s\n   %d шт × %d ₽ = %d ₽\n",
			i+1,
			item.Product.Name,
			item.Quantity,
			item.Product.Price,
			sum,
		))
		total += sum
		totalQty += item.Quantity
	}

	result.WriteString(fmt.Sprintf("\nВсего товаров: %d\nИтого: %d ₽", totalQty, total))
	return result.String()
}

func copyCartItems(items []CartItem) []CartItem {
	result := make([]CartItem, len(items))
	copy(result, items)
	return result
}

func buildOrder(chatID int64, state *OrderState) *Order {
	order := &Order{
		ID:         nextOrderID,
		ClientChat: chatID,
		Items:      copyCartItems(userCarts[chatID]),
		Name:       state.Name,
		Phone:      state.Phone,
		Address:    state.Address,
		Status:     "Новый",
	}

	orders[order.ID] = order
	nextOrderID++
	return order
}

func getOrderSummaryForUser(order *Order) string {
	var result strings.Builder

	result.WriteString(fmt.Sprintf("✅ Заказ #%d оформлен!\n\n", order.ID))
	result.WriteString("Ваш заказ:\n")

	total := 0
	totalQty := 0

	for _, item := range order.Items {
		sum := item.Product.Price * item.Quantity
		result.WriteString(fmt.Sprintf(
			"- %s: %d шт × %d ₽ = %d ₽\n",
			item.Product.Name,
			item.Quantity,
			item.Product.Price,
			sum,
		))
		total += sum
		totalQty += item.Quantity
	}

	result.WriteString(fmt.Sprintf("\nВсего товаров: %d\nИтого: %d ₽\n", totalQty, total))
	result.WriteString(fmt.Sprintf("\nИмя: %s\n", order.Name))
	result.WriteString(fmt.Sprintf("Телефон: %s\n", order.Phone))
	result.WriteString(fmt.Sprintf("Адрес: %s\n", order.Address))
	result.WriteString(fmt.Sprintf("Статус: %s", order.Status))

	return result.String()
}

func getOrderTextForAdmin(order *Order) string {
	var result strings.Builder

	result.WriteString(fmt.Sprintf("🛒 Новый заказ #%d\n\n", order.ID))
	result.WriteString(fmt.Sprintf("ChatID клиента: %d\n", order.ClientChat))
	result.WriteString(fmt.Sprintf("Статус: %s\n\n", order.Status))
	result.WriteString("Состав заказа:\n")

	total := 0
	totalQty := 0

	for _, item := range order.Items {
		sum := item.Product.Price * item.Quantity
		result.WriteString(fmt.Sprintf(
			"- %s: %d шт × %d ₽ = %d ₽\n",
			item.Product.Name,
			item.Quantity,
			item.Product.Price,
			sum,
		))
		total += sum
		totalQty += item.Quantity
	}

	result.WriteString(fmt.Sprintf("\nВсего товаров: %d\nИтого: %d ₽\n", totalQty, total))
	result.WriteString(fmt.Sprintf("\nИмя: %s\n", order.Name))
	result.WriteString(fmt.Sprintf("Телефон: %s\n", order.Phone))
	result.WriteString(fmt.Sprintf("Адрес: %s\n", order.Address))

	return result.String()
}

func sendOrderToAdmins(ctx context.Context, api *maxbot.Api, order *Order) {
	for _, adminID := range adminIDs {
		send(ctx, api, adminID, getOrderTextForAdmin(order), adminKeyboard(order.ID))
	}
}

func parseAdminCommand(text, prefix string) (int, bool) {
	if !strings.HasPrefix(text, prefix) {
		return 0, false
	}

	idPart := strings.TrimSpace(strings.TrimPrefix(text, prefix))
	if idPart == "" {
		return 0, false
	}

	orderID, err := strconv.Atoi(idPart)
	if err != nil {
		return 0, false
	}

	return orderID, true
}

func handleAdminCommand(ctx context.Context, api *maxbot.Api, chatID int64, text string) bool {
	if !isAdmin(chatID) {
		return false
	}

	if orderID, ok := parseAdminCommand(text, "Принять заказ"); ok {
		order, exists := orders[orderID]
		if !exists {
			send(ctx, api, chatID, "Заказ не найден.", nil)
			return true
		}

		order.Status = "Принят"

		for _, adminID := range adminIDs {
			send(ctx, api, adminID, fmt.Sprintf("✅ Заказ #%d переведён в статус: %s", order.ID, order.Status), adminKeyboard(order.ID))
		}

		send(ctx, api, order.ClientChat, fmt.Sprintf("✅ Ваш заказ #%d принят.", order.ID), nil)
		return true
	}

	if orderID, ok := parseAdminCommand(text, "В доставке"); ok {
		order, exists := orders[orderID]
		if !exists {
			send(ctx, api, chatID, "Заказ не найден.", nil)
			return true
		}

		order.Status = "В доставке"

		for _, adminID := range adminIDs {
			send(ctx, api, adminID, fmt.Sprintf("🚚 Заказ #%d переведён в статус: %s", order.ID, order.Status), adminKeyboard(order.ID))
		}

		send(ctx, api, order.ClientChat, fmt.Sprintf("🚚 Ваш заказ #%d уже в доставке.", order.ID), nil)
		return true
	}

	if orderID, ok := parseAdminCommand(text, "Доставлен"); ok {
		order, exists := orders[orderID]
		if !exists {
			send(ctx, api, chatID, "Заказ не найден.", nil)
			return true
		}

		order.Status = "Доставлен"

		for _, adminID := range adminIDs {
			send(ctx, api, adminID, fmt.Sprintf("📦 Заказ #%d переведён в статус: %s", order.ID, order.Status), adminKeyboard(order.ID))
		}

		send(ctx, api, order.ClientChat, fmt.Sprintf("📦 Ваш заказ #%d доставлен. Спасибо за заказ!", order.ID), nil)
		return true
	}

	return false
}

func getPhotoToken(ctx context.Context, api *maxbot.Api, path string) *schemes.PhotoTokens {
	if path == "" {
		return nil
	}

	if token, ok := photoCache[path]; ok && token != nil {
		return token
	}

	p, err := api.Uploads.UploadPhotoFromFile(ctx, path)
	if err != nil {
		fmt.Println("Ошибка загрузки фото:", err)
		return nil
	}

	photoCache[path] = p
	return p
}

func sendProductCard(ctx context.Context, api *maxbot.Api, chatID int64, product Product, qty int) {
	msg := maxbot.NewMessage().
		SetChat(chatID).
		SetText(getProductCardText(product, qty)).
		AddKeyboard(productCardKeyboard())

	photo := getPhotoToken(ctx, api, product.ImagePath)
	if photo != nil {
		msg = msg.AddPhoto(photo)
	}

	if err := api.Messages.Send(ctx, msg); err != nil {
		fmt.Println("Ошибка отправки карточки товара:", err)
	}
}

func sendProductVideoInfo(ctx context.Context, api *maxbot.Api, chatID int64, product Product) {
	if product.VideoPath == "" {
		send(ctx, api, chatID, "Видео для этого товара пока не добавлено.", productCardKeyboard())
		return
	}

	text := fmt.Sprintf(
		"🎬 Видео товара пока не отправляется автоматически этой версией библиотеки.\n\nФайл видео: %s",
		product.VideoPath,
	)

	send(ctx, api, chatID, text, productCardKeyboard())
}

func showCategory(ctx context.Context, api *maxbot.Api, chatID int64, category string) {
	state := userOrderStates[chatID]
	if state == nil {
		state = &OrderState{}
		userOrderStates[chatID] = state
	}

	state.SelectedCategory = category
	state.SelectedProduct = nil
	state.SelectedQty = 1
	state.Step = ""

	send(ctx, api, chatID, getProductsListText(category), categoryProductsKeyboard(category))
}

func showProductCard(ctx context.Context, api *maxbot.Api, chatID int64, product Product) {
	state := userOrderStates[chatID]
	if state == nil {
		state = &OrderState{}
		userOrderStates[chatID] = state
	}

	state.SelectedCategory = product.Category
	state.SelectedProduct = &product
	if state.SelectedQty <= 0 {
		state.SelectedQty = 1
	}
	state.Step = ""

	sendProductCard(ctx, api, chatID, product, state.SelectedQty)
}

func main() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️ .env не найден, пробуем переменные системы")
	}

	token := os.Getenv("BOT_TOKEN")
	if token == "" {
		fmt.Println("Ошибка: переменная окружения BOT_TOKEN не найдена")
		return
	}

	api, err := maxbot.New(
		token,
		maxbot.WithApiTimeout(20*time.Second),
	)
	if err != nil {
		fmt.Println("Ошибка создания клиента:", err)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		ch := make(chan os.Signal, 1)
		signal.Notify(ch, os.Interrupt)
		<-ch
		cancel()
	}()

	info, err := api.Bots.GetBot(ctx)
	fmt.Printf("Bot info: %#v\n", info)
	fmt.Printf("Error: %#v\n", err)
	fmt.Println("Бот запущен и ждёт сообщения...")

	for upd := range api.GetUpdates(ctx) {
		msgUpd, ok := upd.(*schemes.MessageCreatedUpdate)
		if !ok {
			continue
		}

		chatID := msgUpd.Message.Recipient.ChatId
		text := strings.TrimSpace(msgUpd.Message.Body.Text)

		if text == "" {
			continue
		}

		fmt.Println("ChatID:", chatID, "Сообщение:", text)

		if handleAdminCommand(ctx, api, chatID, text) {
			continue
		}

		state := userOrderStates[chatID]

		if state != nil && (state.Step == "name" || state.Step == "phone" || state.Step == "address" || state.Step == "quantity_input") {
			switch state.Step {
			case "quantity_input":
				qty, err := strconv.Atoi(text)
				if err != nil || qty <= 0 {
					send(ctx, api, chatID, "Введите корректное число, например: 10", nil)
					continue
				}

				if state.SelectedProduct == nil {
					state.Step = ""
					send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
					continue
				}

				state.SelectedQty = qty
				state.Step = ""
				sendProductCard(ctx, api, chatID, *state.SelectedProduct, state.SelectedQty)
				continue

			case "name":
				state.Name = text
				state.Step = "phone"
				send(ctx, api, chatID, "Введите телефон", nil)
				continue

			case "phone":
				state.Phone = text
				state.Step = "address"
				send(ctx, api, chatID, "Введите адрес", nil)
				continue

			case "address":
				state.Address = text

				order := buildOrder(chatID, state)

				send(ctx, api, chatID, getOrderSummaryForUser(order), mainKeyboard())
				sendOrderToAdmins(ctx, api, order)

				delete(userOrderStates, chatID)
				delete(userCarts, chatID)
				continue
			}
		}

		if strings.HasPrefix(text, "Товар ") {
			idPart := strings.TrimSpace(strings.TrimPrefix(text, "Товар "))
			productID, err := strconv.Atoi(idPart)
			if err == nil {
				product, found := findProductByID(productID)
				if found {
					if state == nil {
						state = &OrderState{}
						userOrderStates[chatID] = state
					}
					state.SelectedQty = 1
					showProductCard(ctx, api, chatID, *product)
					continue
				}
			}
		}

		switch text {
		case "/start", "Старт", "Начать":
			send(ctx, api, chatID, "👋 Добро пожаловать!\n\nВыберите раздел ниже 👇", mainKeyboard())

		case "Главное меню", "Назад":
			send(ctx, api, chatID, "Главное меню:", mainKeyboard())

		case "Каталог":
			send(ctx, api, chatID, "Выберите категорию:", catalogKeyboard())

		case "Говядина", "Свинина", "Вторые блюда":
			showCategory(ctx, api, chatID, text)

		case "Назад в каталог":
			send(ctx, api, chatID, "Выберите категорию:", catalogKeyboard())

		case "Назад в категорию":
			if state != nil && state.SelectedCategory != "" {
				showCategory(ctx, api, chatID, state.SelectedCategory)
			} else {
				send(ctx, api, chatID, "Выберите категорию:", catalogKeyboard())
			}

		case "+1":
			if state != nil && state.SelectedProduct != nil {
				state.SelectedQty++
				sendProductCard(ctx, api, chatID, *state.SelectedProduct, state.SelectedQty)
			} else {
				send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
			}

		case "-1":
			if state != nil && state.SelectedProduct != nil {
				if state.SelectedQty > 1 {
					state.SelectedQty--
				}
				sendProductCard(ctx, api, chatID, *state.SelectedProduct, state.SelectedQty)
			} else {
				send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
			}

		case "10 шт":
			if state != nil && state.SelectedProduct != nil {
				state.SelectedQty = 10
				state.Step = ""
				sendProductCard(ctx, api, chatID, *state.SelectedProduct, state.SelectedQty)
			} else {
				send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
			}

		case "36 шт (коробка)":
			if state != nil && state.SelectedProduct != nil {
				state.SelectedQty = 36
				state.Step = ""
				sendProductCard(ctx, api, chatID, *state.SelectedProduct, state.SelectedQty)
			} else {
				send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
			}

		case "Ввести количество":
			if state != nil && state.SelectedProduct != nil {
				state.Step = "quantity_input"
				send(ctx, api, chatID, "Введите количество, например: 10", nil)
			} else {
				send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
			}

		case "Видео":
			if state != nil && state.SelectedProduct != nil {
				sendProductVideoInfo(ctx, api, chatID, *state.SelectedProduct)
			} else {
				send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
			}

		case "Добавить в корзину":
			if state != nil && state.SelectedProduct != nil {
				if state.SelectedQty <= 0 {
					state.SelectedQty = 1
				}

				addToCart(chatID, *state.SelectedProduct, state.SelectedQty)
				send(ctx, api, chatID, fmt.Sprintf("✅ Добавлено в корзину: %s × %d", state.SelectedProduct.Name, state.SelectedQty), cartKeyboard())
				state.SelectedQty = 1
				state.Step = ""
			} else {
				send(ctx, api, chatID, "Сначала выберите товар.", mainKeyboard())
			}

		case "Корзина":
			send(ctx, api, chatID, getCartText(chatID), cartKeyboard())

		case "Очистить корзину":
			delete(userCarts, chatID)
			send(ctx, api, chatID, "Корзина очищена.", mainKeyboard())

		case "Оформить заказ":
			if len(userCarts[chatID]) == 0 {
				send(ctx, api, chatID, "Сначала добавьте товары в корзину.", mainKeyboard())
			} else {
				if state == nil {
					state = &OrderState{}
					userOrderStates[chatID] = state
				}
				state.Step = "name"
				send(ctx, api, chatID, "Введите имя", nil)
			}

		default:
			send(ctx, api, chatID, "Не понял команду. Нажми /start", nil)
		}
	}
>>>>>>> 35b878f61f120415212d853ec5e1e40b9418277f
}