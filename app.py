from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Physics constants
GRAVITY = 0.5
FLOOR_Y = 600  # canvas height
COEFFICIENT_BOUNCE = -0.6

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/update_ball", methods=["POST"])
def update_ball():
    data = request.json
    ball = data['ball']

    # Physics update
    ball['dy'] += GRAVITY
    ball['x'] += ball['dx']
    ball['y'] += ball['dy']

    # Floor collision
    if ball['y'] > FLOOR_Y:
        ball['y'] = FLOOR_Y
        ball['dy'] *= COEFFICIENT_BOUNCE

    # Left & Right wall collision
    if ball['x'] < 0:
        ball['x'] = 0
        ball['dx'] *= COEFFICIENT_BOUNCE
    if ball['x'] > 800:
        ball['x'] = 800
        ball['dx'] *= COEFFICIENT_BOUNCE

    return jsonify(ball)

if __name__ == "__main__":
    app.run(debug=True)
