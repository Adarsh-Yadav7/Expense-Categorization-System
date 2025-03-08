const exchangeRates = {}; // Store fetched exchange rates

// Fetch exchange rates from API
async function fetchExchangeRates() {
    try {
        const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");  
        const data = await response.json();
        Object.assign(exchangeRates, data.rates);
        console.log("Exchange Rates Loaded:", exchangeRates);
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
    }
}

// Convert amount to USD
function convertToUSD(amount, currency) {
    if (currency === "USD") return amount;
    if (!exchangeRates[currency]) return amount;
    return (amount / exchangeRates[currency]).toFixed(2);
}

// Load transactions from local storage
function loadTransactions() {
    const historyContainer = document.getElementById("transactionHistory");
    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    
    if (transactions.length === 0) {
        historyContainer.innerHTML = "<h3>Past Transactions</h3><p>No transactions yet.</p>";
        return;
    }

    historyContainer.innerHTML = "<h3>Past Transactions</h3>";
    transactions.forEach((tx) => {
        historyContainer.innerHTML += `
            <p>${tx.date} - ${tx.description} - ${tx.amount} ${tx.currency} - Category: ${tx.category} <br>
            ${tx.numPeople > 1 ? `Split among ${tx.numPeople} people. Each owes: ${tx.eachOwes} ${tx.currency}` : ""} </p>
        `;
    });

    historyContainer.innerHTML += `<button id="clearHistory">Clear History</button>`;
    document.getElementById("clearHistory").addEventListener("click", () => {
        localStorage.removeItem("transactions");
        loadTransactions();
    });
}

// Load "Who Owes What?" summary
function loadSplitSummary() {
    const splitContainer = document.getElementById("splitSummary");
    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    
    if (transactions.length === 0) {
        splitContainer.innerHTML = "<p>No splits yet.</p>";
        return;
    }

    let balances = {};
    
    transactions.forEach(tx => {
        if (tx.numPeople > 1) {
            let eachOwes = parseFloat(tx.eachOwes);
            let payer = tx.payer;

            if (!balances[payer]) balances[payer] = 0;
            balances[payer] -= eachOwes * tx.friends.length;

            tx.friends.forEach(friend => {
                if (!balances[friend]) balances[friend] = 0;
                balances[friend] += eachOwes;
            });
        }
    });

    splitContainer.innerHTML = "<h3>Who Owes What?</h3>";

    for (let person in balances) {
        if (balances[person] > 0) {
            splitContainer.innerHTML += `<p>${person} is owed ₹${balances[person].toFixed(2)}</p>`;
        } else if (balances[person] < 0) {
            splitContainer.innerHTML += `<p>${person} owes ₹${Math.abs(balances[person]).toFixed(2)}</p>`;
        } else {
            splitContainer.innerHTML += `<p>${person} is settled up.</p>`;
        }
    }
}

// Handle form submission
document.getElementById("expenseForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    let description = document.getElementById("description").value;
    let amount = parseFloat(document.getElementById("amount").value);
    let date = document.getElementById("date").value;
    let currency = document.getElementById("currency").value;
    let numPeople = parseInt(document.getElementById("numPeople").value);
    let payer = document.getElementById("payer").value.trim() || "You";

    let friendInputs = document.getElementsByClassName("friendName");
    let friends = Array.from(friendInputs).map(input => input.value.trim()).filter(name => name !== "");

    if (friends.length !== numPeople - 1) {
        alert("Please enter all friend names!");
        return;
    }

    let amountInUSD = convertToUSD(amount, currency);
    
    let requestData = { Description: description, Amount: amountInUSD, Date: date };

    try {
        let response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        let result = await response.json();
        document.getElementById("prediction").innerHTML = `Predicted Category: ${result["Predicted Category"]}`;

        let eachOwes = (amount / numPeople).toFixed(2);
        let transaction = { description, amount, currency, date, category: result["Predicted Category"], numPeople, eachOwes, payer, friends };

        let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
        transactions.push(transaction);
        localStorage.setItem("transactions", JSON.stringify(transactions));

        loadTransactions();
        loadSplitSummary();
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("prediction").innerHTML = "Prediction failed.";
    }
});

// Load data on page load
fetchExchangeRates();
loadTransactions();
loadSplitSummary();

// Dynamically add friend name input fields
document.getElementById("numPeople").addEventListener("input", function () {
    let numPeople = parseInt(this.value);
    let friendsContainer = document.getElementById("friendsContainer");
    friendsContainer.innerHTML = "";

    for (let i = 1; i < numPeople; i++) {
        let div = document.createElement("div");
        div.classList.add("friend-input");

        let label = document.createElement("label");
        label.innerText = `Friend ${i} Name:`;

        let input = document.createElement("input");
        input.type = "text";
        input.classList.add("friendName");
        input.required = true;
        input.placeholder = `Enter friend ${i}'s name`;

        div.appendChild(label);
        div.appendChild(input);
        friendsContainer.appendChild(div);
    }
});
