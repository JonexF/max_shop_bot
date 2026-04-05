package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"

	maxbot "github.com/max-messenger/max-bot-api-client-go"
	"github.com/max-messenger/max-bot-api-client-go/schemes"
)

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
}