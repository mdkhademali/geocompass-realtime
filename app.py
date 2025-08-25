from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    # Use 0.0.0.0 to allow mobile devices on same Wi‑Fi to access.
    app.run(host="0.0.0.0", port=5000, debug=True)
