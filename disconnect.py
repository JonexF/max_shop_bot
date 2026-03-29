import requests
from config import BOT_TOKEN

url = "https://platform-api.max.ru/subscriptions"

headers = {
    "Authorization": BOT_TOKEN
}

response = requests.delete(url, headers=headers, timeout=15)

print("STATUS:", response.status_code)
print("RESPONSE:", response.text)