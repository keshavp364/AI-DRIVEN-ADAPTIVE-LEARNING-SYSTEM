from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app)

@app.route('/update-ability', methods=['POST'])
def update_ability():
    data = request.get_json()
    curr = data['current_ability']
    correct = data['was_correct']
    t = data['response_time']
    
    # Recommendation Logic: The Sigmoid Adjustment
    learning_rate = 0.75
    score = 1.0 if correct else 0.0
    expected = 1 / (1 + np.exp(-(curr - 5.5)))
    
    # Innovation = Actual - Expected
    adjustment = learning_rate * (score - expected)
    
    # Speed bonus/penalty (Spotify-style engagement)
    if correct and t < 7.0:
        adjustment += 0.2
    elif not correct and t > 15.0:
        adjustment -= 0.15

    new_ability = round(max(1.0, min(10.0, curr + adjustment)), 2)
    return jsonify({'new_ability': new_ability})

@app.route('/get-next-difficulty', methods=['POST'])
def get_next_difficulty():
    data = request.get_json()
    # Aim for a slight challenge (Ability + 0.6)
    target = round(min(10.0, data['current_ability'] + 0.6), 2)
    return jsonify({'target_difficulty': target})

if __name__ == '__main__':
    app.run(port=5000)