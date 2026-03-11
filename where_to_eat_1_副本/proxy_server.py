from flask import Flask, request, jsonify
import requests
import json
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 在这里放你的 DeepSeek API Key
API_KEY = "sk-a8cb4b9262694a788f2ae7d9b1d619b2"


@app.route("/get-ai-advice", methods=["POST"])
def get_ai_advice():

    try:
        data = request.json
        prompt = data.get("prompt", "")

        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": "Bearer " + API_KEY,
                "Content-Type": "application/json"
            },
            data=json.dumps({
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }, ensure_ascii=False).encode("utf-8")
        )

        result = response.json()

        print("DeepSeek返回：", result)   # 新增调试

        # 取出 AI 返回内容
        ai_text = result["choices"][0]["message"]["content"]

        return jsonify({
            "reply": ai_text
        })

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5001)