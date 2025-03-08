import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib

# Load dataset
df = pd.read_csv(r"C:\Users\vishw\Downloads\synthetic_expense_data.csv")

# Convert 'Date' to datetime format
df['Date'] = pd.to_datetime(df['Date'])

# Feature Engineering: Extract useful date features
df['Day'] = df['Date'].dt.day
df['Month'] = df['Date'].dt.month
df['Weekday'] = df['Date'].dt.weekday
df.drop(columns=['Date'], inplace=True)  # Drop original Date column

# Encode 'Category' labels
ohe = OneHotEncoder()
categories_encoded = ohe.fit_transform(df[['Category']]).toarray()

# Convert 'Description' to numerical features using TF-IDF
vectorizer = TfidfVectorizer(max_features=500)
description_features = vectorizer.fit_transform(df['Description']).toarray()
df.drop(columns=['Description', 'Category'], inplace=True)  # Drop original text columns

# Normalize 'Amount'
scaler = StandardScaler()
df['Amount'] = scaler.fit_transform(df[['Amount']])

# Combine all features
X = np.hstack((description_features, df.values))
y = categories_encoded

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Build ANN model
model = keras.Sequential([
    keras.layers.Dense(128, activation='relu', input_shape=(X_train.shape[1],)),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(32, activation='relu'),
    keras.layers.Dense(y_train.shape[1], activation='softmax')
])

# Compile model
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Train the model
history = model.fit(X_train, y_train, epochs=20, batch_size=32, validation_data=(X_test, y_test))

# Evaluate model
accuracy = model.evaluate(X_test, y_test)[1]
train_accuracy = history.history['accuracy'][-1]
test_accuracy = history.history['val_accuracy'][-1]
print(f"Train Accuracy: {train_accuracy * 100:.2f}%")
print(f"Test Accuracy: {test_accuracy * 100:.2f}%")
print(f'Final Test Accuracy: {accuracy * 100:.2f}%')

print(df.columns)

# # Save model
# model.save("expense_categorization_model.h5")
# joblib.dump(vectorizer, "tfidf_vectorizer.pkl")
# joblib.dump(scaler, "scaler.pkl")
# joblib.dump(ohe, "category_encoder.pkl")

# print("Model and preprocessors saved successfully!")

