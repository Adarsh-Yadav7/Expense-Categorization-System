import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from tensorflow.keras.models import load_model
from flask import Flask, request, jsonify
from flask_cors import CORS  # Fix CORS issue

# Load saved model & preprocessing tools
model = load_model("expense_categorization_model.h5")
vectorizer = joblib.load("tfidf_vectorizer.pkl")
scaler = joblib.load("scaler.pkl")
ohe = joblib.load("category_encoder.pkl")

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

@app.route('/')
def home():
    return "Expense Categorization API is Running!"

# API Endpoint for prediction
@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get input data from request
        data = request.json
        description = data["Description"]
        amount = float(data["Amount"])
        date = pd.to_datetime(data["Date"])  # Convert date

        # Process input data
        description_features = vectorizer.transform([description]).toarray()  # Convert text to features
        amount_scaled = scaler.transform([[amount]])  # Normalize amount
        day = np.array([[date.day]])  # Extract day feature
        month = np.array([[date.month]])  # Extract month feature
        weekday = np.array([[date.weekday()]])  # Extract weekday feature

        # Combine all input features
        input_features = np.hstack((description_features, amount_scaled, day, month, weekday))
        input_features = input_features.reshape(1, -1)  # Ensure proper shape

        # Make prediction
        prediction = model.predict(input_features)
        category_index = np.argmax(prediction)
        category = ohe.categories_[0][category_index]  # Get actual category label

        # Return response
        return jsonify({"Predicted Category": category})

    except Exception as e:
        return jsonify({"error": str(e)})

# Run Flask app
if __name__ == '__main__':
    app.run(debug=True)
