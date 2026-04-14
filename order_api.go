package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
	maxbot "github.com/max-messenger/max-bot-api-client-go"
	"github.com/max-messenger/max-bot-api-client-go/schemes"
)

var adminIDs = []int64{
	149858131,
	219284348,
}

var (
	botApi        *maxbot.Api
	storefrontURL string
)

type Customer struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
	ChatID  int64  `json:"chatId"`
}

type OrderItem struct {
	ProductID int    `json:"productId"`
	Title     string `json:"title"`
	Price     int    `json:"price"`
	Quantity  int    `json:"quantity"`
}

type CreateOrderRequest struct {
	Customer Customer    `json:"customer"`
	Items    []OrderItem `json:"items"`
	Total    int         `json:"total"`
}

type CreateOrderResponse struct {
	Message string `json:"message"`
	OrderID int    `json:"orderId"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type StoredOrder struct {
	ID       int
	Customer Customer
	Items    []OrderItem
	Total    int
	Status   string
}

var (
	orderMutex  sync.Mutex
	orders      = make(map[int]*StoredOrder)
	nextOrderID = 1
)

func isAdmin(chatID int64) bool {
	for _, adminID := range adminIDs {
		if adminID == chatID {
			return true
		}
	}
	return false
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")

	allowedOrigins := map[string]bool{
		"https://dimensional-textile-greatest-von.trycloudflare.com":  true,
		"http://localhost:5173":                                        true,
		"http://localhost:5174":                                        true,
		"https://max-shop-p1lm6mt33-jonexfs-projects.vercel.app":       true,
	}

	if allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}

	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Println("Ошибка записи JSON ответа:", err)
	}
}

func storefrontKeyboard() *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	kb.AddRow().AddMessage("Витрина")
	return kb
}

func adminKeyboard(orderID int) *maxbot.Keyboard {
	kb := &maxbot.Keyboard{}
	kb.AddRow().
		AddMessage(fmt.Sprintf("Принять заказ %d", orderID)).
		AddMessage(fmt.Sprintf("В доставке %d", orderID))
	kb.AddRow().
		AddMessage(fmt.Sprintf("Доставлен %d", orderID))
	return kb
}

func sendText(chatID int64, text string, kb *maxbot.Keyboard) {
	if botApi == nil {
		log.Println("Бот не инициализирован")
		return
	}

	ctx := context.Background()

	msg := maxbot.NewMessage().
		SetChat(chatID).
		SetText(text)

	if kb != nil {
		msg = msg.AddKeyboard(kb)
	}

	err := botApi.Messages.Send(ctx, msg)
	if err != nil {
		log.Printf("Ошибка отправки в MAX для chatID %d: %v\n", chatID, err)
		return
	}

	log.Printf("Успешно отправлено в MAX, chatID: %d\n", chatID)
}

func sendWelcome(chatID int64) {
	text := "🥫 Провиант Одинцово\n\n" +
		"Натуральные мясные консервы по ГОСТ.\n" +
		"Откройте витрину и оформите заказ за пару минут 👇"

	sendText(chatID, text, storefrontKeyboard())
}

func sendStorefront(chatID int64) {
	text := "🛍 Открыть витрину:\nhttps://max.ru/id667008231293_bot?startapp"
	sendText(chatID, text, storefrontKeyboard())
}

func handleUserCommand(text string, chatID int64) bool {
	switch strings.TrimSpace(text) {
	case "/start", "Старт", "Начать":
		sendWelcome(chatID)
		return true

	case "Витрина":
		sendStorefront(chatID)
		return true

	default:
		return false
	}
}

func createOrderText(order *StoredOrder) string {
	var b strings.Builder

	b.WriteString(fmt.Sprintf("🛒 Новый заказ #%d\n\n", order.ID))
	b.WriteString(fmt.Sprintf("Статус: %s\n", order.Status))
	b.WriteString(fmt.Sprintf("Имя: %s\n", order.Customer.Name))
	b.WriteString(fmt.Sprintf("Телефон: %s\n", order.Customer.Phone))
	b.WriteString(fmt.Sprintf("Адрес: %s\n\n", order.Customer.Address))
	b.WriteString("Товары:\n")

	for _, item := range order.Items {
		b.WriteString(fmt.Sprintf(
			"- %s: %d шт × %d ₽ = %d ₽\n",
			item.Title,
			item.Quantity,
			item.Price,
			item.Quantity*item.Price,
		))
	}

	b.WriteString(fmt.Sprintf("\nИтого: %d ₽", order.Total))
	return b.String()
}

func sendOrderToAdmins(order *StoredOrder) {
	text := createOrderText(order)

	for _, adminID := range adminIDs {
		sendText(adminID, text, adminKeyboard(order.ID))
	}
}

func sendStatusToClient(order *StoredOrder) {
	if order.Customer.ChatID == 0 {
		log.Println("У клиента нет chatId, статус не отправлен")
		return
	}

	text := fmt.Sprintf("📦 Статус заказа #%d обновлён: %s", order.ID, order.Status)
	sendText(order.Customer.ChatID, text, nil)
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

func updateOrderStatus(orderID int, newStatus string, statusEmoji string) bool {
	order, exists := orders[orderID]
	if !exists {
		return false
	}

	order.Status = newStatus

	for _, adminID := range adminIDs {
		sendText(
			adminID,
			fmt.Sprintf("%s Заказ #%d переведён в статус: %s", statusEmoji, order.ID, order.Status),
			adminKeyboard(order.ID),
		)
	}

	sendStatusToClient(order)
	return true
}

func handleAdminStatusCommand(text string, chatID int64) bool {
	if !isAdmin(chatID) {
		return false
	}

	orderMutex.Lock()
	defer orderMutex.Unlock()

	if orderID, ok := parseAdminCommand(text, "Принять заказ"); ok {
		if updateOrderStatus(orderID, "Принят", "✅") {
			return true
		}
		sendText(chatID, fmt.Sprintf("Заказ #%d не найден.", orderID), nil)
		return true
	}

	if orderID, ok := parseAdminCommand(text, "В доставке"); ok {
		if updateOrderStatus(orderID, "В доставке", "🚚") {
			return true
		}
		sendText(chatID, fmt.Sprintf("Заказ #%d не найден.", orderID), nil)
		return true
	}

	if orderID, ok := parseAdminCommand(text, "Доставлен"); ok {
		if updateOrderStatus(orderID, "Доставлен", "📦") {
			return true
		}
		sendText(chatID, fmt.Sprintf("Заказ #%d не найден.", orderID), nil)
		return true
	}

	return false
}

func validateOrderRequest(req *CreateOrderRequest) error {
	if strings.TrimSpace(req.Customer.Name) == "" {
		return fmt.Errorf("не указано имя клиента")
	}

	if strings.TrimSpace(req.Customer.Phone) == "" {
		return fmt.Errorf("не указан телефон клиента")
	}

	if strings.TrimSpace(req.Customer.Address) == "" {
		return fmt.Errorf("не указан адрес клиента")
	}

	if len(req.Items) == 0 {
		return fmt.Errorf("корзина пуста")
	}

	calculatedTotal := 0

	for i, item := range req.Items {
		if strings.TrimSpace(item.Title) == "" {
			return fmt.Errorf("у товара #%d не указано название", i+1)
		}
		if item.Quantity <= 0 {
			return fmt.Errorf("у товара %q некорректное количество", item.Title)
		}
		if item.Price < 0 {
			return fmt.Errorf("у товара %q некорректная цена", item.Title)
		}

		calculatedTotal += item.Quantity * item.Price
	}

	if req.Total != calculatedTotal {
		return fmt.Errorf("итоговая сумма не совпадает с товарами")
	}

	return nil
}

func orderHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{
			Error: "method not allowed",
		})
		return
	}

	defer r.Body.Close()

	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error: "invalid json body",
		})
		return
	}

	if err := validateOrderRequest(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	orderMutex.Lock()
	orderID := nextOrderID
	nextOrderID++

	order := &StoredOrder{
		ID:       orderID,
		Customer: req.Customer,
		Items:    req.Items,
		Total:    req.Total,
		Status:   "Новый",
	}

	orders[orderID] = order
	orderMutex.Unlock()

	log.Println("=== НОВЫЙ ЗАКАЗ ===")
	log.Println("ID:", order.ID)
	log.Println("Имя:", order.Customer.Name)
	log.Println("Телефон:", order.Customer.Phone)
	log.Println("Адрес:", order.Customer.Address)
	log.Println("ChatID клиента:", order.Customer.ChatID)
	log.Println("Товары:")

	for _, item := range order.Items {
		log.Printf(
			"- %s | %d шт × %d ₽ = %d ₽\n",
			item.Title,
			item.Quantity,
			item.Price,
			item.Quantity*item.Price,
		)
	}

	log.Println("Итого:", order.Total)
	log.Println("===================")

	sendOrderToAdmins(order)

	writeJSON(w, http.StatusOK, CreateOrderResponse{
		Message: "Заказ успешно получен",
		OrderID: order.ID,
	})
}

func updatesPoller() {
	if botApi == nil {
		log.Println("Бот не инициализирован, polling не запущен")
		return
	}

	ctx := context.Background()
	log.Println("Long polling MAX запущен...")

	for upd := range botApi.GetUpdates(ctx) {
		msgUpd, ok := upd.(*schemes.MessageCreatedUpdate)
		if !ok {
			continue
		}

		text := strings.TrimSpace(msgUpd.Message.Body.Text)
		if text == "" {
			continue
		}

		chatID := msgUpd.Message.Recipient.ChatId
		log.Printf("ChatID: %d | Сообщение: %s\n", chatID, text)

		if handleAdminStatusCommand(text, chatID) {
			continue
		}

		if handled := handleUserCommand(text, chatID); handled {
			continue
		}
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ .env не найден, пробуем переменные системы")
	}

	token := strings.TrimSpace(os.Getenv("BOT_TOKEN"))
	if token == "" {
		log.Fatal("BOT_TOKEN не найден в .env")
	}

	storefrontURL = strings.TrimSpace(os.Getenv("STOREFRONT_URL"))
	if storefrontURL == "" {
		log.Fatal("STOREFRONT_URL не найден в .env")
	}

	api, err := maxbot.New(
		token,
		maxbot.WithApiTimeout(20*time.Second),
	)
	if err != nil {
		log.Fatal("Ошибка создания бота:", err)
	}

	botApi = api

	go updatesPoller()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/order", orderHandler)

	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       30 * time.Second,
	}

	log.Println("API сервер запущен на http://localhost:8080")
	log.Fatal(server.ListenAndServe())
}