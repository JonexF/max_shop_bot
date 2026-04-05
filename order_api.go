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
	"github.com/max-messenger/max-bot-api-client-go/schemes"
	"github.com/joho/godotenv"
	maxbot "github.com/max-messenger/max-bot-api-client-go"
)

var adminIDs = []int64{
	149858131,
	219284348,
}

var botApi *maxbot.Api

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

type StoredOrder struct {
	ID       int
	Customer Customer
	Items    []OrderItem
	Total    int
	Status   string
}

var (
	orderMutex   sync.Mutex
	orders       = make(map[int]*StoredOrder)
	nextOrderID  = 1
)

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
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
		fmt.Println("Бот не инициализирован")
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
		fmt.Println("Ошибка отправки в MAX:", err)
	} else {
		fmt.Println("Успешно отправлено в MAX, chatID:", chatID)
	}
}

func sendOrderToAdmins(order *StoredOrder) {
	text := createOrderText(order)

	for _, adminID := range adminIDs {
		sendText(adminID, text, adminKeyboard(order.ID))
	}
}

func sendStatusToClient(order *StoredOrder) {
	if order.Customer.ChatID == 0 {
		fmt.Println("У клиента нет chatId, статус не отправлен")
		return
	}

	text := fmt.Sprintf(
		"📦 Статус заказа #%d обновлён: %s",
		order.ID,
		order.Status,
	)

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

func handleAdminStatusCommand(text string) bool {
	orderMutex.Lock()
	defer orderMutex.Unlock()

	if orderID, ok := parseAdminCommand(text, "Принять заказ"); ok {
		order, exists := orders[orderID]
		if !exists {
			return true
		}

		order.Status = "Принят"

		for _, adminID := range adminIDs {
			sendText(adminID, fmt.Sprintf("✅ Заказ #%d переведён в статус: %s", order.ID, order.Status), adminKeyboard(order.ID))
		}

		sendStatusToClient(order)
		return true
	}

	if orderID, ok := parseAdminCommand(text, "В доставке"); ok {
		order, exists := orders[orderID]
		if !exists {
			return true
		}

		order.Status = "В доставке"

		for _, adminID := range adminIDs {
			sendText(adminID, fmt.Sprintf("🚚 Заказ #%d переведён в статус: %s", order.ID, order.Status), adminKeyboard(order.ID))
		}

		sendStatusToClient(order)
		return true
	}

	if orderID, ok := parseAdminCommand(text, "Доставлен"); ok {
		order, exists := orders[orderID]
		if !exists {
			return true
		}

		order.Status = "Доставлен"

		for _, adminID := range adminIDs {
			sendText(adminID, fmt.Sprintf("📦 Заказ #%d переведён в статус: %s", order.ID, order.Status), adminKeyboard(order.ID))
		}

		sendStatusToClient(order)
		return true
	}

	return false
}

func orderHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateOrderRequest

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
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

	fmt.Println("=== НОВЫЙ ЗАКАЗ ===")
	fmt.Println("ID:", order.ID)
	fmt.Println("Имя:", order.Customer.Name)
	fmt.Println("Телефон:", order.Customer.Phone)
	fmt.Println("Адрес:", order.Customer.Address)
	fmt.Println("ChatID клиента:", order.Customer.ChatID)
	fmt.Println("Товары:")

	for _, item := range order.Items {
		fmt.Printf(
			"- %s | %d шт × %d ₽ = %d ₽\n",
			item.Title,
			item.Quantity,
			item.Price,
			item.Quantity*item.Price,
		)
	}

	fmt.Println("Итого:", order.Total)
	fmt.Println("===================")

	sendOrderToAdmins(order)

	w.Header().Set("Content-Type", "application/json")

	resp := CreateOrderResponse{
		Message: "Заказ успешно получен",
		OrderID: order.ID,
	}

	err = json.NewEncoder(w).Encode(resp)
	if err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}

func updatesPoller() {
	if botApi == nil {
		fmt.Println("Бот не инициализирован, polling не запущен")
		return
	}

	ctx := context.Background()

	fmt.Println("Long polling MAX запущен...")

	for upd := range botApi.GetUpdates(ctx) {
		msgUpd, ok := upd.(*schemes.MessageCreatedUpdate)
		if !ok {
			continue
		}

		text := strings.TrimSpace(msgUpd.Message.Body.Text)
		if text == "" {
			continue
		}

		fmt.Println("Входящее сообщение от MAX:", text)
		handleAdminStatusCommand(text)
	}
}

func main() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️ .env не найден, пробуем переменные системы")
	}

	token := os.Getenv("BOT_TOKEN")
	if token == "" {
		log.Fatal("BOT_TOKEN не найден в .env")
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

	http.HandleFunc("/api/order", orderHandler)

	fmt.Println("API сервер запущен на http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}